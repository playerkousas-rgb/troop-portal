'use client';
import { useMemo, useState } from 'react';

/* ═══════════════════════════════════════════════════
   MOCK 行事曆 —— 對齊用戶要求 #6：
   有權限嘅人唔使跳去管理工具，喺呢一頁直接新增／編輯／刪除／取消。
   （真實版會用同一套版式，改接 apiCreateEvent / apiUpdateEvent / …）
   ═══════════════════════════════════════════════════ */

type Ev = { id: string; title: string; date: string; branch: string; location: string; kind: 'event' | 'meeting' };
type Rule = { id: string; branch: string; weekday: string; time: string; location: string; active: boolean };

const BRANCHES = ['小童軍', '幼童軍', '童軍', '深資', '樂行', '全旅'];
const WEEKDAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

const BRANCH_COLORS: Record<string, string> = {
  '小童軍': '#ff9800', '幼童軍': '#fbc02d', '童軍': '#4caf50', '深資': '#f44336', '樂行': '#2196f3', '全旅': '#9c27b0',
};

const SEED_EVENTS: Ev[] = [
  { id: 'e1', title: '旅團露營', date: '2026-09-20', branch: '全旅', location: '西貢', kind: 'event' },
  { id: 'e2', title: '區運會', date: '2026-10-05', branch: '全旅', location: '九龍公園', kind: 'event' },
  { id: 'e3', title: '親子日營', date: '2026-10-12', branch: '童軍', location: '大埔', kind: 'event' },
];

const SEED_RULES: Rule[] = [
  { id: 'r1', branch: '童軍', weekday: '星期一', time: '19:00-21:00', location: '旅團部', active: true },
  { id: 'r2', branch: '幼童軍', weekday: '星期三', time: '18:00-19:30', location: '旅團部', active: true },
];

const WEEKDAY_INDEX: Record<string, number> = { 星期日: 0, 星期一: 1, 星期二: 2, 星期三: 3, 星期四: 4, 星期五: 5, 星期六: 6 };

const emptyForm = { id: '', title: '', date: '', branch: '全旅', location: '', kind: 'event' as 'event' | 'meeting' };

