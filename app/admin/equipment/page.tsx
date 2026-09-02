'use client';
import Auth from '@/components/Auth';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Equipment, EquipmentLoan, LOAN_STATUS_LABEL, loadStateSlice } from '@/lib/store';
import {
  apiCreateEquipment, apiUpdateEquipment, apiAdjustEquipmentQty, apiDeleteEquipment,
  apiDecideEquipmentLoan, apiReturnEquipmentLoan,
} from '@/lib/api';
import { branches } from '@/lib/model';
import Link from 'next/link';
import { useConfirm, kv } from '@/components/ConfirmProvider';

const CATEGORIES = ['露營', '煮食', '繩索', '先鋒工程', '安全', '活動', '制服', '其他'];

function today() { return new Date().toISOString().slice(0, 10); }
function branchName(id: string) { return branches.find(b => b.id === id)?.short || id || '—'; }

export default function AdminEquipment() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState('');

  // 新增物資
  const [name, setName] = useState('');
  const [category, setCategory] = useState('露營');
  const [unit, setUnit] = useState('件');
  const [totalQty, setTotalQty] = useState('1');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  // 編輯中的物資
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [adjusting, setAdjusting] = useState<string>('');
  const [adjustQty, setAdjustQty] = useState('1');

  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const { confirm } = useConfirm();

  useEffect(() => { load(); }, []);
  async function load() {
    setErr('');
    try { setS(await loadStateSlice(['equipment', 'equipmentLoans', 'members'])); }
    catch (e: any) { setErr(e.message || String(e)); }
  }

  const equipment = s?.equipment || [];
  const loans = s?.equipmentLoans || [];

  const stats = useMemo(() => ({
    kinds: equipment.length,
    totalUnits: equipment.reduce((sum, e) => sum + (e.totalQty || 0), 0),
    availableUnits: equipment.reduce((sum, e) => sum + (e.availableQty || 0), 0),
    pending: loans.filter(l => l.status === 'pending').length,
    out: loans.filter(l => l.status === 'approved').length,
  }), [equipment, loans]);

  const shownLoans = useMemo(() => {
    const list = filter === 'all' ? loans : loans.filter(l => l.status === filter);
    return list.slice().sort((a, b) => String(b.requestedAt || '').localeCompare(String(a.requestedAt || '')));
  }, [loans, filter]);

  async function run(key: string, fn: () => Promise<AppState>, successMsg?: string) {
    setErr(''); setOk(''); setBusy(key);
    try {
      setS(await fn());
      if (successMsg) setOk('✅ ' + successMsg);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setBusy(''); }
  }

  /** 防呆：先經用戶確認，才執行一次寫入。 */
  async function confirmRun(key: string, opts: Parameters<typeof confirm>[0], fn: () => Promise<AppState>, successMsg?: string) {
    const ok = await confirm(opts);
    if (!ok) return;
    await run(key, fn, successMsg);
  }

  async function add() {
    if (!name.trim()) { setErr('請填寫物資名稱。'); return; }
    await confirmRun('add', {
      title: '確認新增物資',
      message: kv([
        ['名稱', name.trim()], ['分類', category], ['單位', unit.trim() || '件'],
        ['總數', `${Number(totalQty) || 0}`], ['存放位置', location.trim()],
        ['備註', note.trim()],
      ]),
      confirmLabel: '確認新增',
    }, () => apiCreateEquipment({
      name: name.trim(), category, unit: unit.trim() || '件',
      totalQty: Number(totalQty) || 0, location: location.trim(), note: note.trim(), enabled: true,
    }), `已新增物資「${name.trim()}」`);
    setName(''); setTotalQty('1'); setLocation(''); setNote('');
  }

  async function saveEdit() {
    if (!editing) return;
    await confirmRun('edit', {
      title: '確認儲存物資修改',
      message: kv([
        ['名稱', editing.name], ['分類', editing.category], ['單位', editing.unit],
        ['總數', `${editing.totalQty}`], ['存放位置', editing.location], ['備註', editing.note],
        ['狀態', editing.enabled ? '🟢 可借用' : '🔴 已停用'],
      ]),
      confirmLabel: '確認儲存',
    }, () => apiUpdateEquipment({
      equipmentId: editing.id, name: editing.name, category: editing.category,
      unit: editing.unit, totalQty: editing.totalQty, location: editing.location || '',
      note: editing.note || '', enabled: editing.enabled,
    }), '已更新物資資料');
    setEditing(null);
  }

  async function adjust(item: Equipment, delta: number) {
    const qty = Number(adjustQty);
    if (!qty || qty <= 0) { setErr('請填寫大於 0 的數量。'); return; }
    await confirmRun('adj' + item.id, {
      title: delta > 0 ? '確認入庫' : '確認報廢',
      message: kv([
        ['物資', item.name],
        ['變動', `${delta > 0 ? '+' : ''}${delta * qty} ${item.unit}`],
        ['變動後可借', `${(item.availableQty || 0) + delta * qty} ${item.unit}`],
      ]),
      confirmLabel: '確認調整',
    }, () => apiAdjustEquipmentQty(item.id, delta * qty),
      `${item.name}：${delta > 0 ? '入庫 +' : '報廢 '}${qty} ${item.unit}`);
    setAdjusting(''); setAdjustQty('1');
  }

  async function remove(item: Equipment) {
    await confirmRun('del' + item.id, {
      title: '確認刪除物資',
      message: kv([
        ['物資', item.name],
        ['注意', '已有借用紀錄的物資不能刪除，請改用「停用」'],
      ]),
      confirmLabel: '確認刪除',
      danger: true,
    }, () => apiDeleteEquipment(item.id), `已刪除「${item.name}」`);
  }

  async function decide(loan: EquipmentLoan, decision: 'approved' | 'rejected') {
    if (decision === 'approved') {
      await confirmRun('dec' + loan.id, {
        title: '確認批准借用',
        message: kv([
          ['申請人', loan.memberName || loan.memberId],
          ['物資', `${loan.equipmentName} ×${loan.qty} ${loan.unit || ''}`],
          ['注意', '批准後會即時扣除庫存'],
        ]),
        confirmLabel: '確認批准',
      }, () => apiDecideEquipmentLoan(loan.id, decision, ''), '✅ 已批准並扣除庫存');
    } else {
      await confirmRun('dec' + loan.id, {
        title: '確認拒絕借用申請',
        message: kv([
          ['申請人', loan.memberName || loan.memberId],
          ['物資', `${loan.equipmentName} ×${loan.qty} ${loan.unit || ''}`],
        ]),
        confirmLabel: '確認拒絕',
        danger: true,
      }, () => apiDecideEquipmentLoan(loan.id, decision, ''), '已拒絕該申請');
    }
  }

  async function markReturned(loan: EquipmentLoan) {
    await confirmRun('ret' + loan.id, {
      title: '確認已歸還',
      message: kv([
        ['申請人', loan.memberName || loan.memberId],
        ['物資', `${loan.equipmentName} ×${loan.qty} ${loan.unit || ''}`],
        ['注意', '標記後庫存會即時回補'],
      ]),
      confirmLabel: '確認已歸還',
    }, () => apiReturnEquipmentLoan(loan.id), '✅ 已標記歸還，庫存已回補');
  }

  async function toggleEnabled(e: Equipment) {
    await confirmRun('tog' + e.id, {
      title: e.enabled ? '確認停用物資' : '確認啟用物資',
      message: kv([
        ['物資', e.name],
        ['變更後狀態', e.enabled ? '🔴 已停用（不可借用）' : '🟢 可借用'],
      ]),
      confirmLabel: '確認',
    }, () => apiUpdateEquipment({ equipmentId: e.id, enabled: !e.enabled }));
  }

  if (!s) return <div className="card">{err ? <span className="badge red">{err}</span> : '載入中...'}</div>;

  return (
    <Auth roles={['super_admin', 'troop_super', 'troop_leader', 'admin', 'group_leader', 'branch_leader']}>
      <div className="stack">
        <section className="hero">
          <span className="badge gold">物資管理</span>
          <h1>📦 物資清單與借用批核</h1>
          <p>
            在這裡新增／修改旅團物資、調整庫存，並處理成員的借用申請。
            批准時會自動扣除庫存；成員歸還後按「✅ 已歸還」即自動回補。
          </p>
          <div className="row">
            <Link className="btn" href="/equipment">前往成員借用頁 →</Link>
            <button className="btn" onClick={load}>↻ 重新載入</button>
          </div>
        </section>

        {err && <p className="badge red" style={{ display: 'block', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{err}</p>}
        {ok && <p className="badge green" style={{ display: 'block', lineHeight: 1.7 }}>{ok}</p>}

        {/* ── 統計 ── */}
        <section className="grid">
          <div className="card"><span className="badge blue">物資種類</span><h2 style={{ margin: '8px 0 0' }}>{stats.kinds}</h2><p className="muted">已登記項目</p></div>
          <div className="card"><span className="badge green">可借數量</span><h2 style={{ margin: '8px 0 0' }}>{stats.availableUnits}</h2><p className="muted">現時庫存</p></div>
          <div className="card"><span className="badge gold">借出中</span><h2 style={{ margin: '8px 0 0' }}>{stats.out}</h2><p className="muted">已批核未歸還</p></div>
          <div className="card"><span className="badge red">待批核</span><h2 style={{ margin: '8px 0 0' }}>{stats.pending}</h2><p className="muted">等你處理</p></div>
        </section>

        {/* ── 現有物資總覽 ── */}
        <section className="card stack">
          <h2 style={{ marginTop: 0 }}>📋 現有物資清單</h2>
          {equipment.length === 0 ? (
            <p className="muted">尚未登記任何物資，請在下方新增。</p>
          ) : (
            <div className="attendance-table-wrap">
              <table className="table responsive">
                <thead>
                  <tr><th>物資</th><th>分類</th><th>總數</th><th>可借</th><th>位置</th><th>狀態</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {equipment.map(e => (
                    <tr key={e.id}>
                      <td data-label="物資">
                        <strong>{e.name}</strong>
                        {e.note && <div className="muted" style={{ fontSize: 12 }}>{e.note}</div>}
                      </td>
                      <td data-label="分類">{e.category || '其他'}</td>
                      <td data-label="總數">{e.totalQty} {e.unit}</td>
                      <td data-label="可借">
                        <b style={{ color: e.availableQty > 0 ? '#0d652d' : '#a50e0e' }}>{e.availableQty}</b> {e.unit}
                      </td>
                      <td data-label="位置">{e.location || '—'}</td>
                      <td data-label="狀態">{e.enabled ? <span className="badge green">可借用</span> : <span className="badge red">已停用</span>}</td>
                      <td data-label="操作">
                        <div className="row" style={{ gap: 6 }}>
                          <button className="btn" style={{ fontSize: 13 }} onClick={() => { setEditing(e); setErr(''); setOk(''); }}>✏️ 編輯</button>
                          <button className="btn" style={{ fontSize: 13 }} disabled={busy === 'tog' + e.id}
                            onClick={() => toggleEnabled(e)}>
                            {e.enabled ? '停用' : '啟用'}
                          </button>
                          {adjusting === e.id ? (
                            <>
                              <input type="number" min={1} value={adjustQty} onChange={ev => setAdjustQty(ev.target.value)}
                                style={{ width: 80 }} aria-label="調整數量" />
                              <button className="btn" style={{ fontSize: 13 }} disabled={!!busy} onClick={() => adjust(e, 1)}>入庫 +</button>
                              <button className="btn" style={{ fontSize: 13 }} disabled={!!busy} onClick={() => adjust(e, -1)}>報廢 −</button>
                              <button className="btn ghost" style={{ fontSize: 13 }} onClick={() => setAdjusting('')}>取消</button>
                            </>
                          ) : (
                            <button className="btn" style={{ fontSize: 13 }} onClick={() => { setAdjusting(e.id); setAdjustQty('1'); }}>± 調整庫存</button>
                          )}
                          <button className="btn" style={{ fontSize: 13, color: '#c5221f' }} disabled={busy === 'del' + e.id} onClick={() => remove(e)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 編輯物資 ── */}
        {editing && (
          <section className="card stack">
            <h2 style={{ marginTop: 0 }}>✏️ 編輯「{editing.name}」</h2>
            <div className="grid">
              <label>物資名稱
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label>分類
                <select value={editing.category || '其他'} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>單位（件／頂／套…）
                <input value={editing.unit} onChange={e => setEditing({ ...editing, unit: e.target.value })} />
              </label>
              <label>總數（擁有數量）
                <input type="number" min={0} value={editing.totalQty} onChange={e => setEditing({ ...editing, totalQty: Number(e.target.value) })} />
              </label>
              <label>存放位置
                <input value={editing.location || ''} onChange={e => setEditing({ ...editing, location: e.target.value })} />
              </label>
              <label>備註
                <input value={editing.note || ''} onChange={e => setEditing({ ...editing, note: e.target.value })} />
              </label>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              已借出未還：{Math.max(0, editing.totalQty - editing.availableQty)} {editing.unit}（修改總數時系統會自動保留這部分，不會把已借出的數量吃掉）
            </p>
            <div className="row">
              <button className="btn primary" disabled={busy === 'edit'} onClick={saveEdit}>{busy === 'edit' ? '儲存中…' : '💾 儲存'}</button>
              <button className="btn" onClick={() => setEditing(null)}>取消</button>
            </div>
          </section>
        )}

        {/* ── 新增物資 ── */}
        <section className="card stack">
          <h2 style={{ marginTop: 0 }}>＋ 新增物資</h2>
          <div className="grid">
            <label>物資名稱 *
              <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：4 人營帳" />
            </label>
            <label>分類
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>單位
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="件／頂／套／張" />
            </label>
            <label>總數 *
              <input type="number" min={0} value={totalQty} onChange={e => setTotalQty(e.target.value)} />
            </label>
            <label>存放位置
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="例如：旅部物資房" />
            </label>
            <label>備註
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="注意事項（選填）" />
            </label>
          </div>
          <button className="btn primary" disabled={busy === 'add'} onClick={add}>{busy === 'add' ? '寫入中…' : '＋ 新增物資'}</button>
        </section>

        {/* ── 借用申請批核 ── */}
        <section className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>🧾 借用申請</h2>
            <div className="row">
              {(['pending', 'approved', 'all'] as const).map(f => (
                <button key={f} className={`btn ${filter === f ? 'primary' : ''}`} style={{ fontSize: 13 }} onClick={() => setFilter(f)}>
                  {f === 'pending' ? `待批核 (${stats.pending})` : f === 'approved' ? `借出中 (${stats.out})` : '全部'}
                </button>
              ))}
            </div>
          </div>

          {shownLoans.length === 0 ? (
            <p className="muted">沒有符合的紀錄。</p>
          ) : (
            <div className="attendance-table-wrap">
              <table className="table responsive">
                <thead>
                  <tr><th>申請人</th><th>物資</th><th>數量</th><th>用途</th><th>借出／歸還日期</th><th>狀態</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {shownLoans.map(l => (
                    <tr key={l.id}>
                      <td data-label="申請人">
                        <strong>{l.memberName || l.memberId}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>{branchName(l.branchId)}</div>
                      </td>
                      <td data-label="物資">{l.equipmentName}</td>
                      <td data-label="數量">{l.qty} {l.unit}</td>
                      <td data-label="用途">{l.purpose || '—'}</td>
                      <td data-label="借出／歸還">{l.borrowDate} → {l.returnDueDate}</td>
                      <td data-label="狀態">
                        <span className={`badge ${{ pending: 'gold', approved: 'blue', rejected: 'red', returned: 'green', cancelled: 'red' }[l.status]}`}>
                          {LOAN_STATUS_LABEL[l.status] || l.status}
                        </span>
                        {l.decisionNote && <div className="muted" style={{ fontSize: 12 }}>{l.decisionNote}</div>}
                      </td>
                      <td data-label="操作">
                        <div className="row" style={{ gap: 6 }}>
                          {l.status === 'pending' && (
                            <>
                              <button className="btn" style={{ fontSize: 13, background: '#e6f4ea', color: '#0d652d' }}
                                disabled={!!busy} onClick={() => decide(l, 'approved')}>✅ 批准</button>
                              <button className="btn" style={{ fontSize: 13, color: '#c5221f' }}
                                disabled={!!busy} onClick={() => decide(l, 'rejected')}>✖ 拒絕</button>
                            </>
                          )}
                          {l.status === 'approved' && (
                            <button className="btn primary" style={{ fontSize: 13 }} disabled={busy === 'ret' + l.id}
                              onClick={() => markReturned(l)}>✅ 已歸還（Tick）</button>
                          )}
                          {(l.status === 'returned' || l.status === 'rejected' || l.status === 'cancelled') && (
                            <span className="muted" style={{ fontSize: 12 }}>
                              {l.status === 'returned' ? `${l.returnedAt || ''} ${l.returnedBy ? '· ' + l.returnedBy : ''}` : '已完成'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ margin: 0 }}>
            流程：成員申請（待批核）→ 領袖批准（自動扣庫存）→ 成員歸還 → 領袖按「已歸還」（自動回補庫存）。
          </p>
        </section>
      </div>
    </Auth>
  );
}
