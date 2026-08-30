'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Auth from '@/components/Auth';
import { AppState, loadState, Member } from '@/lib/store';
import { branches as BRANCH_DEFS, Role } from '@/lib/model';
import { getSession, Session } from '@/lib/session';
import {
  apiGetAttendance,
  apiGetAttendanceMatrix,
  apiGetMemberAttendance,
  apiSaveAttendance,
} from '@/lib/api';
import {
  ATTENDANCE_STATUSES,
  AttendanceMatrix,
  AttendanceRosterItem,
  AttendanceSessionType,
  AttendanceStatus,
  AttendanceSummary,
  MemberAttendanceRecord,
  canMarkAttendance,
  summarizeRoster,
  todayISO,
  weekdayLabel,
} from '@/lib/attendance';

const LEADER_ROLES: Role[] = ['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader', 'coach'];

function dashboardHref(role?: Role) {
  if (role === 'member') return '/member';
  if (role === 'parent') return '/parent';
  if (role && ['super_admin', 'troop_super', 'admin'].includes(role)) return '/admin';
  if (role && LEADER_ROLES.includes(role)) return '/leader';
  return '/';
}

function branchName(id: string) {
  return BRANCH_DEFS.find(b => b.id === id)?.name || id;
}

function statusClass(code: AttendanceStatus) {
  return code ? `att-status att-status-${code}` : 'att-status';
}

