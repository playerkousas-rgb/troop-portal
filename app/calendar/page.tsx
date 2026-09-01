'use client';
import { useEffect, useState } from 'react';
import { AppState, loadStateSlice, replyStatus, isMeetingCancelled, RegularMeeting, eventCategory } from '@/lib/store';
import { apiToggleMeetingCancel, apiCreateEvent, apiUpdateEvent, apiDeleteEvent,
  apiCreateRegularMeeting, apiUpdateRegularMeeting, apiDeleteRegularMeeting, apiToggleRegularMeeting,
  apiDeleteMeeting } from '@/lib/api';
import { getSession, Session } from '@/lib/session';
import { publicViewEnabled } from '@/lib/model';
import PublicLocked from '@/components/ui/PublicLocked';
import Link from 'next/link';
import { useConfirm, kv } from '@/components/ConfirmProvider';

/* ═══════════════════════════════════════════════════
   行事曆 —— MOCK 乾淨版式 + 真實後台
   ★ 領袖唔使跳去管理工具：喺本頁直接新增／編輯／刪除
     日曆項目（活動）、恆常集會規則、按日取消／恢復。
   ═══════════════════════════════════════════════════ */

const BRANCH_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'troop', label: '全旅' },
  { id: 'b1', label: '小童軍' },
  { id: 'b2', label: '幼童軍' },
  { id: 'b3', label: '童軍' },
  { id: 'b4', label: '深資' },
  { id: 'b5', label: '樂行' },
];

const TYPE_OPTIONS = [
  { id: 'all', label: '全部類型' },
  { id: 'event', label: '活動' },
  { id: 'meeting', label: '恆常集會' },
  { id: 'oneoff', label: '會議' },
];

const BRANCH_COLORS: Record<string, string> = {
  b1: '#ff9800', b2: '#fbc02d', b3: '#4caf50', b4: '#f44336', b5: '#2196f3', troop: '#9c27b0',
};
const getDotColor = (bid?: string) => BRANCH_COLORS[bid || 'troop'] || BRANCH_COLORS.troop;

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x }
function matchFrequency(r: any, d: Date) {
  if (d.getDay() !== Number(r.weekday)) return false;
  if (r.frequency === 'biweekly') {
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    if (weekNum % 2 !== 0) return false;
  } else if (r.frequency?.startsWith('monthly_')) {
    const weekOfMonth = Math.ceil(d.getDate() / 7);
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const isLastWeek = d.getDate() > lastDayOfMonth - 7;
    if (r.frequency === 'monthly_1' && weekOfMonth !== 1) return false;
    if (r.frequency === 'monthly_2' && weekOfMonth !== 2) return false;
    if (r.frequency === 'monthly_3' && weekOfMonth !== 3) return false;
    if (r.frequency === 'monthly_4' && weekOfMonth !== 4) return false;
    if (r.frequency === 'monthly_last' && !isLastWeek) return false;
  }
  return true;
}

const emptyForm = { id: '', title: '', date: '', kind: 'activity' as 'activity', scope: 'troop', branchId: 'troop', location: '', fee: '', paymentUrl: '', dutyPatrol: '', calendarTag: '', category: 'self' as 'self' | 'district' };
const emptyRule = { id: '', branchId: 'b3', title: '', weekday: '1', frequency: 'weekly', startTime: '19:00', endTime: '21:00', location: '', enabled: true };

