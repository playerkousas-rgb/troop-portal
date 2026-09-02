'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Auth from '@/components/Auth';
import { AppState, loadStateSlice, Member } from '@/lib/store';
import { branches as BRANCH_DEFS, Role, canMarkAllBranchesAttendance } from '@/lib/model';
import { getSession, Session } from '@/lib/session';
import {
  apiGetAttendance,
  apiGetAttendanceMatrix,
  apiGetAttendanceSessions,
  apiGetMemberAttendance,
  apiSaveAttendance,
} from '@/lib/api';
import { useConfirm, kv } from '@/components/ConfirmProvider';
import {
  ATTENDANCE_STATUSES,
  AttendanceMatrix,
  AttendanceRosterItem,
  AttendanceSessions,
  AttendanceStatus,
  MemberAttendanceRecord,
  canMarkAttendance,
  statusLabel,
  summarizeMatrix,
  summarizeRoster,
  todayISO,
  weekdayLabel,
} from '@/lib/attendance';

const LEADER_ROLES: Role[] = ['super_admin', 'troop_super', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach'];

function dashboardHref(role?: Role) {
  if (role === 'member') return '/member';
  if (role === 'parent') return '/parent';
  if (role && ['super_admin', 'troop_super', 'troop_leader', 'admin'].includes(role)) return '/admin';
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

/** 目前開啟的點名場次（今日點名與後補共用） */
type Editor = {
  key: string;
  mode: 'meeting' | 'activity';
  date: string;
  eventId: string;
  label: string;      // 標題（例如支部名 · 恆常集會）
  meta?: string;      // 詳細資料（時間／地點／已取消）
};

const inputCls = 'w-full rounded-xl border border-slate-300 px-4 py-3 text-[16px] bg-white focus:outline-none focus:border-brand-500';
const btnCls = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold px-4 py-3 text-[15px] border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = `${btnCls} bg-brand-700 text-white border-brand-700 hover:bg-brand-800`;
const btnGhost = `${btnCls} bg-white text-slate-700 border-slate-300 hover:bg-slate-50`;
const btnDark = `${btnCls} bg-slate-800 text-white border-slate-800 hover:bg-slate-900`;

export default function AttendancePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const { confirm } = useConfirm();

  // 支部 / 類型
  const [branchId, setBranchId] = useState('');
  const [mode, setMode] = useState<'meeting' | 'activity'>('meeting');
  const [meetingDate, setMeetingDate] = useState(todayISO());
  const [eventId, setEventId] = useState('');
  const [patrolFilter, setPatrolFilter] = useState('');

  // 點名表（今日點名 + 後補共用；以 cache 避免重複載入）
  const [editor, setEditor] = useState<Editor | null>(null);
  const [roster, setRoster] = useState<AttendanceRosterItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const cacheRef = useRef<Record<string, AttendanceRosterItem[]>>({});
  const editorRef = useRef<HTMLDivElement | null>(null);
  const autoOpenedRef = useRef(false);

  // 後補／補改
  const [sessions, setSessions] = useState<AttendanceSessions | null>(null);
  const [backfillType, setBackfillType] = useState<'meeting' | 'activity'>('meeting');
  const [backfillMeetingDate, setBackfillMeetingDate] = useState('');
  const [backfillEventId, setBackfillEventId] = useState('');

  // 期間統計
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState(todayISO());
  const [reportType, setReportType] = useState<'all' | 'meeting' | 'activity'>('all');
  const [reportPatrol, setReportPatrol] = useState('');
  const [matrix, setMatrix] = useState<AttendanceMatrix | null>(null);

  // 成員紀錄
  const [history, setHistory] = useState<MemberAttendanceRecord | null>(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [childId, setChildId] = useState('');

  const leader = canMarkAttendance(session?.role);
  const isParent = session?.role === 'parent';
  const isMember = session?.role === 'member';

  // 初始化：session + 資料
  useEffect(() => {
    const current = getSession();
    setSession(current);
    loadStateSlice(['patrols', 'users', 'members', 'events', 'regularMeetings', 'cancelledMeetings', 'userFeatures'])
      .then(st => {
        setState(st);
        const canSeeAll = canMarkAllBranchesAttendance(current?.role, st.userFeatures);
        let firstBranch = (current?.branchId || st.members[0]?.branchId || st.patrols[0]?.branchId || 'b3');
        if (current?.role === 'parent') {
          const parent = st.users.find(u => u.id === current.userId);
          const children = st.members.filter(m => m.parentUserId === current.userId || (parent?.childMemberIds || []).includes(m.id));
          if (children[0]) {
            setChildId(children[0].id);
            firstBranch = children[0].branchId;
          }
        }
        if (current?.role === 'member') {
          const mb = st.members.find(m => m.id === current.memberId);
          if (mb) firstBranch = mb.branchId;
        }
        // 看不到全旅但自己有支部的領袖，鎖定自己支部
        if (leader && !canSeeAll && current?.branchId) firstBranch = current.branchId;
        setBranchId(firstBranch);
      })
      .catch(e => setErr(e.message));

    const d = new Date();
    d.setDate(d.getDate() - 29);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setReportFrom(`${d.getFullYear()}-${m}-${day}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSeeAllBranches = !!session && canMarkAllBranchesAttendance(session.role, state?.userFeatures);

  const visibleBranches = useMemo(() => {
    if (!session) return [];
    if (canSeeAllBranches) return BRANCH_DEFS;
    const b = session.branchId || branchId;
    return BRANCH_DEFS.filter(x => x.id === b);
  }, [session, canSeeAllBranches, branchId]);

  // 載入後補場次列表（每支部只載入一次）
  useEffect(() => {
    if (!leader || !branchId) return;
    let alive = true;
    setSessions(null);
    apiGetAttendanceSessions({ branchId })
      .then((d: AttendanceSessions) => { if (alive) setSessions(d); })
      .catch(e => { if (alive) setErr(e.message || String(e)); });
    return () => { alive = false; };
  }, [leader, branchId]);

  const regularMeetings = useMemo(() => {
    if (!state) return [];
    return state.regularMeetings.filter(r => r.enabled && r.branchId === branchId);
  }, [state, branchId]);

  const meetingHint = useMemo(() => {
    if (!regularMeetings.length) return '';
    const labels = ['日', '一', '二', '三', '四', '五', '六'];
    return regularMeetings.map(r => `${r.title}（星期${labels[r.weekday] || r.weekday} ${r.startTime}-${r.endTime}）`).join('、');
  }, [regularMeetings]);

  const todayIsMeetingDay = useMemo(() => {
    if (!meetingDate || !regularMeetings.length) return false;
    const wd = new Date(meetingDate + 'T00:00:00').getDay();
    return regularMeetings.some(r => r.weekday === wd);
  }, [meetingDate, regularMeetings]);

  const isCancelled = (date: string) => {
    if (!state) return false;
    return state.cancelledMeetings.some(c => c.branchId === branchId && c.date === date);
  };

  const patrols = useMemo(() => {
    if (!state) return [];
    return state.patrols.filter(p => p.branchId === branchId && p.enabled !== false);
  }, [state, branchId]);

  const displayedRoster = useMemo(() => {
    if (!patrolFilter) return roster;
    return roster.filter(r => r.patrolId === patrolFilter || r.patrolName === patrolFilter);
  }, [roster, patrolFilter]);

  const summary = useMemo(() => summarizeRoster(displayedRoster), [displayedRoster]);

  const children = useMemo(() => {
    if (!state || !session || session.role !== 'parent') return [] as Member[];
    const parent = state.users.find(u => u.id === session.userId);
    return state.members.filter(m => m.parentUserId === session.userId || (parent?.childMemberIds || []).includes(m.id));
  }, [state, session]);

  // ── 防呆：切換前有未儲存修改就確認 ──
  async function guardDiscard(): Promise<boolean> {
    if (!dirty) return true;
    return confirm({
      title: '未儲存嘅修改',
      message: kv([['提示', '目前點名表有未儲存嘅修改，切換後會遺失']]),
      confirmLabel: '繼續（放棄修改）',
      cancelLabel: '返回點名表',
      danger: true,
    });
  }

  async function openSession(ed: Omit<Editor, 'key'>) {
    const key = `${branchId}|${ed.mode}|${ed.date}|${ed.eventId}`;
    if (dirty && editor && editor.key !== key) {
      const ok = await confirm({
        title: '未儲存嘅修改',
        message: kv([['提示', '目前點名表有未儲存嘅修改，切換後會遺失']]),
        confirmLabel: '繼續（放棄修改）',
        cancelLabel: '返回點名表',
        danger: true,
      });
      if (!ok) return;
    }
    // 快取命中 → 唔使再 LOAD
    if (cacheRef.current[key]) {
      setRoster(cacheRef.current[key]);
      setEditor({ ...ed, key });
      setLoaded(true);
      setDirty(false);
      setErr('');
      return;
    }
    setLoading(true);
    setErr('');
    apiGetAttendance({ branchId, date: ed.date, sessionType: ed.mode, eventId: ed.eventId })
      .then(data => {
        if (!data.success) { setErr(data.error || '載入點名失敗'); return; }
        const r = data.roster || [];
        cacheRef.current[key] = r;
        setRoster(r);
        setEditor({ ...ed, key });
        setLoaded(true);
        setDirty(false);
      })
      .catch(e => setErr(e.message || String(e)))
      .finally(() => setLoading(false));
  }

  function openMeeting(date: string) {
    const cancelled = isCancelled(date);
    const wd = weekdayLabel(date);
    const rule = regularMeetings.find(r => r.weekday === new Date(date + 'T00:00:00').getDay());
    const meta = cancelled
      ? `已取消（${state?.cancelledMeetings.find(c => c.branchId === branchId && c.date === date)?.reason || '原因未註明'}）`
      : rule
        ? `星期${wd} · ${rule.startTime}-${rule.endTime} · ${rule.location || ''}`
        : `星期${wd}`;
    openSession({ mode: 'meeting', date, eventId: '', label: `${branchName(branchId)} · ${rule?.title || '恆常集會'}`, meta });
  }

  function openActivity(id: string) {
    const sa = sessions?.activities.find(a => a.id === id);
    const ev = state?.events.find(e => e.id === id);
    if (!sa && !ev) { setErr('請先選擇活動'); return; }
    openSession({
      mode: 'activity',
      date: sa?.date || ev?.date || '',
      eventId: id,
      label: sa?.label || ev?.title || '',
      meta: `${sa?.date || ev?.date || ''}${(sa?.location || ev?.location) ? ` · ${sa?.location || ev?.location}` : ''}`,
    });
  }

  async function changeBranch(id: string) {
    if (!(await guardDiscard())) return;
    setBranchId(id);
    setEditor(null);
    setRoster([]);
    setLoaded(false);
    setDirty(false);
    setEventId('');
    setBackfillMeetingDate('');
    setBackfillEventId('');
    setMatrix(null);
    setOk('');
    setErr('');
  }

  // 首次進入：自動開啟今日恆常集會點名表（唔使撳掣）
  useEffect(() => {
    if (!leader || !branchId || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    openMeeting(meetingDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leader, branchId]);

  // 切換場次後捲到點名表
  useEffect(() => {
    if (editor && editorRef.current) editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editor?.key]);

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
    setOk('');
  }

  async function saveRollcall() {
    if (!editor) return;
    const records = roster.filter(r => r.status);
    if (!records.length) { setErr('請至少為一位成員選擇出席狀態（點 P／A／L／E／S）'); return; }
    // 防呆：先填好全部，按確認先一次過儲存到後台（唔會逐個成員逐次儲存）
    const summary = summarizeRoster(records);
    const confirmed = await confirm({
      title: '確認一次過儲存點名結果',
      message: kv([
        ['場次', `${editor.label}（${editor.date}）`],
        ['出席 P', `${summary.P}`],
        ['缺席 A', `${summary.A}`],
        ['遲到 L', `${summary.L}`],
        ['請假 E', `${summary.E}`],
        ['病假 S', `${summary.S}`],
        ['共', `${records.length} 筆`],
      ]),
      confirmLabel: '確認儲存',
    });
    if (!confirmed) return;
    setLoading(true);
    setErr('');
    setOk('');
    try {
      const data = await apiSaveAttendance({
        branchId,
        date: editor.date,
        sessionType: editor.mode,
        eventId: editor.eventId,
        records: records.map(r => ({
          memberId: r.memberId, ymNumber: r.ymNumber, name: r.name,
          patrolId: r.patrolId, status: r.status, note: r.note || '',
        })),
      });
      if (!data.success) throw new Error(data.error || '儲存失敗');
      cacheRef.current[editor.key] = roster;
      setDirty(false);
      setOk(`✅ 已儲存 ${data.saved || records.length} 筆點名紀錄`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    if (!branchId) { setErr('請先選擇支部'); return; }
    setErr('');
    setLoading(true);
    try {
      const data = await apiGetAttendanceMatrix({
        branchId, from: reportFrom, to: reportTo, sessionType: reportType, patrolId: reportPatrol,
      });
      if (!data.success) throw new Error(data.error || '載入統計失敗');
      setMatrix(data);
    } catch (e: any) {
      setErr(e.message);
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(target?: { memberId?: string; ymNumber?: string; name?: string }) {
    setErr('');
    setLoading(true);
    try {
      const data = await apiGetMemberAttendance(target);
      if (!data.success) throw new Error(data.error || '查詢失敗');
      setHistory(data.record || null);
    } catch (e: any) {
      setErr(e.message);
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }

  // 家長由「子女出席紀錄」入嚟：/attendance?memberId=xxx → 自動揀返嗰個子女
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('memberId');
    if (q) setChildId(q);
  }, []);

  useEffect(() => {
    if (!session || !state) return;
    if (isMember) loadHistory({ memberId: session.memberId || session.userId });
    if (isParent && childId) loadHistory({ memberId: childId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId, state, childId]);

  function exportRosterCsv() {
    if (!editor) return;
    downloadCsv(`點名_${branchName(branchId)}_${editor.date}.csv`, [
      ['姓名', 'YMIS', '支部', '小隊', '狀態', '備註', '日期', '類型'],
      ...displayedRoster.map(r => [
        r.name, r.ymNumber, branchName(r.branchId || branchId), r.patrolName || '',
        statusLabel(r.status || ''), r.note || '', editor.date,
        editor.mode === 'activity' ? '旅團活動' : '恆常集會',
      ]),
    ]);
  }

  function exportReportCsv() {
    if (!matrix || !(matrix.columns || []).length) { setErr('請先載入統計'); return; }
    const columns = matrix.columns!;
    const stats = summarizeMatrix(matrix.rows, columns);
    const headerRow = ['YMIS號', '姓名', '小隊', ...columns.map(c => `${c.date}${c.sessionType === 'activity' ? '(活)' : '(集)'}`), '出席P', '缺席A', '遲到L', '請假E', '病假S', '出席率'];
    const rows = matrix.rows.map((r, i) => {
      const st = stats[i];
      const total = columns.length;
      const rate = total ? Math.round((st.P / total) * 100) + '%' : '—';
      return [r['YMIS號'] || '', r['姓名'] || '', r['小隊'] || '',
        ...columns.map(c => statusLabel((r[c.key] || '') as AttendanceStatus)),
        String(st.P), String(st.A), String(st.L), String(st.E), String(st.S), rate];
    });
    downloadCsv(`出席統計_${branchName(branchId)}_${reportFrom}_${reportTo}.csv`, [headerRow, ...rows]);
  }

  function printView() { window.print(); }

  const selectedActivity = sessions?.activities.find(a => a.id === eventId);
  const todayLabel = todayISO();

  return (
    <Auth roles={['super_admin', 'troop_super', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach', 'member', 'parent']}>
      <div className="w-full px-3 sm:px-6 py-5 pb-32 space-y-5 attendance-page">

        {/* ═══ Hero ═══ */}
        <section className="attendance-hero hero no-print">
          <span className="badge green">內建功能</span>
          <h1>📝 簽到／點名</h1>
          <p className="muted" style={{ fontSize: 16 }}>
            記錄日常／恆常集會及旅團活動嘅實際出席（P／A／L／E／S）。
            可以後補改返過期集會／活動，亦可以按期間匯出出席統計。
          </p>
          <div className="row" style={{ marginTop: 4 }}>
            <Link className="btn" href={dashboardHref(session?.role)}>← 返回控制台</Link>
            {leader && <Link className="btn gold" href="/admin/registrations">📋 前往報名管理</Link>}
          </div>
        </section>

        {err && <p className="badge red block w-full text-[15px] no-print" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{err}</p>}
        {ok && <p className="badge green block w-full text-[15px] no-print" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{ok}</p>}

        {/* ═══════════════════════════ 領袖視角 ═══════════════════════════ */}
        {leader && (
          <>
            {/* ① 選擇支部 */}
            <section className="card stack">
              <h2 className="text-xl m-0">① 選擇支部</h2>
              {canSeeAllBranches && <p className="muted" style={{ margin: 0 }}>你有全旅點名權，可以揀任何支部。</p>}
              {!canSeeAllBranches && <p className="muted" style={{ margin: 0 }}>你只可為自己支部點名；如需全旅點名，請管理員授權「全旅點名」。</p>}
              <div className="flex flex-wrap gap-2">
                {visibleBranches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => changeBranch(b.id)}
                    className={`${btnCls} text-base ${branchId === b.id ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </section>

            {/* ② 點名：恆常集會／活動 */}
            <section className="card stack">
              <h2 className="text-xl m-0">② 恆常集會 或 活動</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => { if (await guardDiscard()) { setMode('meeting'); setEditor(null); setLoaded(false); setDirty(false); } }}
                  className={`${btnCls} text-base ${mode === 'meeting' ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  🏕️ 恆常集會
                </button>
                <button
                  onClick={async () => { if (await guardDiscard()) { setMode('activity'); setEditor(null); setLoaded(false); setDirty(false); } }}
                  className={`${btnCls} text-base ${mode === 'activity' ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  🎪 旅團活動
                </button>
              </div>

              {meetingHint && <p className="muted" style={{ margin: 0 }}>本支部恆常集會：{meetingHint}</p>}

              {mode === 'meeting' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label style={{ fontSize: 15 }}>集會日期（恆常集會按當天日期出現）
                    <input type="date" className={inputCls} value={meetingDate}
                      onChange={async e => { const v = e.target.value; if (await guardDiscard()) { setMeetingDate(v); openMeeting(v); } }} />
                  </label>
                  <label style={{ fontSize: 15 }}>小隊過濾
                    <select className={inputCls} value={patrolFilter} onChange={e => setPatrolFilter(e.target.value)}>
                      <option value="">全部小隊</option>
                      {patrols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <div className="sm:col-span-2">
                    {meetingDate === todayLabel && todayIsMeetingDay && !isCancelled(meetingDate) && (
                      <span className="badge green" style={{ fontSize: 14 }}>✅ 今日係集會日</span>
                    )}
                    {meetingDate === todayLabel && !todayIsMeetingDay && (
                      <span className="badge gold" style={{ fontSize: 14 }}>今日唔係恆常集會日（仍可手動點名）</span>
                    )}
                    {isCancelled(meetingDate) && <span className="badge red" style={{ fontSize: 14 }}>⚠️ 呢日已取消</span>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label style={{ fontSize: 15 }}>選擇活動（今日／即將；過期請到「③ 出席管理」補改）
                    <select className={inputCls} value={eventId}
                      onChange={async e => { const v = e.target.value; if (await guardDiscard()) { setEventId(v); if (v) openActivity(v); } }}>
                      <option value="">請選擇活動</option>
                      {(sessions?.activities || []).filter(a => a.date >= todayLabel).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.label}（{a.date}）{a.hasRecords ? ' · 已點名' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: 15 }}>小隊過濾
                    <select className={inputCls} value={patrolFilter} onChange={e => setPatrolFilter(e.target.value)}>
                      <option value="">全部小隊</option>
                      {patrols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                </div>
              )}

              {mode === 'meeting' && (
                <div className="row">
                  <button className={btnPrimary} disabled={loading || !meetingDate} onClick={() => openMeeting(meetingDate)}>
                    {loading ? '載入中...' : '📋 開啟點名表'}
                  </button>
                </div>
              )}
              {mode === 'activity' && selectedActivity && (
                <div className="row">
                  <button className={btnPrimary} disabled={loading || !eventId} onClick={() => openActivity(eventId)}>
                    {loading ? '載入中...' : '📋 開啟點名表'}
                  </button>
                </div>
              )}
            </section>

            {/* ③ 出席管理：後補／補改 */}
            <section className="card stack">
              <h2 className="text-xl m-0">③ 出席管理 · 後補／補改</h2>
              <p className="muted" style={{ margin: 0 }}>
                錯過咗點名？揀返嗰次過期集會／活動即可補填或修改，同時可查看當次集會詳細資料。
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => { if (await guardDiscard()) { setBackfillType('meeting'); setBackfillEventId(''); setEditor(null); setLoaded(false); setDirty(false); } }}
                  className={`${btnCls} ${backfillType === 'meeting' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  🏕️ 過期／過去集會
                </button>
                <button
                  onClick={async () => { if (await guardDiscard()) { setBackfillType('activity'); setBackfillMeetingDate(''); setEditor(null); setLoaded(false); setDirty(false); } }}
                  className={`${btnCls} ${backfillType === 'activity' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  🎪 過期／過去活動
                </button>
              </div>

              {!sessions && <p className="muted" style={{ margin: 0 }}>載入場次中...</p>}
              {sessions && backfillType === 'meeting' && (
                <label style={{ fontSize: 15 }}>揀集會日（由新至舊；標「已點名」＝已有紀錄，可修改）
                  <select className={inputCls} value={backfillMeetingDate}
                    onChange={async e => { const v = e.target.value; if (await guardDiscard()) { setBackfillMeetingDate(v); if (v) openMeeting(v); } }}>
                    <option value="">請選擇集會日期</option>
                    {sessions.meetings.map(m => (
                      <option key={m.id} value={m.date}>
                        {m.date}（星期{weekdayLabel(m.date)}）· {m.label}{m.time ? ` ${m.time}` : ''}{m.hasRecords ? ' · 已點名' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {sessions && backfillType === 'activity' && (
                <label style={{ fontSize: 15 }}>揀活動（由新至舊）
                  <select className={inputCls} value={backfillEventId}
                    onChange={async e => { const v = e.target.value; if (await guardDiscard()) { setBackfillEventId(v); if (v) openActivity(v); } }}>
                    <option value="">請選擇活動</option>
                    {sessions.activities.map(a => (
                      <option key={a.id} value={a.id}>{a.label}（{a.date}）{a.hasRecords ? ' · 已點名' : ''}</option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            {/* ★ 點名表（今日點名 + 後補共用） */}
            <div ref={editorRef} className="card stack" style={{ borderColor: '#7c3aed' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h2 className="text-xl m-0">📋 點名表</h2>
                  {editor ? (
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 16 }}>
                      <strong>{editor.label}</strong>
                      <span style={{ color: 'var(--muted)' }}> · {editor.date}（星期{weekdayLabel(editor.date)}）{editor.meta ? ` · ${editor.meta}` : ''}</span>
                    </p>
                  ) : (
                    <p className="muted" style={{ margin: '4px 0 0' }}>喺上面揀支部、恆常集會／活動，點名表會自動開喺度（已載入過嘅會即時顯示，唔使重複載入）。</p>
                  )}
                </div>
                {dirty && <span className="badge gold" style={{ fontSize: 14 }}>未儲存</span>}
              </div>

              {!editor && (
                <p className="muted" style={{ margin: 0 }}>請先選擇要點名嘅場次。</p>
              )}

              {editor && (
                <>
                  <div className="row attendance-legend">
                    {ATTENDANCE_STATUSES.map(s => (
                      <span key={s.code} className={`att-chip att-status-${s.code}`}>{s.code} {s.label}</span>
                    ))}
                    <span className="att-chip" style={{ background: '#f1f5f9', color: '#33475b', border: '1px solid #e2e8f0' }}>再撳一次可取消</span>
                  </div>

                  {/* 小計 */}
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))' }}>
                    {(['P', 'A', 'L', 'E', 'S'] as const).map(code => (
                      <div key={code} className={`card att-status-${code}`} style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 26, fontWeight: 900 }}>{summary[code]}</div>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{statusLabel(code)}</div>
                      </div>
                    ))}
                    <div className="card" style={{ padding: 12, textAlign: 'center', background: '#f1f5f9' }}>
                      <div style={{ fontSize: 26, fontWeight: 900 }}>{summary.blank}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--muted-strong)' }}>未點</div>
                    </div>
                  </div>

                  <div className="row">
                    <span className="muted" style={{ fontWeight: 800 }}>快速標記目前名單：</span>
                    {ATTENDANCE_STATUSES.map(s => (
                      <button key={s.code} className={`btn att-status-${s.code}`} style={{ fontSize: 15 }} onClick={() => markAll(s.code)}>
                        {s.code} 全部{s.label}
                      </button>
                    ))}
                  </div>

                  {loading && <p className="muted" style={{ margin: 0 }}>載入中...</p>}
                  {!loading && loaded && displayedRoster.length === 0 && (
                    <p className="muted" style={{ margin: 0 }}>此支部／小隊目前沒有可點名成員。</p>
                  )}

                  {loaded && displayedRoster.length > 0 && (
                    <div className="attendance-table-wrap">
                      <table className="table responsive attendance-table">
                        <thead>
                          <tr>
                            <th>姓名</th><th>小隊</th><th>YMIS</th><th>出席狀態</th><th>備註</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedRoster.map(item => (
                            <tr key={item.memberId}>
                              <td data-label="姓名"><strong style={{ fontSize: 16 }}>{item.name}</strong></td>
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
                                <input value={item.note || ''} placeholder="備註" style={{ fontSize: 15 }}
                                  onChange={e => patchRoster(item.memberId, { note: e.target.value })} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {dirty && (
                    <p className="muted" style={{ margin: 0 }}>
                      ⚠️ 你改咗嘅出席狀態只係暫存喺畫面上，仲未存入後台。撳「✅ 確認並儲存點名」先會一次過存入（唔會逐個成員儲存）。
                    </p>
                  )}
                  <div className="row">
                    <button className={btnPrimary} disabled={loading || !loaded || !dirty} onClick={saveRollcall}>
                      ✅ 確認並儲存點名{dirty ? `（${roster.filter(r => r.status).length} 筆）` : ''}
                    </button>
                    <button className={btnGhost} disabled={!loaded} onClick={exportRosterCsv}>📄 匯出 CSV</button>
                    <button className={btnGhost} onClick={printView}>🖨️ 列印</button>
                  </div>
                </>
              )}
            </div>

            {/* ④ 期間統計／匯出 */}
            <section className="card stack">
              <h2 className="text-xl m-0">④ 期間出席檢查、統計與匯出</h2>
              <p className="muted" style={{ margin: 0 }}>揀一段期間，統計各成員出席數字（P／A／L／E／S），並可匯出 CSV。</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label style={{ fontSize: 15 }}>由
                  <input type="date" className={inputCls} value={reportFrom} onChange={e => setReportFrom(e.target.value)} />
                </label>
                <label style={{ fontSize: 15 }}>至
                  <input type="date" className={inputCls} value={reportTo} onChange={e => setReportTo(e.target.value)} />
                </label>
                <label style={{ fontSize: 15 }}>類型
                  <select className={inputCls} value={reportType} onChange={e => setReportType(e.target.value as any)}>
                    <option value="all">全部（集會＋活動）</option>
                    <option value="meeting">恆常集會</option>
                    <option value="activity">旅團活動</option>
                  </select>
                </label>
                <label style={{ fontSize: 15 }}>小隊
                  <select className={inputCls} value={reportPatrol} onChange={e => setReportPatrol(e.target.value)}>
                    <option value="">全部小隊</option>
                    {patrols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="row">
                <button className={btnPrimary} disabled={loading} onClick={loadReport}>{loading ? '載入中...' : '📊 載入統計'}</button>
                <button className={btnGhost} disabled={!matrix} onClick={exportReportCsv}>📄 匯出 CSV</button>
                <button className={btnGhost} onClick={printView}>🖨️ 列印</button>
              </div>

              {!matrix && <p className="muted" style={{ margin: 0 }}>揀好期間後按「載入統計」。</p>}

              {matrix && matrix.columns && matrix.columns.length > 0 && (
                <div className="attendance-table-wrap">
                  <table className="table attendance-matrix">
                    <thead>
                      <tr>
                        {matrix.headers.map((h, i) => <th key={i}>{h}</th>)}
                        <th>P</th><th>A</th><th>L</th><th>E</th><th>S</th><th>出席率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.rows.map((r, i) => {
                        const st = summarizeMatrix(matrix.rows, matrix.columns!)[i];
                        const total = matrix.columns!.length;
                        const rate = total ? Math.round((st.P / total) * 100) + '%' : '—';
                        return (
                          <tr key={i}>
                            {matrix.headers.map((h, j) => {
                              if (j >= 4) {
                                const key = matrix.columns![j - 4]?.key;
                                const val = (r[key] || '') as AttendanceStatus;
                                return <td key={j} className={val ? statusClass(val) : ''} style={{ textAlign: 'center', fontWeight: 800 }}>{val ? statusLabel(val) : '·'}</td>;
                              }
                              return <td key={j}>{h === '支部' ? branchName(r[h] || '') : (r[h] || '')}</td>;
                            })}
                            <td style={{ color: '#15803d', fontWeight: 900 }}>{st.P}</td>
                            <td style={{ color: '#b91c1c', fontWeight: 900 }}>{st.A}</td>
                            <td style={{ color: '#a16207', fontWeight: 900 }}>{st.L}</td>
                            <td style={{ color: '#1d4ed8', fontWeight: 900 }}>{st.E}</td>
                            <td style={{ color: '#7c3aed', fontWeight: 900 }}>{st.S}</td>
                            <td style={{ fontWeight: 900 }}>{rate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {matrix && (!matrix.columns || matrix.columns.length === 0) && (
                <p className="muted" style={{ margin: 0 }}>此期間沒有點名紀錄。</p>
              )}
            </section>

            {/* ⑤ 成員紀錄查詢 */}
            <section className="card stack">
              <h2 className="text-xl m-0">⑤ 成員出席紀錄</h2>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input className={inputCls} style={{ maxWidth: 420 }} value={historyQuery}
                  placeholder="輸入姓名或 YMIS" onChange={e => setHistoryQuery(e.target.value)} />
                <button className={btnPrimary} disabled={loading} onClick={() => {
                  const q = historyQuery.trim();
                  if (!q) return;
                  if (/^\d{10}$/.test(q)) loadHistory({ ymNumber: q });
                  else loadHistory({ name: q });
                }}>查詢</button>
                <button className={btnGhost} onClick={() => { setHistory(null); setHistoryQuery(''); }}>清除</button>
              </div>
              <HistoryView record={history} />
            </section>
          </>
        )}

        {/* ═══════════════════════════ 成員／家長視角 ═══════════════════════════ */}
        {!leader && (
          <section className="card stack">
            <h2 className="text-xl m-0">{isParent ? '👨‍👩‍👧 子女出席紀錄' : '👤 我的出席紀錄'}</h2>
            {isParent && children.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {children.map(c => (
                  <button key={c.id}
                    className={`${btnCls} ${childId === c.id ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    onClick={() => { setChildId(c.id); setBranchId(c.branchId); loadHistory({ memberId: c.id }); }}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            {!history && <p className="muted" style={{ margin: 0 }}>載入出席紀錄中...</p>}
            <HistoryView record={history} />
          </section>
        )}
      </div>
    </Auth>
  );
}

/** 成員出席紀錄（含統計） */
function HistoryView({ record }: { record: MemberAttendanceRecord | null }) {
  if (!record) return null;
  const st = record.stats || { P: 0, A: 0, L: 0, E: 0, S: 0, blank: 0, total: 0 };
  const dates = Object.entries(record.dates || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const marked = st.P + st.A + st.L + st.E + st.S;
  const rate = marked ? Math.round((st.P / marked) * 100) + '%' : '—';

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{record.name}</div>
          <div className="muted">{record.ymNumber} · {branchName(record.branchId)} · {record.patrolName || '無小隊'}</div>
        </div>
        <div className="row">
          <span className="att-chip att-status-P">P {st.P}</span>
          <span className="att-chip att-status-A">A {st.A}</span>
          <span className="att-chip att-status-L">L {st.L}</span>
          <span className="att-chip att-status-E">E {st.E}</span>
          <span className="att-chip att-status-S">S {st.S}</span>
          <span className="att-chip" style={{ background: '#f1f5f9', color: '#33475b', border: '1px solid #e2e8f0' }}>出席率 {rate}</span>
        </div>
      </div>

      {dates.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>暫無出席紀錄。</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
          {dates.map(([d, rec]) => (
            <div key={d} className={`card ${statusClass(rec.status)}`} style={{ padding: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{d}（星期{weekdayLabel(d)}）</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{statusLabel(rec.status)}</div>
              <div className="muted" style={{ fontSize: 13 }}>{rec.sessionType === 'activity' ? '活動' : '集會'}{rec.note ? ` · ${rec.note}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