function csvEscape(value: string) {
  return `"${String(value || '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob(['\ufeff' + rows.map(r => r.map(csvEscape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendancePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const [sessionType, setSessionType] = useState<AttendanceSessionType>('meeting');
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [eventId, setEventId] = useState('');
  const [patrolFilter, setPatrolFilter] = useState('');
  const [roster, setRoster] = useState<AttendanceRosterItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<'rollcall' | 'matrix' | 'history'>('rollcall');
  const [matrixDays, setMatrixDays] = useState(30);
  const [matrix, setMatrix] = useState<AttendanceMatrix | null>(null);
  const [history, setHistory] = useState<MemberAttendanceRecord | null>(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [childId, setChildId] = useState('');

  const leader = canMarkAttendance(session?.role);
  const isParent = session?.role === 'parent';
  const isMember = session?.role === 'member';

  useEffect(() => {
    const current = getSession();
    setSession(current);
    loadState()
      .then(st => {
        setState(st);
        const firstBranch = current?.branchId
          || st.members.find(m => m.id === current?.memberId)?.branchId
          || st.members[0]?.branchId
          || st.patrols[0]?.branchId
          || 'b3';
        setBranchId(firstBranch);
        if (current?.role === 'parent') {
          const children = st.members.filter(m => m.parentUserId === current.userId || (st.users[0]?.childMemberIds || []).includes(m.id));
          if (children[0]) {
            setChildId(children[0].id);
            setBranchId(children[0].branchId);
          }
        }
        if (current?.role === 'member') setTab('history');
      })
      .catch(e => setErr(e.message));
  }, []);

  const visibleBranches = useMemo(() => {
    if (!state || !session) return [];
    if (['super_admin', 'troop_super', 'admin'].includes(session.role)) return BRANCH_DEFS;
    const ids = new Set(state.members.map(m => m.branchId).filter(Boolean));
    if (session.branchId) ids.add(session.branchId);
    return BRANCH_DEFS.filter(b => ids.has(b.id));
  }, [state, session]);

  const troopActivities = useMemo(() => {
    if (!state) return [];
    return state.events.filter(e =>
      e.status === 'published' &&
      e.kind === 'activity' &&
      (e.scope === 'troop' || e.branchId === branchId)
    );
  }, [state, branchId]);

  const patrols = useMemo(() => {
    if (!state) return [];
    return state.patrols.filter(p => p.branchId === branchId && p.enabled !== false);
  }, [state, branchId]);

  const displayedRoster = useMemo(() => {
    if (!patrolFilter) return roster;
    return roster.filter(r => r.patrolId === patrolFilter || r.patrolName === patrolFilter);
  }, [roster, patrolFilter]);

  const summary: AttendanceSummary = useMemo(() => summarizeRoster(displayedRoster), [displayedRoster]);

  const children = useMemo(() => {
    if (!state || !session || session.role !== 'parent') return [] as Member[];
    const parent = state.users.find(u => u.id === session.userId);
    return state.members.filter(m => m.parentUserId === session.userId || (parent?.childMemberIds || []).includes(m.id));
  }, [state, session]);

  const meetingHint = useMemo(() => {
    if (!state || sessionType !== 'meeting') return '';
    const rules = state.regularMeetings.filter(r => r.enabled && r.branchId === branchId);
    if (!rules.length) return '';
    const labels = ['日', '一', '二', '三', '四', '五', '六'];
    return rules.map(r => `${r.title}（星期${labels[r.weekday] || r.weekday} ${r.startTime}-${r.endTime}）`).join('、');
  }, [state, branchId, sessionType]);

  function patchRoster(memberId: string, patch: Partial<AttendanceRosterItem>) {
    setRoster(prev => prev.map(item => item.memberId === memberId ? { ...item, ...patch } : item));
    setDirty(true);
    setOk('');
  }

  function markAll(status: AttendanceStatus) {
    setRoster(prev => prev.map(item => {
      if (patrolFilter && item.patrolId !== patrolFilter && item.patrolName !== patrolFilter) return item;
      return { ...item, status };
    }));
    setDirty(true);
  }

  async function loadRollcall() {
    if (!branchId || !date) { setErr('請先選擇支部及日期'); return; }
    if (sessionType === 'activity' && !eventId) { setErr('請先選擇要點名的旅團自辦活動'); return; }
    setErr(''); setOk(''); setLoading(true);
    try {
      const data = await apiGetAttendance({ branchId, date, sessionType, eventId });
      if (!data.success) throw new Error(data.error || '載入點名失敗');
      setRoster(data.roster || []);
      setLoaded(true);
      setDirty(false);
      setTab('rollcall');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveRollcall() {
    const records = roster.filter(r => r.status);
    if (!records.length) { setErr('請至少為一位成員選擇出席狀態'); return; }
    setErr(''); setOk(''); setLoading(true);
    try {
      const data = await apiSaveAttendance({
        branchId, date, sessionType, eventId,
        records: records.map(r => ({
          memberId: r.memberId,
          ymNumber: r.ymNumber,
          name: r.name,
          patrolId: r.patrolId,
          status: r.status,
          note: r.note || '',
        })),
      });
      if (!data.success) throw new Error(data.error || '儲存失敗');
      setDirty(false);
      setOk(`已儲存 ${data.saved || records.length} 筆點名紀錄`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMatrixView() {
    if (!branchId) { setErr('請先選擇支部'); return; }
    setErr(''); setLoading(true);
    try {
      const data = await apiGetAttendanceMatrix({ branchId, days: matrixDays, sessionType, patrolId: patrolFilter });
      if (!data.success) throw new Error(data.error || '載入矩陣失敗');
      setMatrix(data);
      setTab('matrix');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(target?: { memberId?: string; ymNumber?: string; name?: string }) {
    setErr(''); setLoading(true);
    try {
      const data = await apiGetMemberAttendance(target);
      if (!data.success) throw new Error(data.error || '查詢失敗');
      setHistory(data.record || null);
      setTab('history');
    } catch (e: any) {
      setErr(e.message);
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!matrix && displayedRoster.length === 0) { setErr('請先載入點名或矩陣'); return; }
    if (tab === 'matrix' && matrix) {
      downloadCsv(`點名矩陣_${branchName(branchId)}_${date}.csv`, [
        matrix.headers,
        ...matrix.rows.map(row => matrix.headers.map(h => row[h] || '')),
      ]);
      return;
    }
    downloadCsv(`點名_${branchName(branchId)}_${date}.csv`, [
      ['姓名', 'YMIS', '支部', '小隊', '狀態', '備註', '日期', '類型'],
      ...displayedRoster.map(r => [
        r.name, r.ymNumber, branchName(r.branchId), r.patrolName || '',
        r.status || '未點', r.note || '', date, sessionType === 'activity' ? '旅團自辦活動' : '日常集會',
      ]),
    ]);
  }

  function printView() {
    window.print();
  }

  useEffect(() => {
    if (!session || !state) return;
    if (isMember) loadHistory({ memberId: session.memberId || session.userId });
    if (isParent && childId) loadHistory({ memberId: childId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId, state, childId]);

  const selectedEvent = state?.events.find(e => e.id === eventId);

  return (
    <Auth roles={['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader', 'coach', 'member', 'parent']}>
      <div className="stack attendance-page">
        <section className="hero attendance-hero no-print">
          <span className="badge green">內建功能</span>
          <h1>📝 簽到／點名</h1>
          <p>
            日常集會及旅團自辦活動的實際出席紀錄，以 P／A／L／E／S 標記。
            點名資料存在本旅團主系統後台，與活動報名管理完全分開。
          </p>
          <div className="row">
            <Link className="btn" href={dashboardHref(session?.role)}>← 返回控制台</Link>
            {leader && <Link className="btn gold" href="/admin/registrations">📋 前往報名管理</Link>}
          </div>
        </section>

        <section className="grid attendance-separation-grid no-print" aria-label="功能分流說明">
          <div className="card attendance-purpose-card attendance-purpose-card--checkin">
            <span className="badge green">本頁功能</span>
            <h3>📝 簽到／點名</h3>
            <p className="muted">日常集會、恆常集會，以及旅團自己舉辦的活動。領袖以 P／A／L／E／S 記錄實際出席。</p>
          </div>
          <div className="card attendance-purpose-card attendance-purpose-card--registration">
            <span className="badge blue">另一獨立功能</span>
            <h3>📋 報名管理</h3>
            <p className="muted">旅團舉辦及外間活動的報名回覆、付款狀態、分層統計及名單匯出。</p>
          </div>
        </section>

        {err && <p className="badge red no-print">{err}</p>}
        {ok && <p className="badge green no-print">{ok}</p>}

        {leader && (
          <section className="card stack no-print">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>點名設定</h2>
              {dirty && <span className="badge gold">未儲存</span>}
            </div>
            <div className="row">
              <button className={`btn ${sessionType === 'meeting' ? 'primary' : ''}`} onClick={() => { setSessionType('meeting'); setEventId(''); setLoaded(false); }}>🏕️ 日常／恆常集會</button>
              <button className={`btn ${sessionType === 'activity' ? 'primary' : ''}`} onClick={() => { setSessionType('activity'); setLoaded(false); }}>🎪 旅團自辦活動</button>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <label>支部
                <select value={branchId} onChange={e => { setBranchId(e.target.value); setLoaded(false); setPatrolFilter(''); }}>
                  {visibleBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label>日期
                <input type="date" value={date} onChange={e => { setDate(e.target.value); setLoaded(false); }} />
              </label>
              {sessionType === 'activity' && (
                <label>自辦活動
                  <select value={eventId} onChange={e => { setEventId(e.target.value); setLoaded(false); }}>
                    <option value="">請選擇活動</option>
                    {troopActivities.map(e => <option key={e.id} value={e.id}>{e.title}（{e.date}）</option>)}
                  </select>
                </label>
              )}
              <label>小隊過濾
                <select value={patrolFilter} onChange={e => setPatrolFilter(e.target.value)}>
                  <option value="">全部小隊</option>
                  {patrols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            </div>
            {meetingHint && sessionType === 'meeting' && <p className="muted">本支部恆常集會：{meetingHint}</p>}
            {date && <p className="muted">所選日期為星期{weekdayLabel(date)}{selectedEvent ? ` · 活動：${selectedEvent.title}` : ''}</p>}
            <div className="row">
              <button className="btn primary" disabled={loading} onClick={loadRollcall}>{loading ? '載入中...' : '📋 載入／建立點名'}</button>
              <button className="btn" disabled={loading} onClick={loadMatrixView}>📊 查看矩陣</button>
              <button className="btn" onClick={exportCsv}>📄 匯出 CSV</button>
              <button className="btn" onClick={printView}>🖨️ 列印</button>
            </div>
          </section>
        )}

        {leader && (
          <section className="card stack no-print">
            <div className="row">
              <span className="muted">🔍 查詢成員出席：</span>
              <input style={{ maxWidth: 280 }} value={historyQuery} placeholder="輸入姓名或 YMIS" onChange={e => setHistoryQuery(e.target.value)} />
              <button className="btn primary" disabled={loading} onClick={() => {
                const q = historyQuery.trim();
                if (!q) return;
                if (/^\d{10}$/.test(q)) loadHistory({ ymNumber: q });
                else loadHistory({ name: q });
              }}>查詢</button>
              <button className="btn" onClick={() => { setHistory(null); setHistoryQuery(''); if (loaded) setTab('rollcall'); }}>清除</button>
            </div>
          </section>
        )}

        {isParent && children.length > 0 && (
          <section className="card stack no-print">
            <h3>查看子女出席</h3>
            <div className="row">
              {children.map(c => (
                <button key={c.id} className={`btn ${childId === c.id ? 'primary' : ''}`} onClick={() => { setChildId(c.id); setBranchId(c.branchId); }}>
                  {c.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="card stack no-print">
          <div className="row">
            {leader && <button className={`btn ${tab === 'rollcall' ? 'primary' : ''}`} onClick={() => setTab('rollcall')}>點名表</button>}
            {leader && <button className={`btn ${tab === 'matrix' ? 'primary' : ''}`} onClick={() => { setTab('matrix'); if (!matrix) loadMatrixView(); }}>矩陣</button>}
            <button className={`btn ${tab === 'history' ? 'primary' : ''}`} onClick={() => {
              setTab('history');
              if (isMember) loadHistory({ memberId: session?.memberId || session?.userId });
              else if (isParent && childId) loadHistory({ memberId: childId });
            }}>{isMember || isParent ? '我的出席紀錄' : '成員歷史'}</button>
          </div>
        </section>

        {tab === 'rollcall' && leader && (
          <section className="card stack attendance-rollcall">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ marginBottom: 4 }}>{branchName(branchId)} · {date} 點名表</h2>
                <p className="muted" style={{ margin: 0 }}>
                  {sessionType === 'activity' ? '旅團自辦活動實際出席' : '日常／恆常集會實際出席'}
                  {loaded ? ` · 共 ${displayedRoster.length} 人` : ' · 請先載入點名'}
                </p>
              </div>
              <button className="btn primary no-print" disabled={loading || !loaded} onClick={saveRollcall}>💾 儲存點名</button>
            </div>

            <div className="row attendance-legend no-print">
              {ATTENDANCE_STATUSES.map(s => (
                <span key={s.code} className={`att-chip att-status-${s.code}`}>{s.code} {s.label}</span>
              ))}
            </div>

            {loaded && (
              <div className="grid no-print" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))' }}>
                <div className="card" style={{ background: '#dcfce7' }}><div className="muted">出席 P</div><strong>{summary.P}</strong></div>
                <div className="card" style={{ background: '#fee2e2' }}><div className="muted">缺席 A</div><strong>{summary.A}</strong></div>
                <div className="card" style={{ background: '#fef9c3' }}><div className="muted">遲到 L</div><strong>{summary.L}</strong></div>
                <div className="card" style={{ background: '#dbeafe' }}><div className="muted">請假 E</div><strong>{summary.E}</strong></div>
                <div className="card" style={{ background: '#f3e8ff' }}><div className="muted">病假 S</div><strong>{summary.S}</strong></div>
                <div className="card"><div className="muted">未點</div><strong>{summary.blank}</strong></div>
              </div>
            )}

            {loaded && (
              <div className="row no-print">
                <span className="muted">快速標記目前名單：</span>
                {ATTENDANCE_STATUSES.map(s => (
                  <button key={s.code} className={`btn att-status-${s.code}`} onClick={() => markAll(s.code)}>{s.code} 全部{s.label}</button>
                ))}
              </div>
            )}

            {!loaded && <p className="muted">請選擇支部與日期，然後按「載入／建立點名」。系統會用本旅團 Members 名單建立當日點名表。</p>}

            {loaded && displayedRoster.length === 0 && <p className="muted">此支部／小隊目前沒有可點名成員。</p>}

            {loaded && displayedRoster.length > 0 && (
              <div className="attendance-table-wrap">
                <table className="table responsive attendance-table">
                  <thead>
                    <tr>
                      <th>姓名</th>
                      <th>小隊</th>
                      <th>YMIS</th>
                      <th>出席狀態</th>
                      <th>備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRoster.map(item => (
                      <tr key={item.memberId}>
                        <td data-label="姓名"><strong>{item.name}</strong></td>
                        <td data-label="小隊">{item.patrolName || '—'}</td>
                        <td data-label="YMIS"><span className="muted">{item.ymNumber || '—'}</span></td>
                        <td data-label="出席狀態">
                          <div className="row att-status-row">
                            {ATTENDANCE_STATUSES.map(s => (
                              <button
                                key={s.code}
                                className={`att-btn ${statusClass(s.code)} ${item.status === s.code ? 'active' : ''}`}
                                title={s.label}
                                onClick={() => patchRoster(item.memberId, { status: item.status === s.code ? '' : s.code })}
                              >{s.code}</button>
                            ))}
                          </div>
                        </td>
                        <td data-label="備註">
                          <input
                            value={item.note || ''}
                            placeholder="備註"
                            onChange={e => patchRoster(item.memberId, { note: e.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'matrix' && leader && (
          <section className="card stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>📊 出席矩陣 — {branchName(branchId)}</h2>
              <select value={matrixDays} onChange={e => setMatrixDays(Number(e.target.value))} className="no-print">
                <option value={7}>最近 7 次</option>
                <option value={14}>最近 14 次</option>
                <option value={30}>最近 30 次</option>
                <option value={60}>最近 60 次</option>
              </select>
            </div>
            <div className="row no-print">
              <button className="btn primary" disabled={loading} onClick={loadMatrixView}>重新載入</button>
              <button className="btn" onClick={exportCsv}>📄 匯出 CSV</button>
              <button className="btn" onClick={printView}>🖨️ 列印</button>
            </div>
            {!matrix && <p className="muted">按「查看矩陣」載入最近集會出席。</p>}
            {matrix && (
              <div className="attendance-table-wrap">
                <table className="table attendance-matrix">
                  <thead>
                    <tr>{matrix.headers.map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((row, idx) => (
                      <tr key={idx}>
                        {matrix.headers.map(h => {
                          const val = row[h] || '';
                          const isStatus = ATTENDANCE_STATUSES.some(s => s.code === val);
                          return <td key={h} className={isStatus ? statusClass(val as AttendanceStatus) : ''}>{val}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'history' && (
          <section className="card stack">
            <h2>{isMember ? '👤 我的出席紀錄' : isParent ? '👤 子女出席紀錄' : '👤 成員出席紀錄'}</h2>
            {!history && <p className="muted">{leader ? '請輸入姓名或 YMIS 查詢。' : '載入出席紀錄中...'}</p>}
            {history && (
              <>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>{history.name}</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      {history.ymNumber} · {branchName(history.branchId)} · {history.patrolName || '無小隊'}
                    </p>
                  </div>
                  <div className="row">
                    <span className="att-chip att-status-P">P {history.stats.P}</span>
                    <span className="att-chip att-status-A">A {history.stats.A}</span>
                    <span className="att-chip att-status-L">L {history.stats.L}</span>
                    <span className="att-chip att-status-E">E {history.stats.E}</span>
                    <span className="att-chip att-status-S">S {history.stats.S}</span>
                  </div>
                </div>
                {Object.keys(history.dates).length === 0 ? (
                  <p className="muted">暫無出席紀錄。</p>
                ) : (
                  <div className="attendance-history-grid">
                    {Object.entries(history.dates).sort((a, b) => a[0].localeCompare(b[0])).map(([d, rec]) => (
                      <div key={d} className={`card ${statusClass(rec.status)}`} style={{ padding: 10 }}>
                        <div className="muted">{d}</div>
                        <strong>{ATTENDANCE_STATUSES.find(s => s.code === rec.status)?.label || rec.status || '—'}</strong>
                        {rec.note && <div className="muted">{rec.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </Auth>
  );
}