export default function Calendar() {
  const [s, setS] = useState<AppState | null>(null);
  const [session, setSessionState] = useState<Session | null>(undefined);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [view, setView] = useState<'month' | 'list'>('month');
  const [base, setBase] = useState(new Date());
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [child, setChild] = useState('all');
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [ruleForm, setRuleForm] = useState<typeof emptyRule | null>(null);
  const [formErr, setFormErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => {
    loadStateSlice(['users', 'members', 'events', 'regularMeetings', 'cancelledMeetings', 'meetings', 'replies', 'config'])
      .then(setS).catch(e => setErr(e.message));
    setSessionState(getSession());
  }, []);

  async function reload() {
    try { setS(await loadStateSlice(['users', 'members', 'events', 'regularMeetings', 'cancelledMeetings', 'meetings', 'replies', 'config'])); }
    catch (e: any) { setErr(e.message) }
  }

  const year = base.getFullYear(), mo = base.getMonth();
  const first = new Date(year, mo, 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d });

  if (session === undefined) return <main className="max-w-4xl mx-auto px-4 py-8 pb-24 text-sm text-slate-600">載入中...</main>;
  if (err && !s) return <main className="max-w-4xl mx-auto px-4 py-8 pb-24"><p className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 font-bold m-0 whitespace-pre-wrap">{err}</p></main>;
  if (!s) return <main className="max-w-4xl mx-auto px-4 py-8 pb-24 text-sm text-slate-600">載入中...</main>;

  const role = session?.role;
  const isLeader = !!role && ['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader', 'coach'].includes(role);
  const canCancel = !!role && ['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader'].includes(role);
  const parent = role === 'parent' ? s.users.find(u => u.id === session.userId) : null;
  const children = parent ? (s.members || []).filter(m => (parent.childMemberIds || []).includes(m.id) || m.parentUserId === parent.id) : [];

  // ===== 公開（未登入） =====
  if (!session) {
    if (!publicViewEnabled(s.config)) return <PublicLocked troopName={s.config?.TROOP_NAME} />;
    const pubEvents = (s.events || []).filter(e => e.status === 'published');
    const pubMeetings = (s.meetings || []).filter(m => m.status === 'published');
    const pubRules = (s.regularMeetings || []).filter(r => r.enabled);
    return (
      <main className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="font-bold text-xl m-0">📅 旅團行事曆</h1>
          <Link href="/login" className="text-sm font-bold bg-brand-600 text-white px-3 py-2 rounded-xl no-underline hover:bg-brand-700 transition">登入</Link>
        </div>
        <p className="text-sm text-slate-500 m-0 -mt-2">登入後可查看個人化行事曆及回覆活動。</p>
        <Chips options={BRANCH_OPTIONS} value={filterBranch} onChange={setFilterBranch} />
        <Chips options={TYPE_OPTIONS} value={filterType} onChange={setFilterType} />
        <MonthNav year={year} mo={mo} onPrev={() => setBase(addMonths(base, -1))} onNext={() => setBase(addMonths(base, 1))} />
        <MonthGrid
          days={days} base={base} year={year} mo={mo}
          events={pubEvents} meetings={pubMeetings} rules={pubRules}
          cancelledMeetings={s.cancelledMeetings || []}
          filterBranch={filterBranch} filterType={filterType} isLeader={false}
        />
      </main>
    );
  }

  // ===== 已登入 =====
  const myMember = role === 'member' ? s.members.find(x => x.id === session.memberId) : null;
  function visibleEvent(e: any) {
    if (role === 'member') return !!myMember && e.targetMemberIds.includes(myMember.id) && replyStatus(s, e.id, myMember.id)?.type !== 'declined';
    if (role === 'parent' && children.length > 0) return children.some(c => e.targetMemberIds.includes(c.id));
    return true;
  }
  const pubEvents = (s.events || []).filter(e => e.status === 'published').filter(visibleEvent);

  function rightForEvent(e: any) {
    if (isLeader) {
      const targets = (s.members || []).filter(m => e.targetMemberIds.includes(m.id));
      const counts: any = { registered: 0, interested: 0, declined: 0, unresponded: 0 };
      targets.forEach(m => { const r = replyStatus(s, e.id, m.id); counts[r?.type || 'unresponded']++ });
      return `✅${counts.registered} ❤️${counts.interested} ⚠️${counts.unresponded}`;
    }
    if (role === 'parent') {
      const cs = (child === 'all' ? children : children.filter(c => c.id === child)).filter(c => e.targetMemberIds.includes(c.id));
      const ic = (t?: string) => t === 'registered' ? '✅' : t === 'declined' ? '❌' : t === 'interested' ? '❤️' : '';
      return cs.map(c => `${child === 'all' ? c.name + ' ' : ''}${ic(replyStatus(s, e.id, c.id)?.type) || '·'}`).join('  ') || '—';
    }
    if (role === 'member') { const r = replyStatus(s, e.id, myMember?.id || ''); return `${r?.type === 'registered' ? '✅' : r?.type === 'interested' ? '❤️' : r?.type === 'declined' ? '❌' : '·'} ${r?.type === 'interested' ? '等待家長確認' : ''}` }
    return '';
  }

  /* ── 管理動作（真實後台） ── */
  async function saveEvent() {
    if (!form) return;
    if (!form.title.trim()) { setFormErr('請填寫活動名稱。'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) { setFormErr('請選擇日期（YYYY-MM-DD）。'); return; }
    if (form.date && !form.calendarTag.trim()) { setFormErr('此項目有日期，請加入「行事曆標籤」以便加入行事曆。'); return; }
    const ok = await confirm({
      title: form.id ? '確認更新日曆項目' : '確認新增日曆項目',
      message: kv([
        ['名稱', form.title.trim()],
        ['分類', form.category === 'district' ? '區地域總會活動' : '自行舉辦'],
        ['日期', form.date],
        ['行事曆標籤', form.calendarTag],
        ['支部', BRANCH_OPTIONS.find(b => b.id === form.branchId)?.label || form.branchId],
        ['地點', form.location],
        ['費用', form.fee],
      ]),
      confirmLabel: form.id ? '確認更新' : '確認新增並發布',
    });
    if (!ok) return;
    setLoading(true); setErr('');
    try {
      if (form.id) {
        await apiUpdateEvent({ eventId: form.id, title: form.title.trim(), date: form.date, location: form.location, scope: form.scope, branchId: form.branchId, fee: form.fee, paymentUrl: form.paymentUrl, dutyPatrol: form.dutyPatrol, calendarTag: form.calendarTag, category: form.category });
        setMsg(`✅ 已更新「${form.title.trim()}」`);
      } else {
        await apiCreateEvent({ title: form.title.trim(), scope: form.scope, branchId: form.branchId, date: form.date, location: form.location, fee: form.fee, paymentUrl: form.paymentUrl, dutyPatrol: form.dutyPatrol, calendarTag: form.calendarTag, category: form.category, status: 'published', source: form.category === 'district' ? '區地域總會活動' : '自行舉辦' });
        setMsg(`✅ 已新增並發布「${form.title.trim()}」（${form.date}）`);
      }
      setForm(null);
      await reload();
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  async function deleteEvent(id: string, title: string) {
    const ok = await confirm({ title: '確認刪除日曆項目', message: kv([['活動', title]]), confirmLabel: '確認刪除', danger: true });
    if (!ok) return;
    setLoading(true); setErr('');
    try { await apiDeleteEvent(id); setMsg(`🗑 已刪除「${title}」`); await reload(); }
    catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  async function saveRule() {
    if (!ruleForm) return;
    if (!ruleForm.title.trim()) { setFormErr('請填寫集會名稱。'); return; }
    const ok = await confirm({
      title: ruleForm.id ? '確認更新集會規則' : '確認新增集會規則',
      message: kv([
        ['名稱', ruleForm.title.trim()],
        ['支部', BRANCH_OPTIONS.find(b => b.id === ruleForm.branchId)?.label || ruleForm.branchId],
        ['星期', WEEKDAY_NAMES[Number(ruleForm.weekday) || 0]],
        ['時間', `${ruleForm.startTime}-${ruleForm.endTime}`],
        ['地點', ruleForm.location],
      ]),
      confirmLabel: ruleForm.id ? '確認更新' : '確認新增',
    });
    if (!ok) return;
    setLoading(true); setErr('');
    try {
      const p = { branchId: ruleForm.branchId, title: ruleForm.title.trim(), weekday: ruleForm.weekday, frequency: ruleForm.frequency, startTime: ruleForm.startTime, endTime: ruleForm.endTime, location: ruleForm.location };
      if (ruleForm.id) {
        await apiUpdateRegularMeeting({ meetingId: ruleForm.id, ...p });
        setMsg(`✅ 已更新「${ruleForm.title.trim()}」集會規則`);
      } else {
        await apiCreateRegularMeeting(p);
        setMsg(`✅ 已新增「${ruleForm.title.trim()}」集會規則`);
      }
      setRuleForm(null);
      await reload();
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  async function deleteRule(id: string, title: string) {
    const ok = await confirm({ title: '確認刪除集會規則', message: kv([['集會', title]]), confirmLabel: '確認刪除', danger: true });
    if (!ok) return;
    setLoading(true); setErr('');
    try { await apiDeleteRegularMeeting(id); setMsg(`🗑 已刪除「${title}」`); await reload(); }
    catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  async function toggleRule(r: RegularMeeting) {
    const ok = await confirm({
      title: r.enabled ? '確認停用集會規則' : '確認啟用集會規則',
      message: kv([['集會', r.title], ['變更後狀態', r.enabled ? '🔴 停用' : '🟢 啟用']]),
      confirmLabel: '確認',
    });
    if (!ok) return;
    setLoading(true); setErr('');
    try { await apiToggleRegularMeeting(r.id); setMsg(r.enabled ? `⏸ 已停用「${r.title}」` : `▶️ 已啟用「${r.title}」`); await reload(); }
    catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  async function cancelDay(branchId: string, date: string, title: string, type: 'cancelled' | 'recess' = 'cancelled') {
    const cancelled = !!s.cancelledMeetings.find(c => c.branchId === branchId && c.date === date);
    if (!cancelled) {
      const ok = await confirm({ title: '確認取消該日集會', message: kv([['日期', date], ['集會', title], ['注意', '成員的行事曆會即時不再顯示']]), confirmLabel: '確認取消', danger: true });
      if (!ok) return;
    }
    setLoading(true); setErr('');
    try { await apiToggleMeetingCancel(branchId, date, '領袖標記', type); setMsg(cancelled ? `↺ 已恢復 ${date} 嘅「${title}」` : `✕ 已${type === 'recess' ? '休會' : '取消'} ${date} 嘅「${title}」`); await reload(); }
    catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  async function deleteMeeting(id: string, title: string) {
    const ok = await confirm({ title: '確認刪除會議', message: kv([['會議', title]]), confirmLabel: '確認刪除', danger: true });
    if (!ok) return;
    setLoading(true); setErr('');
    try { await apiDeleteMeeting(id); setMsg(`🗑 已刪除「${title}」`); await reload(); }
    catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  const inputCls = 'flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm min-w-0';
  const labelCls = 'flex items-center gap-2 text-sm font-bold text-slate-600';

  return (
    <main className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">

      {/* Header + 直接管理入口 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-bold text-xl m-0">📅 行事曆</h1>
        <div className="flex gap-1.5 items-center">
          {isLeader && (
            <button onClick={() => { setFormErr(''); setForm({ ...emptyForm, date: `${year}-${String(mo + 1).padStart(2, '0')}-01` }); }}
              className="text-sm px-3 py-1.5 rounded-lg font-bold bg-brand-600 text-white border-0 cursor-pointer hover:bg-brand-700 transition">+ 新增日曆項目</button>
          )}
          <button onClick={() => setView('month')} className={`text-sm px-3 py-1.5 rounded-lg font-bold border ${view === 'month' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'}`}>月曆</button>
          <button onClick={() => setView('list')} className={`text-sm px-3 py-1.5 rounded-lg font-bold border ${view === 'list' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'}`}>清單</button>
        </div>
      </div>
      <p className="text-sm text-slate-500 m-0 -mt-2">
        {role === 'member' ? '我的行事曆' : role === 'parent' ? '子女行事曆' : '領袖行事曆'}——月曆為主、清單為輔。
        {isLeader && ' 你可以直接喺本頁新增／編輯／刪除。'}
      </p>

      {msg && <div className="text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">{msg}</div>}
      {err && <div className="text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-3 py-2 whitespace-pre-wrap">{err}</div>}

      {/* 子女切換（家長） */}
      {role === 'parent' && children.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          <button onClick={() => setChild('all')} className={`text-sm px-2.5 py-1 rounded-full font-bold whitespace-nowrap border ${child === 'all' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>全部子女</button>
          {children.map(c => (
            <button key={c.id} onClick={() => setChild(c.id)} className={`text-sm px-2.5 py-1 rounded-full font-bold whitespace-nowrap border ${child === c.id ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>{c.name}</button>
          ))}
        </div>
      )}

      {/* 篩選 chips */}
      <Chips options={TYPE_OPTIONS} value={filterType} onChange={setFilterType} />
      <Chips options={BRANCH_OPTIONS} value={filterBranch} onChange={setFilterBranch} />

      <MonthNav year={year} mo={mo} onPrev={() => setBase(addMonths(base, -1))} onNext={() => setBase(addMonths(base, 1))} />

      {/* ═════ 月曆 ═════ */}
      {view === 'month' && (
        <MonthGrid
          days={days} base={base} year={year} mo={mo}
          events={pubEvents} meetings={(s.meetings || []).filter(m => m.status === 'published')} rules={(s.regularMeetings || []).filter(r => r.enabled)}
          cancelledMeetings={s.cancelledMeetings || []}
          filterBranch={filterBranch} filterType={filterType} isLeader={!!isLeader} canCancel={!!canCancel}
          role={role} myBranch={myMember?.branchId}
        />
      )}

      {/* ═════ 清單（有權限者每項有 編輯／刪除／取消）═════ */}
      {view === 'list' && (
        <div className="space-y-2">
          {(() => {
            const rows: any[] = [];
            pubEvents.forEach(e => rows.push({ type: 'event', date: e.date, title: e.title, branchId: e.branchId, event: e, location: e.location }));
            (s.meetings || []).filter(m => m.status === 'published').forEach(m => {
              if (role === 'member' && myMember && m.branchId && m.branchId !== myMember.branchId) return;
              rows.push({ type: 'oneoff', date: m.date, title: m.title, branchId: m.branchId || 'troop', meeting: m, time: `${m.startTime || ''}${m.endTime ? '-' + m.endTime : ''}`, location: m.location });
            });
            (s.regularMeetings || []).filter(r => r.enabled).forEach(r => {
              for (let i = -30; i < 60; i++) {
                const d = new Date(base); d.setDate(d.getDate() + i);
                if (!matchFrequency(r, d)) continue;
                const date = ymd(d);
                const cancelInfo: any = (s.cancelledMeetings || []).find(c => c.branchId === r.branchId && c.date === date);
                if (cancelInfo && role === 'member') continue;
                rows.push({ type: 'meeting', date, title: r.title, branchId: r.branchId, rule: r, cancelled: !!cancelInfo, cancelType: cancelInfo?.type, time: `${r.startTime}-${r.endTime}`, location: r.location });
              }
            });
            const filtered = rows.filter(r => {
              if (filterBranch !== 'all') { const bid = r.branchId || 'troop'; if (filterBranch === 'troop' && bid !== 'troop' && bid !== '') return false; if (filterBranch !== 'troop' && bid !== filterBranch) return false; }
              if (filterType !== 'all' && r.type !== filterType) return false;
              return true;
            }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 60);
            if (filtered.length === 0) return <p className="text-center text-sm text-slate-500 py-8">此範圍暫無項目</p>;
            return filtered.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 card-hover" style={{ borderLeft: `4px solid ${getDotColor(item.branchId)}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.cancelled && <span className="text-sm bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">{item.cancelType === 'recess' ? '休會' : '已取消'}</span>}
                    <span className="font-bold text-sm">{item.title}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">{item.date}{item.time ? ` · ${item.time}` : ''} · {BRANCH_OPTIONS.find(b => b.id === item.branchId)?.label || item.branchId}{item.location ? ` · ${item.location}` : ''}{item.event?.fee ? ` · ${item.event.fee}` : ''}</div>
                </div>
                {item.type === 'event'
                  ? <span className="text-sm whitespace-nowrap text-slate-600">{rightForEvent(item.event)}</span>
                  : <span className={`text-sm px-1.5 py-0.5 rounded font-bold ${item.cancelled ? 'bg-rose-100 text-rose-700' : item.type === 'oneoff' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.cancelled ? (item.cancelType === 'recess' ? '休會' : '取消') : item.type === 'oneoff' ? '會議' : '集會'}</span>}
                {isLeader && (
                  <div className="flex gap-1 flex-shrink-0">
                    {item.type === 'event' ? (
                      <>
                        <button onClick={() => { setFormErr(''); setForm({ id: item.event.id, title: item.event.title, date: item.event.date, kind: 'activity', scope: item.event.scope || 'troop', branchId: item.event.branchId || 'troop', location: item.event.location || '', fee: item.event.fee || '', paymentUrl: item.event.paymentUrl || '', dutyPatrol: item.event.dutyPatrol || '', calendarTag: item.event.calendarTag || '', category: eventCategory(item.event) }); }} className="text-sm text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 border-0 bg-transparent cursor-pointer" title="編輯">✏️</button>
                        <button onClick={() => deleteEvent(item.event.id, item.event.title)} className="text-sm text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 border-0 bg-transparent cursor-pointer" title="刪除">🗑</button>
                      </>
                    ) : item.type === 'oneoff' ? (
                      <button onClick={() => deleteMeeting(item.meeting.id, item.meeting.title)} className="text-sm text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 border-0 bg-transparent cursor-pointer" title="刪除">🗑</button>
                    ) : (
                      <button onClick={() => cancelDay(item.rule.branchId, item.date, item.rule.title, item.cancelled ? 'cancelled' : 'cancelled')}
                        className={`text-sm px-1.5 py-0.5 rounded font-bold border-0 cursor-pointer ${item.cancelled ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                        {item.cancelled ? '↺ 恢復' : '✕ 取消呢日'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {/* ═════ 恆常集會規則（領袖直接喺本頁管理）═════ */}
      {isLeader && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm m-0">⚙️ 恆常集會規則</h3>
            <button onClick={() => { setFormErr(''); setRuleForm({ ...emptyRule, branchId: myMember?.branchId || 'b3' }); }}
              className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg font-bold border-0 cursor-pointer hover:bg-brand-700 transition">+ 新增規則</button>
          </div>
          <div className="space-y-1.5">
            {(s.regularMeetings || []).map(r => (
              <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getDotColor(r.branchId) }} />
                  <span className="font-bold text-sm">{BRANCH_OPTIONS.find(b => b.id === r.branchId)?.label || r.branchId}</span>
                  <span className="text-sm text-slate-500 truncate">{r.title} · {WEEKDAY_NAMES[Number(r.weekday) || 0]} {r.startTime}-{r.endTime} · {r.location || '待定'}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setFormErr(''); setRuleForm({ id: r.id, branchId: r.branchId, title: r.title, weekday: String(r.weekday ?? 1), frequency: r.frequency || 'weekly', startTime: r.startTime, endTime: r.endTime, location: r.location || '', enabled: r.enabled }); }} className="text-sm text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-200 border-0 bg-transparent cursor-pointer">編輯</button>
                  <button onClick={() => toggleRule(r)} disabled={loading}
                    className={`text-sm px-1.5 py-0.5 rounded font-bold border-0 cursor-pointer disabled:opacity-60 ${r.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {r.enabled ? '啟用' : '停用'}
                  </button>
                  <button onClick={() => deleteRule(r.id, r.title)} className="text-sm text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 border-0 bg-transparent cursor-pointer">刪除</button>
                </div>
              </div>
            ))}
            {(s.regularMeetings || []).length === 0 && <p className="text-sm text-slate-500 m-0 py-2">暫無恆常集會規則。</p>}
          </div>
          <p className="text-sm text-slate-500 m-0">💡 個別日子唔使集會：到「清單」視圖按該日集會嘅「✕ 取消呢日」。成員唔會睇到已取消嘅集會。</p>
        </section>
      )}

      {/* ═════ 活動表單（inline modal，唔使跳頁）═════ */}
      {form && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base m-0">{form.id ? '✏️ 編輯日曆項目' : '➕ 新增日曆項目'}</h3>
            <label className={labelCls}>名稱<input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：旅團露營" /></label>
            <label className={labelCls}>日期<input type="date" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label className={labelCls}>支部
              <select className={inputCls} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>
                {BRANCH_OPTIONS.filter(b => b.id !== 'all').map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </label>
            <label className={labelCls}>地點<input className={inputCls} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="例如：西貢" /></label>
            <label className={labelCls}>分類
              <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}>
                <option value="self">🏠 自行舉辦</option>
                <option value="district">🗺️ 區地域總會活動</option>
              </select>
            </label>
            <label className={labelCls}>費用<input className={inputCls} value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} placeholder="例如：$50（可留空）" /></label>
            <label className={labelCls}>付款連結<input className={inputCls} value={form.paymentUrl} onChange={e => setForm({ ...form, paymentUrl: e.target.value })} placeholder="https://…（可留空）" /></label>
            <label className={labelCls}>當值小隊<input className={inputCls} value={form.dutyPatrol} onChange={e => setForm({ ...form, dutyPatrol: e.target.value })} placeholder="例如：海狸小隊（可留空）" /></label>
            <label className={labelCls}>行事曆標籤 🏷️<input className={inputCls} value={form.calendarTag} onChange={e => setForm({ ...form, calendarTag: e.target.value })} placeholder="例如：露營／服務／訓練" /></label>
            <p className="text-sm text-slate-500 m-0">💡 有日期的項目請加入「行事曆標籤」。對象＝支部全員（scope 全旅／支部會自動帶出成員名單）。儲存即發布，成員即時見到。</p>
            {formErr && <p className="text-sm font-bold text-rose-700 bg-rose-50 rounded-lg px-2.5 py-2 m-0">{formErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={saveEvent} disabled={loading} className="flex-1 text-sm font-bold bg-brand-600 text-white py-2.5 rounded-xl border-0 cursor-pointer disabled:opacity-60">{loading ? '儲存中…' : '儲存並發布'}</button>
              <button onClick={() => { setForm(null); setFormErr(''); }} className="flex-1 text-sm font-bold bg-slate-100 text-slate-600 py-2.5 rounded-xl border-0 cursor-pointer">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ═════ 集會規則表單 ═════ */}
      {ruleForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base m-0">{ruleForm.id ? '✏️ 編輯集會規則' : '➕ 新增集會規則'}</h3>
            <label className={labelCls}>名稱<input className={inputCls} value={ruleForm.title} onChange={e => setRuleForm({ ...ruleForm, title: e.target.value })} placeholder="例如：恆常集會" /></label>
            <label className={labelCls}>支部
              <select className={inputCls} value={ruleForm.branchId} onChange={e => setRuleForm({ ...ruleForm, branchId: e.target.value })}>
                {BRANCH_OPTIONS.filter(b => b.id !== 'all').map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </label>
            <label className={labelCls}>星期
              <select className={inputCls} value={ruleForm.weekday} onChange={e => setRuleForm({ ...ruleForm, weekday: e.target.value })}>
                {WEEKDAY_NAMES.map((d, i) => <option key={d} value={String(i)}>{d}</option>)}
              </select>
            </label>
            <label className={labelCls}>頻率
              <select className={inputCls} value={ruleForm.frequency} onChange={e => setRuleForm({ ...ruleForm, frequency: e.target.value })}>
                <option value="weekly">每週</option>
                <option value="biweekly">隔週</option>
                <option value="monthly_1">每月第 1 個同星期</option>
                <option value="monthly_2">每月第 2 個同星期</option>
                <option value="monthly_3">每月第 3 個同星期</option>
                <option value="monthly_4">每月第 4 個同星期</option>
                <option value="monthly_last">每月最後一個同星期</option>
              </select>
            </label>
            <div className="flex gap-2">
              <label className={`${labelCls} flex-1`}>開始<input type="time" className={inputCls} value={ruleForm.startTime} onChange={e => setRuleForm({ ...ruleForm, startTime: e.target.value })} /></label>
              <label className={`${labelCls} flex-1`}>結束<input type="time" className={inputCls} value={ruleForm.endTime} onChange={e => setRuleForm({ ...ruleForm, endTime: e.target.value })} /></label>
            </div>
            <label className={labelCls}>地點<input className={inputCls} value={ruleForm.location} onChange={e => setRuleForm({ ...ruleForm, location: e.target.value })} placeholder="例如：本中心" /></label>
            {formErr && <p className="text-sm font-bold text-rose-700 bg-rose-50 rounded-lg px-2.5 py-2 m-0">{formErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={saveRule} disabled={loading} className="flex-1 text-sm font-bold bg-brand-600 text-white py-2.5 rounded-xl border-0 cursor-pointer disabled:opacity-60">{loading ? '儲存中…' : '儲存'}</button>
              <button onClick={() => { setRuleForm(null); setFormErr(''); }} className="flex-1 text-sm font-bold bg-slate-100 text-slate-600 py-2.5 rounded-xl border-0 cursor-pointer">取消</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── 篩選 chips ── */
function Chips({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`text-sm px-2.5 py-1 rounded-full font-bold whitespace-nowrap border cursor-pointer ${value === o.id ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MonthNav({ year, mo, onPrev, onNext }: { year: number; mo: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-2">
      <button onClick={onPrev} className="text-sm font-bold text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 border-0 bg-transparent cursor-pointer">← 上月</button>
      <h2 className="font-bold text-sm m-0">{year}年 {MONTH_NAMES[mo]}</h2>
      <button onClick={onNext} className="text-sm font-bold text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 border-0 bg-transparent cursor-pointer">下月 →</button>
    </div>
  );
}

function MonthGrid(props: {
  days: Date[]; base: Date; year: number; mo: number;
  events: any[]; meetings: any[]; rules: any[]; cancelledMeetings: any[];
  filterBranch: string; filterType: string; isLeader: boolean; canCancel?: boolean;
  role?: string; myBranch?: string;
}) {
  const { days, base, events, meetings, rules, cancelledMeetings, filterBranch, filterType, isLeader, role, myBranch } = props;
  return (
    <div className="month-grid">
      {['日', '一', '二', '三', '四', '五', '六'].map(w => <div key={w} className="month-head">{w}</div>)}
      {days.map((d, i) => {
        const date = ymd(d);
        const items: { title: string; time?: string; branchId?: string; cancelled?: boolean; type: string }[] = [];
        events.filter(e => e.date === date).forEach((e: any) => items.push({ type: 'event', title: e.title, branchId: e.branchId }));
        meetings.filter((m: any) => m.date === date && (!role || role !== 'member' || !myBranch || !m.branchId || m.branchId === myBranch)).forEach((m: any) => items.push({ type: 'oneoff', time: m.startTime, title: m.title, branchId: m.branchId || 'troop' }));
        rules.forEach((r: any) => {
          if (matchFrequency(r, d)) {
            const cancelInfo: any = cancelledMeetings.find((c: any) => c.branchId === r.branchId && c.date === date);
            if (cancelInfo && role === 'member') return;
            items.push({ type: 'meeting', time: r.startTime, title: r.title, branchId: r.branchId, cancelled: !!cancelInfo });
          }
        });
        const filtered = items.filter(it => {
          if (filterBranch !== 'all') { const bid = it.branchId || 'troop'; if (filterBranch === 'troop' && bid !== 'troop' && bid !== '') return false; if (filterBranch !== 'troop' && bid !== filterBranch) return false; }
          if (filterType !== 'all' && it.type !== filterType) return false;
          return true;
        });
        return (
          <div key={i} className={`month-cell ${d.getMonth() !== base.getMonth() ? 'dim' : ''}`}>
            <div className="day-num">{d.getDate()}</div>
            {filtered.slice(0, 3).map((it, j) => (
              <div key={j} className={`mini-event ${it.cancelled ? 'cancelled' : ''}`} style={{ borderLeft: `3px solid ${getDotColor(it.branchId)}` }}>
                {it.time && <span className="text-sm opacity-70">{it.time} </span>}
                {it.title}
                {it.cancelled && isLeader && <span className="text-sm text-rose-600 ml-0.5">{'取消'}</span>}
              </div>
            ))}
            {filtered.length > 3 && <div className="text-sm text-slate-500 text-center">+{filtered.length - 3}</div>}
          </div>
        );
      })}
    </div>
  );
}
