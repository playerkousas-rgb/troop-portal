'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGetEquipment } from '@/lib/api';
import { getSession } from '@/lib/session';
import { AppState, EQUIPMENT_BORROW_BRANCHES, Equipment, EquipmentLoan, LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from '@/lib/store';
import { branches } from '@/lib/model';
import { useConfirm, kv } from '@/components/ConfirmProvider';
import { canAccessRoute } from '@/lib/routeAccess';

const LEADER_ROLES = ['super_admin', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach'];

function today() { return new Date().toISOString().slice(0, 10); }
function branchName(id: string) { return branches.find(b => b.id === id)?.name || id || '—'; }

export default function EquipmentPage() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState('');

  const [purpose, setPurpose] = useState('');
  const [borrowDate, setBorrowDate] = useState(today());
  const [returnDueDate, setReturnDueDate] = useState(today());
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const { confirm } = useConfirm();

  const session = typeof window === 'undefined' ? null : getSession();
  const role = session?.role || 'guest';
  const isLeader = LEADER_ROLES.includes(role);
  /**
   * ★ 「物資管理」掣嘅守衛 —— 唔可以直接用 isLeader。
   *
   * `LEADER_ROLES` 包教練員，但目標頁 `/admin/equipment` 嘅 gate 唔收教練員
   * （教練員冇固定支部，物資權限要團長逐項授權）。用 isLeader 嘅話教練員會
   * 睇到掣但撳落去撞「未獲授權」牆 —— 呢個係 2026-09-03 全 repo 掃描測出嚟嘅。
   *
   * 用 canAccessRoute() 讀 ROUTE_ROLES（同目標頁 <Auth> 同一個來源），咁先唔會 drift。
   */
  const canManageEquipment = canAccessRoute('/admin/equipment', role);

  const load = useCallback(async () => {
    setErr('');
    try { setS(await apiGetEquipment()); }
    catch (e: any) { setErr(e?.message || String(e)); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const equipment = useMemo(() => s?.equipment || [], [s?.equipment]);
  const loans = useMemo(() => s?.equipmentLoans || [], [s?.equipmentLoans]);

  const myMember = useMemo(() => {
    if (!s || !session) return null;
    return s.members.find(m => m.id === session.userId || m.id === session.memberId) || null;
  }, [s, session]);

  const myBranchId = myMember?.branchId || session?.branchId || '';
  const canBorrow = !!session && (isLeader || EQUIPMENT_BORROW_BRANCHES.includes(myBranchId));

  const groups = useMemo(() => {
    const g: Record<string, Equipment[]> = {};
    equipment.forEach(e => { (g[e.category || '其他'] = g[e.category || '其他'] || []).push(e); });
    return g;
  }, [equipment]);

  const selected = useMemo(() => equipment.flatMap(e => {
    const qty = Number(quantities[e.id] || 0);
    return Number.isInteger(qty) && qty > 0 ? [{ equipmentId: e.id, qty }] : [];
  }), [equipment, quantities]);

  const totalQty = selected.reduce((sum, i) => sum + i.qty, 0);

  function setQty(item: Equipment, raw: string) {
    const max = item.availableQty;
    const n = raw === '' ? '' : String(Math.max(0, Math.min(max, Math.floor(Number(raw) || 0))));
    setQuantities(q => ({ ...q, [item.id]: n }));
  }

  async function run(key: string, fn: () => Promise<AppState>, msg?: string) {
    setErr(''); setOk(''); setBusy(key);
    try { setS(await fn()); if (msg) setOk('✅ ' + msg); }
    catch (e: any) { setErr(e?.message || String(e)); }
    finally { setBusy(''); }
  }

  async function submitLoan() {
    if (!selected.length) { setErr('請在想借的物資旁填寫數量。'); return; }
    if (!borrowDate || !returnDueDate) { setErr('請填寫借出日期及預計歸還日期。'); return; }
    if (returnDueDate < borrowDate) { setErr('預計歸還日期不可早於借出日期。'); return; }
    const ok = await confirm({
      title: '確認遞交借用申請',
      message: kv([
        ['用途', purpose.trim()],
        ['借出日期', borrowDate],
        ['預計歸還', returnDueDate],
        ['物資', selected.map(i => {
          const eq = equipment.find(e => e.id === i.equipmentId);
          return `${eq?.name || i.equipmentId} ×${i.qty}`;
        }).join('、')],
      ]),
      confirmLabel: '確認遞交',
    });
    if (!ok) return;
    await run('submit', () => import('@/lib/api').then(m => m.apiRequestEquipmentLoan({
      items: selected, borrowDate, returnDueDate, purpose: purpose.trim(),
      memberId: session?.userId || '',
    })), `已遞交借用申請（${selected.length} 項），請等領袖批核`);
    setQuantities({}); setPurpose('');
  }

  async function decide(loan: EquipmentLoan, decision: 'approved' | 'rejected') {
    const ok = await confirm({
      title: decision === 'approved' ? '確認批准並扣庫存' : '確認拒絕借用申請',
      message: kv([
        ['申請人', loan.memberName || loan.memberId],
        ['物資', `${loan.equipmentName} ×${loan.qty} ${loan.unit || ''}`],
        ...(decision === 'approved' ? [['注意', '批准後即時扣除庫存'] as [string, string]] : []),
      ]),
      confirmLabel: decision === 'approved' ? '確認批准' : '確認拒絕',
      danger: decision === 'rejected',
    });
    if (!ok) return;
    const { apiDecideEquipmentLoan } = await import('@/lib/api');
    await run('dec' + loan.id, () => apiDecideEquipmentLoan(loan.id, decision, ''),
      decision === 'approved' ? '已批准，庫存已扣除' : '已拒絕');
  }

  async function markReturned(loan: EquipmentLoan) {
    const ok = await confirm({
      title: '確認已歸還',
      message: kv([
        ['借用人', loan.memberName || loan.memberId],
        ['物資', `${loan.equipmentName} ×${loan.qty} ${loan.unit || ''}`],
        ['注意', '標記後庫存即時回補'],
      ]),
      confirmLabel: '確認已歸還',
    });
    if (!ok) return;
    const { apiReturnEquipmentLoan } = await import('@/lib/api');
    await run('ret' + loan.id, () => apiReturnEquipmentLoan(loan.id), '已標記歸還，庫存已回補');
  }

  async function cancelLoan(loan: EquipmentLoan) {
    const ok = await confirm({
      title: '確認取消借用申請',
      message: kv([['物資', `${loan.equipmentName} ×${loan.qty} ${loan.unit || ''}`]]),
      confirmLabel: '確認取消',
      danger: true,
    });
    if (!ok) return;
    const { apiCancelEquipmentLoan } = await import('@/lib/api');
    await run('can' + loan.id, () => apiCancelEquipmentLoan(loan.id), '已取消申請');
  }

  async function updateLoanQty(loan: EquipmentLoan) {
    // 數量由「改數量」後在行內輸入（見下方 render），此處僅保留相容入口
    const qty = Number(loan.qty);
    if (!(qty > 0)) { setErr('數量必須大於 0。'); return; }
    const ok = await confirm({
      title: '確認修改借用數量',
      message: kv([['物資', loan.equipmentName], ['新數量', `${qty} ${loan.unit || ''}`]]),
      confirmLabel: '確認修改',
    });
    if (!ok) return;
    const { apiUpdateEquipmentLoan } = await import('@/lib/api');
    await run('upd' + loan.id, () => apiUpdateEquipmentLoan({ loanId: loan.id, qty }), '已更新數量');
  }

  const myLoans = useMemo(() => {
    if (!session) return [];
    return loans.filter(l => l.memberId === session.userId || (session.memberId && l.memberId === session.memberId))
      .sort((a, b) => String(b.requestedAt || '').localeCompare(String(a.requestedAt || '')));
  }, [loans, session]);

  const pendingLoans = loans.filter(l => l.status === 'pending');
  const outLoans = loans.filter(l => l.status === 'approved');

  if (!s) return <div className="card">{err ? <span className="badge red">{err}</span> : '載入中...'}</div>;

  return (
    <div className="stack">
      <section className="hero">
        <span className="badge gold">物資借用</span>
        <h1>📦 現有物資總覽</h1>
        <p>
          以下是旅團物資清單及可借數量。
          {canBorrow
            ? ' 填好用途與日期，再在物資旁輸入數量即可遞交借用申請，領袖批核後才會扣除庫存。'
            : ' 借用只限領袖及童軍支部或以上成員；小童軍／幼童軍請由領袖代借。'}
        </p>
        <div className="row">
          <button className="btn" onClick={load} disabled={!!busy}>↻ 更新數量</button>
          {canManageEquipment && <Link className="btn primary" href="/admin/equipment">🛠️ 物資管理（新增／批核）</Link>}
        </div>
      </section>

      {err && <p className="badge red" style={{ display: 'block', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{err}</p>}
      {ok && <p className="badge green" style={{ display: 'block', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ok}</p>}

      {!session && (
        <section className="card">
          <p className="muted" style={{ margin: 0 }}>請先 <Link href="/login">登入</Link> 並選擇旅團，才可查看可借數量及申請借用。</p>
        </section>
      )}

      {/* ── 物資總覽 ＋ 借用數量 ── */}
      {Object.keys(groups).length === 0 ? (
        <section className="card"><p className="muted" style={{ margin: 0 }}>暫時沒有可借物資。領袖可到「物資管理」新增。</p></section>
      ) : (
        Object.entries(groups).map(([category, list]) => (
          <section className="card stack" key={category}>
            <h2 style={{ marginTop: 0 }}>{category}</h2>
            <div className="grid">
              {list.map(item => {
                const unavailable = item.availableQty <= 0;
                const picked = Number(quantities[item.id] || 0) > 0;
                return (
                  <div key={item.id} className="card" style={{
                    boxShadow: 'none',
                    borderColor: picked ? '#0b5cab' : (unavailable ? '#e5e7eb' : '#d8e4f0'),
                    background: unavailable ? '#f8fafc' : (picked ? '#f8fbff' : '#fff'),
                  }}>
                    <strong>{item.name}</strong>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      可借 <b style={{ color: item.availableQty > 0 ? '#0d652d' : '#a50e0e' }}>{item.availableQty}</b>
                      {' / '}共 {item.totalQty} {item.unit}
                      {item.location ? ` · ${item.location}` : ''}
                    </div>
                    {item.note && <div className="muted" style={{ fontSize: 12 }}>{item.note}</div>}
                    {canBorrow && (
                      <label style={{ marginTop: 10, marginBottom: 0 }}>
                        借用數量（最多 {item.availableQty} {item.unit}）
                        <input
                          type="number" inputMode="numeric" min={0} max={item.availableQty} step={1}
                          value={quantities[item.id] || ''} placeholder="0" disabled={unavailable}
                          onChange={e => setQty(item, e.target.value)}
                          aria-label={`${item.name}借用數量，最多 ${item.availableQty} ${item.unit}`}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* ── 借用申請表 ── */}
      {canBorrow && (
        <section className="card stack">
          <h2 style={{ marginTop: 0 }}>📝 借用申請</h2>
          <div className="grid">
            <label>用途 *
              <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="例如：童軍支部露營、旅集會" />
            </label>
            <label>借出日期 *
              <input type="date" value={borrowDate} onChange={e => setBorrowDate(e.target.value)} />
            </label>
            <label>預計歸還日期 *
              <input type="date" min={borrowDate || undefined} value={returnDueDate} onChange={e => setReturnDueDate(e.target.value)} />
            </label>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            已選 <b>{selected.length}</b> 種物資，合共 <b>{totalQty}</b> 件／套。申請後狀態為「待批核」，領袖批准時才會扣除庫存。
          </p>
          <button className="btn primary" disabled={!!busy || !selected.length} onClick={submitLoan}>
            {busy === 'submit' ? '遞交中…' : `遞交借用申請${selected.length ? `（${selected.length} 項）` : ''}`}
          </button>
        </section>
      )}

      {/* ── 我的借用紀錄 ── */}
      <section className="card stack">
        <h2 style={{ marginTop: 0 }}>🧾 我的借用紀錄</h2>
        {myLoans.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>暫時沒有借用紀錄。</p>
        ) : (
          <div className="attendance-table-wrap">
            <table className="table responsive">
              <thead>
                <tr><th>物資</th><th>數量</th><th>借出／歸還</th><th>用途</th><th>狀態</th><th>操作</th></tr>
              </thead>
              <tbody>
                {myLoans.map(l => (
                  <tr key={l.id}>
                    <td data-label="物資">{l.equipmentName}</td>
                    <td data-label="數量">{l.qty} {l.unit}</td>
                    <td data-label="借出／歸還">{l.borrowDate} → {l.returnDueDate}</td>
                    <td data-label="用途">{l.purpose || '—'}</td>
                    <td data-label="狀態">
                      <span className={`badge ${LOAN_STATUS_TONE[l.status] || 'blue'}`}>{LOAN_STATUS_LABEL[l.status] || l.status}</span>
                      {l.decisionNote && <div className="muted" style={{ fontSize: 12 }}>領袖備註：{l.decisionNote}</div>}
                    </td>
                    <td data-label="操作">
                      {l.status === 'pending' ? (
                        <div className="row" style={{ gap: 6 }}>
                          <button className="btn" style={{ fontSize: 13 }} disabled={!!busy} onClick={() => updateLoanQty(l)}>✏️ 改數量</button>
                          <button className="btn" style={{ fontSize: 13, color: '#c5221f' }} disabled={!!busy} onClick={() => cancelLoan(l)}>取消</button>
                        </div>
                      ) : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 領袖：批核 ＋ 歸還 ── */}
      {isLeader && (
        <section className="card stack">
          <h2 style={{ marginTop: 0 }}>🛡️ 領袖批核／歸還</h2>

          <h3 style={{ marginBottom: 4 }}>待批核（{pendingLoans.length}）</h3>
          {pendingLoans.length === 0 ? <p className="muted" style={{ marginTop: 0 }}>沒有待批核申請。</p> : (
            <div className="attendance-table-wrap">
              <table className="table responsive">
                <thead><tr><th>申請人</th><th>物資</th><th>數量</th><th>日期</th><th>操作</th></tr></thead>
                <tbody>
                  {pendingLoans.map(l => (
                    <tr key={l.id}>
                      <td data-label="申請人">{l.memberName}<div className="muted" style={{ fontSize: 12 }}>{branchName(l.branchId)}</div></td>
                      <td data-label="物資">{l.equipmentName}</td>
                      <td data-label="數量">{l.qty} {l.unit}</td>
                      <td data-label="日期">{l.borrowDate} → {l.returnDueDate}</td>
                      <td data-label="操作">
                        <div className="row" style={{ gap: 6 }}>
                          <button className="btn" style={{ fontSize: 13, background: '#e6f4ea', color: '#0d652d' }}
                            disabled={!!busy} onClick={() => decide(l, 'approved')}>✅ 批准並扣庫存</button>
                          <button className="btn" style={{ fontSize: 13, color: '#c5221f' }} disabled={!!busy} onClick={() => decide(l, 'rejected')}>✖ 拒絕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 style={{ marginBottom: 4 }}>已借出，待歸還（{outLoans.length}）</h3>
          {outLoans.length === 0 ? <p className="muted" style={{ marginTop: 0 }}>沒有待歸還的物資。</p> : (
            <div className="attendance-table-wrap">
              <table className="table responsive">
                <thead><tr><th>借用人</th><th>物資</th><th>數量</th><th>應歸還</th><th>操作</th></tr></thead>
                <tbody>
                  {outLoans.map(l => (
                    <tr key={l.id}>
                      <td data-label="借用人">{l.memberName}</td>
                      <td data-label="物資">{l.equipmentName}</td>
                      <td data-label="數量">{l.qty} {l.unit}</td>
                      <td data-label="應歸還">{l.returnDueDate}</td>
                      <td data-label="操作">
                        <button className="btn primary" style={{ fontSize: 13 }} disabled={busy === 'ret' + l.id} onClick={() => markReturned(l)}>
                          ✅ 已歸還（Tick）
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ margin: 0 }}>歸還後按「已歸還」，庫存會即時回補。完整管理（新增／修改物資、調整庫存）請到「物資管理」頁。</p>
        </section>
      )}
    </div>
  );
}