export default function CalendarPage() {
  const [role, setRole] = useState('parent');
  const [view, setView] = useState<'month' | 'list'>('month');
  const [month, setMonth] = useState(new Date(2026, 8)); // Sep 2026
  const [branchFilter, setBranchFilter] = useState('all');

  const [events, setEvents] = useState<Ev[]>(SEED_EVENTS);
  const [rules, setRules] = useState<Rule[]>(SEED_RULES);
  const [cancelled, setCancelled] = useState<string[]>(['2026-09-15']);

  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [ruleForm, setRuleForm] = useState<Rule | null>(null);
  const [msg, setMsg] = useState('');
  const [formErr, setFormErr] = useState('');

  const isLeader = ['admin', 'group_leader', 'branch_leader', 'coach'].includes(role);

  const year = month.getFullYear();
  const mo = month.getMonth();
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  /* ── 恆常集會展開成每一日 ── */
  const meetingItems = useMemo(() => {
    const out: { date: string; title: string; time: string; branch: string; cancelled: boolean; ruleId: string }[] = [];
    const daysInMonth = new Date(year, mo + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(year, mo, d).getDay();
      rules.filter(r => r.active && WEEKDAY_INDEX[r.weekday] === dow).forEach(r => {
        out.push({ date, title: r.branch + '集會', time: r.time, branch: r.branch, cancelled: cancelled.includes(date), ruleId: r.id });
      });
    }
    return out;
  }, [rules, cancelled, year, mo]);

  function itemsForDay(day: number) {
    const date = `${year}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const items: { title: string; time?: string; branch: string; cancelled?: boolean }[] = [];
    events.filter(e => e.date === date).forEach(e => items.push({ title: e.title, branch: e.branch }));
    meetingItems.filter(m => m.date === date).forEach(m => {
      if (m.cancelled && !isLeader) return; // 成員唔會睇到已取消嘅集會
      items.push({ title: m.title, time: m.time, branch: m.branch, cancelled: m.cancelled });
    });
    return branchFilter === 'all' ? items : items.filter(i => i.branch === branchFilter);
  }

  const listItems = useMemo(() => {
    const daysInMonth = new Date(year, mo + 1, 0).getDate();
    const rows: { date: string; title: string; time?: string; branch: string; cancelled?: boolean; type: 'event' | 'meeting'; id: string; location?: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      events.filter(e => e.date === date && (branchFilter === 'all' || e.branch === branchFilter))
        .forEach(e => rows.push({ date, title: e.title, branch: e.branch, type: 'event', id: e.id, location: e.location }));
      meetingItems.filter(m => m.date === date && (branchFilter === 'all' || m.branch === branchFilter))
        .forEach(m => { if (!m.cancelled || isLeader) rows.push({ date, title: m.title, time: m.time, branch: m.branch, type: 'meeting', id: m.ruleId, cancelled: m.cancelled }); });
    }
    return rows;
  }, [events, meetingItems, branchFilter, year, mo, isLeader]);

  /* ══════════ 管理動作（有權限者先見到按鈕）══════════ */

  function openNew() {
    setFormErr('');
    setForm({ ...emptyForm, date: `${year}-${String(mo + 1).padStart(2, '0')}-01` });
  }
  function openEdit(id: string) {
    const e = events.find(x => x.id === id);
    if (e) { setFormErr(''); setForm({ ...e }); }
  }

  function saveEvent() {
    if (!form) return;
    // 防呆：必填檢查
    if (!form.title.trim()) { setFormErr('請填寫活動名稱。'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) { setFormErr('請選擇日期（YYYY-MM-DD）。'); return; }
    const clean = { ...form, title: form.title.trim(), location: form.location.trim() };
    if (form.id) {
      setEvents(prev => prev.map(e => (e.id === form.id ? clean : e)));
      setMsg(`✅ 已更新「${clean.title}」`);
    } else {
      setEvents(prev => [...prev, { ...clean, id: 'e' + Date.now() }].sort((a, b) => a.date.localeCompare(b.date)));
      setMsg(`✅ 已新增「${clean.title}」（${clean.date}）`);
    }
    setForm(null);
  }

  function deleteEvent(id: string) {
    const e = events.find(x => x.id === id);
    if (!e) return;
    // 防呆：刪除前確認
    if (!window.confirm(`確定刪除「${e.title}」（${e.date}）？刪除後成員就唔會再見到呢個活動。`)) return;
    setEvents(prev => prev.filter(x => x.id !== id));
    setMsg(`🗑 已刪除「${e.title}」`);
  }

  function toggleCancel(date: string, title: string) {
    const isCancelled = cancelled.includes(date);
    if (!isCancelled && !window.confirm(`確定取消 ${date} 嘅${title}？成員嘅行事曆會即時唔再顯示。`)) return;
    setCancelled(prev => (isCancelled ? prev.filter(d => d !== date) : [...prev, date]));
    setMsg(isCancelled ? `↺ 已恢復 ${date} 嘅${title}` : `✕ 已取消 ${date} 嘅${title}`);
  }

  function saveRule() {
    if (!ruleForm) return;
    if (!ruleForm.time.trim()) { setFormErr('請填寫集會時間。'); return; }
    if (ruleForm.id) {
      setRules(prev => prev.map(r => (r.id === ruleForm.id ? ruleForm : r)));
      setMsg(`✅ 已更新 ${ruleForm.branch}集會規則`);
    } else {
      setRules(prev => [...prev, { ...ruleForm, id: 'r' + Date.now() }]);
      setMsg(`✅ 已新增 ${ruleForm.branch}集會規則`);
    }
    setRuleForm(null);
  }

  function deleteRule(id: string) {
    const r = rules.find(x => x.id === id);
    if (!r) return;
    if (!window.confirm(`確定刪除 ${r.branch}（${r.weekday} ${r.time}）嘅恆常集會？`)) return;
    setRules(prev => prev.filter(x => x.id !== id));
    setMsg(`🗑 已刪除 ${r.branch}集會規則`);
  }

  /* ══════════ 版面 ══════════ */

  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const inputCls = 'flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs';

  return (
    <main className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">

      {/* Demo 角色切換 */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[11px] text-slate-500 mr-1">Demo：</span>
        {['parent', 'member', 'branch_leader', 'admin'].map(r => (
          <button key={r} onClick={() => { setRole(r); setMsg(''); }}
            className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {r === 'parent' ? '家長' : r === 'member' ? '成員' : r === 'branch_leader' ? '支部領袖' : '管理員'}
          </button>
        ))}
        {isLeader && <span className="text-[11px] text-emerald-700 font-bold">· 你可直接喺本頁管理</span>}
      </div>

      {/* Header + 直接管理入口 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-bold text-lg m-0">📅 行事曆</h1>
        <div className="flex gap-1.5 items-center">
          {isLeader && (
            <button onClick={openNew} className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-brand-600 text-white">+ 新增活動</button>
          )}
          <button onClick={() => setView('month')} className={`text-[11px] px-2.5 py-1 rounded-lg font-bold ${view === 'month' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>月曆</button>
          <button onClick={() => setView('list')} className={`text-[11px] px-2.5 py-1 rounded-lg font-bold ${view === 'list' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>清單</button>
        </div>
      </div>

      {msg && <div className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">{msg}</div>}

      {/* 支部 filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {[{ id: 'all', label: '全部' }, ...BRANCHES.map(b => ({ id: b, label: b }))].map(b => (
          <button key={b.id} onClick={() => setBranchFilter(b.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap border ${branchFilter === b.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            {b.label}
          </button>
        ))}
      </div>

      {/* 月份 */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-2">
        <button onClick={() => setMonth(new Date(year, mo - 1))} className="text-sm font-bold text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100">← 上月</button>
        <h2 className="font-bold text-sm m-0">{year}年 {monthNames[mo]}</h2>
        <button onClick={() => setMonth(new Date(year, mo + 1))} className="text-sm font-bold text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100">下月 →</button>
      </div>

      {/* ═════ 月曆 ═════ */}
      {view === 'month' && (
        <div className="month-grid">
          {['日', '一', '二', '三', '四', '五', '六'].map(w => <div key={w} className="month-head">{w}</div>)}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="month-cell dim" />;
            const items = itemsForDay(day);
            const isToday = day === 30 && mo === 8;
            return (
              <div key={i} className={`month-cell ${isToday ? 'ring-2 ring-brand-400' : ''}`}>
                <div className="day-num">{day}</div>
                {items.slice(0, 3).map((item, j) => (
                  <div key={j} className={`mini-event ${item.cancelled ? 'cancelled' : ''}`} style={{ borderLeft: `3px solid ${BRANCH_COLORS[item.branch] || '#999'}` }}>
                    {item.time && <span className="text-[11px] opacity-70">{item.time.slice(0, 5)} </span>}
                    {item.title}
                    {item.cancelled && isLeader && <span className="text-[11px] text-rose-600 ml-0.5">取消</span>}
                  </div>
                ))}
                {items.length > 3 && <div className="text-[11px] text-slate-500 text-center">+{items.length - 3}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ═════ 清單（有權限者每項都有 編輯／刪除／取消）═════ */}
      {view === 'list' && (
        <div className="space-y-2">
          {listItems.length === 0 && <p className="text-center text-sm text-slate-500 py-8">此月份暫無活動</p>}
          {listItems.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 card-hover" style={{ borderLeft: `4px solid ${BRANCH_COLORS[item.branch] || '#999'}` }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {item.cancelled && <span className="text-[11px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-bold">已取消</span>}
                  <span className="font-bold text-xs">{item.title}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{item.date} {item.time && `· ${item.time}`} · {item.branch}{item.location ? ` · ${item.location}` : ''}</div>
              </div>
              <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${item.type === 'event' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {item.type === 'event' ? '活動' : '集會'}
              </span>
              {isLeader && (
                <div className="flex gap-1 flex-shrink-0">
                  {item.type === 'event' ? (
                    <>
                      <button onClick={() => openEdit(item.id)} className="text-[11px] text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100" title="編輯">✏️</button>
                      <button onClick={() => deleteEvent(item.id)} className="text-[11px] text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50" title="刪除">🗑</button>
                    </>
                  ) : (
                    <button onClick={() => toggleCancel(item.date, item.title)}
                      className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${item.cancelled ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                      {item.cancelled ? '↺ 恢復' : '✕ 取消呢日'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═════ 恆常集會規則（有權限者直接喺本頁管理）═════ */}
      {isLeader && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm m-0">⚙️ 恆常集會規則</h3>
            <button onClick={() => { setFormErr(''); setRuleForm({ id: '', branch: '童軍', weekday: '星期一', time: '19:00-21:00', location: '旅團部', active: true }); }}
              className="text-[11px] bg-brand-600 text-white px-2.5 py-1 rounded-lg font-bold">+ 新增規則</button>
          </div>
          <div className="space-y-1.5">
            {rules.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BRANCH_COLORS[r.branch] }} />
                  <span className="font-bold text-[11px]">{r.branch}</span>
                  <span className="text-[11px] text-slate-500 truncate">{r.weekday} {r.time} · {r.location}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setFormErr(''); setRuleForm({ ...r }); }} className="text-[11px] text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-200">編輯</button>
                  <button onClick={() => setRules(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x))}
                    className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {r.active ? '啟用' : '停用'}
                  </button>
                  <button onClick={() => deleteRule(r.id)} className="text-[11px] text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50">刪除</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 m-0">💡 個別日子唔使集會：到「清單」視圖按該日集會嘅「✕ 取消呢日」。</p>
        </section>
      )}

      {/* ═════ 活動表單（inline，唔使跳頁）═════ */}
      {form && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm m-0">{form.id ? '✏️ 編輯活動' : '➕ 新增活動'}</h3>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">名稱<input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：旅團露營" /></label>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">日期<input type="date" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">支部
              <select className={inputCls} value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">地點<input className={inputCls} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="例如：西貢" /></label>
            {formErr && <p className="text-[11px] font-bold text-rose-700 bg-rose-50 rounded-lg px-2 py-1.5 m-0">{formErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={saveEvent} className="flex-1 text-[12px] font-bold bg-brand-600 text-white py-2 rounded-xl">儲存</button>
              <button onClick={() => { setForm(null); setFormErr(''); }} className="flex-1 text-[12px] font-bold bg-slate-100 text-slate-600 py-2 rounded-xl">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ═════ 集會規則表單 ═════ */}
      {ruleForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-sm m-0">{ruleForm.id ? '✏️ 編輯集會規則' : '➕ 新增集會規則'}</h3>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">支部
              <select className={inputCls} value={ruleForm.branch} onChange={e => setRuleForm({ ...ruleForm, branch: e.target.value })}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">星期
              <select className={inputCls} value={ruleForm.weekday} onChange={e => setRuleForm({ ...ruleForm, weekday: e.target.value })}>
                {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">時間<input className={inputCls} value={ruleForm.time} onChange={e => setRuleForm({ ...ruleForm, time: e.target.value })} placeholder="19:00-21:00" /></label>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">地點<input className={inputCls} value={ruleForm.location} onChange={e => setRuleForm({ ...ruleForm, location: e.target.value })} placeholder="旅團部" /></label>
            {formErr && <p className="text-[11px] font-bold text-rose-700 bg-rose-50 rounded-lg px-2 py-1.5 m-0">{formErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={saveRule} className="flex-1 text-[12px] font-bold bg-brand-600 text-white py-2 rounded-xl">儲存</button>
              <button onClick={() => { setRuleForm(null); setFormErr(''); }} className="flex-1 text-[12px] font-bold bg-slate-100 text-slate-600 py-2 rounded-xl">取消</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
