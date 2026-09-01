'use client';
import { useMemo, useState } from 'react';

/* ═══════════════════════════════════════════════════
   MOCK 行事曆 —— 對齊用戶要求 #6：
   有權限嘅人唔使跳去管理工具，喺呢一頁直接新增／編輯／刪除／取消。
   （真實版會用同一套版式，改接 apiCreateEvent / apiUpdateEvent / …）
   ═══════════════════════════════════════════════════ */

type Ev = { id: string; title: string; date: string; time: string; branch: string; location: string; kind: 'event' | 'meeting'; tag: string; audience: string };
type Rule = { id: string; branch: string; weekday: string; time: string; location: string; active: boolean };

const BRANCHES = ['小童軍', '幼童軍', '童軍', '深資', '樂行', '全旅'];
const WEEKDAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

const BRANCH_COLORS: Record<string, string> = {
  '小童軍': '#ff9800', '幼童軍': '#fbc02d', '童軍': '#4caf50', '深資': '#f44336', '樂行': '#2196f3', '全旅': '#9c27b0',
};

const SEED_EVENTS: Ev[] = [
  { id: 'e1', title: '旅團露營', date: '2026-09-20', time: '09:00', branch: '全旅', location: '西貢', kind: 'event', tag: '活動', audience: '全旅' },
  { id: 'e2', title: '區運會', date: '2026-10-05', time: '10:00', branch: '全旅', location: '九龍公園', kind: 'event', tag: '活動', audience: '幼童軍、童軍' },
  { id: 'e3', title: '親子日營', date: '2026-10-12', time: '09:00', branch: '童軍', location: '大埔', kind: 'event', tag: '活動', audience: '童軍及家長' },
  { id: 'e4', title: '旅務會議', date: '2026-09-12', time: '20:00-21:30', branch: '領袖', location: '旅團部', kind: 'meeting', tag: '會議', audience: '領袖' },
];

/** 預設分類標籤（團長／管理員可以加新標籤，純粹幫佢哋分類同篩選） */
const DEFAULT_TAGS = ['恆常集會', '活動', '會議'];

const SEED_RULES: Rule[] = [
  { id: 'r1', branch: '童軍', weekday: '星期一', time: '19:00-21:00', location: '旅團部', active: true },
  { id: 'r2', branch: '幼童軍', weekday: '星期三', time: '18:00-19:30', location: '旅團部', active: true },
];

const WEEKDAY_INDEX: Record<string, number> = { 星期日: 0, 星期一: 1, 星期二: 2, 星期三: 3, 星期四: 4, 星期五: 5, 星期六: 6 };

const emptyForm = { id: '', title: '', date: '', time: '', branch: '全旅', location: '', kind: 'event' as 'event' | 'meeting', tag: '活動', audience: '全旅' };

export default function CalendarPage() {
  const [role, setRole] = useState('parent');
  const [view, setView] = useState<'month' | 'list'>('month');
  const [month, setMonth] = useState(new Date(2026, 8)); // Sep 2026
  const [branchFilter, setBranchFilter] = useState('all');
  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS);
  const [tagFilter, setTagFilter] = useState('all');
  const [newTag, setNewTag] = useState('');

  const [events, setEvents] = useState<Ev[]>(SEED_EVENTS);
  const [rules, setRules] = useState<Rule[]>(SEED_RULES);
  const [cancelled, setCancelled] = useState<string[]>(['2026-09-15']);

  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [ruleForm, setRuleForm] = useState<Rule | null>(null);
  const [msg, setMsg] = useState('');
  const [formErr, setFormErr] = useState('');

  const isLeader = ['admin', 'group_leader', 'branch_leader', 'coach'].includes(role);

  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const year = month.getFullYear();
  const mo = month.getMonth();

  /* ── 匯出 / 同步 Google 日曆（對照用戶問題 #10）── */
  // 真實版會提供「訂閱網址（ICS）」：成員喺 Google 日曆「其他日曆 → 從網址新增」貼上即可自動同步；
  // MOCK 版先用 UI 展示呢個能力（ICS 內容由前端即時生成）。
  function icsHref() {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ScoutSystem//TW//',
      ...events.map(e => [
        'BEGIN:VEVENT',
        `UID:${e.id}@scout-system.demo`,
        `DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`,
        `SUMMARY:${e.title} (${e.branch})`,
        `LOCATION:${e.location || ''}`,
        'END:VEVENT',
      ].join('\n')),
      'END:VCALENDAR',
    ].join('\n');
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines)}`;
  }

  function copySubscribe() {
    const sub = 'https://troop-portal.example/api/calendar.ics?troop=0088&role=' + role;
    if (navigator.clipboard) navigator.clipboard.writeText(sub).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
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
    events.filter(e => e.date === date && (tagFilter === 'all' || e.tag === tagFilter)).forEach(e => items.push({ title: e.title, time: e.time, branch: e.branch }));
    if (tagFilter === 'all' || tagFilter === '恆常集會') {
      meetingItems.filter(m => m.date === date).forEach(m => {
        if (m.cancelled && !isLeader) return; // 成員唔會睇到已取消嘅集會
        items.push({ title: m.title, time: m.time, branch: m.branch, cancelled: m.cancelled });
      });
    }
    return branchFilter === 'all' ? items : items.filter(i => i.branch === branchFilter);
  }

  const listItems = useMemo(() => {
    const daysInMonth = new Date(year, mo + 1, 0).getDate();
    const rows: { date: string; title: string; time?: string; branch: string; cancelled?: boolean; type: 'event' | 'meeting'; source: 'event' | 'regular'; id: string; location?: string; tag?: string; audience?: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      events.filter(e => e.date === date && (branchFilter === 'all' || e.branch === branchFilter) && (tagFilter === 'all' || e.tag === tagFilter))
        .forEach(e => rows.push({ date, title: e.title, time: e.time, branch: e.branch, type: e.kind, source: 'event', id: e.id, location: e.location, tag: e.tag, audience: e.audience }));
      meetingItems.filter(m => m.date === date && (branchFilter === 'all' || m.branch === branchFilter) && (tagFilter === 'all' || tagFilter === '恆常集會'))
        .forEach(m => { if (!m.cancelled || isLeader) rows.push({ date, title: m.title, time: m.time, branch: m.branch, type: 'meeting', source: 'regular', id: m.ruleId, cancelled: m.cancelled, tag: '恆常集會' }); });
    }
    return rows;
  }, [events, meetingItems, branchFilter, tagFilter, year, mo, isLeader]);

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

  function addTag() {
    const t = newTag.trim();
    // 防呆：空白同重複
    if (!t) { setMsg('⚠️ 請先輸入標籤名稱。'); return; }
    if (tags.includes(t)) { setMsg(`⚠️ 「${t}」已經存在。`); return; }
    setTags(prev => [...prev, t]);
    setNewTag('');
    setMsg(`✅ 已新增標籤「${t}」`);
  }

  function removeTag(t: string) {
    const used = events.filter(e => e.tag === t).length;
    // 防呆：有活動用緊要先講清楚
    if (!window.confirm(`確定刪除標籤「${t}」？${used ? `有 ${used} 個活動用緊，佢哋會變成「未分類」。` : ''}`)) return;
    setTags(prev => prev.filter(x => x !== t));
    setEvents(prev => prev.map(e => (e.tag === t ? { ...e, tag: '' } : e)));
    if (tagFilter === t) setTagFilter('all');
    setMsg(`🗑 已刪除標籤「${t}」`);
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
        <span className="text-[13px] text-slate-500 mr-1">Demo：</span>
        {['parent', 'member', 'group_leader', 'branch_leader', 'admin'].map(r => (
          <button key={r} onClick={() => { setRole(r); setMsg(''); }}
            className={`text-[13px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {r === 'parent' ? '家長' : r === 'member' ? '成員' : r === 'group_leader' ? '團長' : r === 'branch_leader' ? '支部領袖' : '管理員'}
          </button>
        ))}
        {isLeader && <span className="text-[13px] text-emerald-700 font-bold">· 你可直接喺本頁管理</span>}
      </div>

      {/* Header + 直接管理入口 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-bold text-lg m-0">📅 行事曆</h1>
        <div className="flex gap-1.5 items-center">
          {isLeader && (
            <button onClick={openNew} className="text-[13px] px-2.5 py-1 rounded-lg font-bold bg-brand-600 text-white">+ 新增日曆項目</button>
          )}
          <button onClick={() => setView('month')} className={`text-[13px] px-2.5 py-1 rounded-lg font-bold ${view === 'month' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>月曆</button>
          <button onClick={() => setView('list')} className={`text-[13px] px-2.5 py-1 rounded-lg font-bold ${view === 'list' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>清單</button>
        </div>
      </div>
      <p className="text-[13px] text-slate-500 m-0 -mt-2">活動及會議儲存後會自動出現在行事曆；新增時可設定誰可以看到、分類標籤及地點。</p>

      {msg && <div className="text-[13px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">{msg}</div>}

      {/* 匯出 / 同步到 Gmail／Google 日曆（對照用戶問題 #10） */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-bold text-sm m-0 flex items-center gap-2">
            <span className="w-6 h-6 bg-red-600 text-white rounded-lg flex items-center justify-center text-[13px]">📤</span>
            匯出／同步去你嘅 Gmail／Google 日曆
          </h3>
          <button onClick={() => setExportOpen(!exportOpen)} className="text-[13px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5">
            {exportOpen ? '▲ 收起' : '▼ 點開睇做法'}
          </button>
        </div>
        {exportOpen && (
          <div className="space-y-2.5 text-[13px] text-slate-600 leading-relaxed">
            <p className="m-0">
              將旅團行事曆加到你自己嘅 <strong>Google 日曆／Gmail</strong>，手機電腦都會自動同步更新，唔使次次開 APP。
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <div className="font-bold text-slate-700">方法一：訂閱（推薦，自動同步）</div>
              <p className="m-0">複製下面訂閱網址 → 喺 Google 日曆左邊「其他日曆」→「從網址新增」貼上，就永久同步。</p>
              <div className="flex gap-2">
                <input readOnly value={`https://troop-portal.example/api/calendar.ics?troop=0088&role=${role}`} className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white" />
                <button onClick={copySubscribe} className="text-[13px] font-bold bg-brand-600 text-white px-3 py-1.5 rounded-lg">{copied ? '✅ 已複製' : '📋 複製'}</button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <div className="font-bold text-slate-700">方法二：下載 .ics 檔再匯入</div>
              <p className="m-0">下載之後，喺 Google 日曆「匯入」選返呢個檔，一次性加入。</p>
              <a href={icsHref()} download="scout-calendar.ics" className="inline-block text-[13px] font-bold bg-slate-700 text-white px-3 py-1.5 rounded-lg">⬇️ 下載 .ics</a>
            </div>
          </div>
        )}
      </section>

      {/* 分類標籤篩選 */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        <button onClick={() => setTagFilter('all')}
          className={`text-[13px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap border ${tagFilter === 'all' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
          🏷️ 全部標籤
        </button>
        {tags.map(t => (
          <button key={t} onClick={() => setTagFilter(t)}
            className={`text-[13px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap border ${tagFilter === t ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* 支部 filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {[{ id: 'all', label: '全部' }, ...BRANCHES.map(b => ({ id: b, label: b }))].map(b => (
          <button key={b.id} onClick={() => setBranchFilter(b.id)}
            className={`text-[13px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap border ${branchFilter === b.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>
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
                    {item.time && <span className="text-[13px] opacity-70">{item.time.slice(0, 5)} </span>}
                    {item.title}
                    {item.cancelled && isLeader && <span className="text-[13px] text-rose-600 ml-0.5">取消</span>}
                  </div>
                ))}
                {items.length > 3 && <div className="text-[13px] text-slate-500 text-center">+{items.length - 3}</div>}
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
                  {item.cancelled && <span className="text-[13px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-bold">已取消</span>}
                  <span className="font-bold text-xs">{item.title}</span>
                </div>
                <div className="text-[13px] text-slate-500 mt-0.5">{item.date} {item.time && `· ${item.time}`} · {item.branch}{item.location ? ` · ${item.location}` : ''}{item.audience ? ` · 👀 ${item.audience}` : ''}{item.tag ? ` · 🏷️ ${item.tag}` : ''}</div>
              </div>
              <span className={`text-[13px] px-1.5 py-0.5 rounded font-bold ${item.type === 'event' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {item.type === 'event' ? '活動' : item.tag === '會議' ? '會議' : '集會'}
              </span>
              {isLeader && (
                <div className="flex gap-1 flex-shrink-0">
                  {item.source === 'event' ? (
                    <>
                      <button onClick={() => openEdit(item.id)} className="text-[13px] text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100" title="編輯">✏️</button>
                      <button onClick={() => deleteEvent(item.id)} className="text-[13px] text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50" title="刪除">🗑</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => toggleCancel(item.date, item.title)}
                        className={`text-[13px] px-1.5 py-0.5 rounded font-bold ${item.cancelled ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                        {item.cancelled ? '↺ 恢復' : '✕ 取消呢日'}
                      </button>
                    </>
                  )}
                  {/* 行事曆只係標記當日有乜；會議文件同紀錄喺「會議」頁保存 */}
                  {item.tag === '會議' && (
                    <a href="/dashboard/meetings" className="text-[13px] text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 no-underline" title="會議文件及紀錄">📄 紀錄</a>
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
              className="text-[13px] bg-brand-600 text-white px-2.5 py-1 rounded-lg font-bold">+ 新增規則</button>
          </div>
          <div className="space-y-1.5">
            {rules.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BRANCH_COLORS[r.branch] }} />
                  <span className="font-bold text-[13px]">{r.branch}</span>
                  <span className="text-[13px] text-slate-500 truncate">{r.weekday} {r.time} · {r.location}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setFormErr(''); setRuleForm({ ...r }); }} className="text-[13px] text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-200">編輯</button>
                  <button onClick={() => setRules(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x))}
                    className={`text-[13px] px-1.5 py-0.5 rounded font-bold ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {r.active ? '啟用' : '停用'}
                  </button>
                  <button onClick={() => deleteRule(r.id)} className="text-[13px] text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50">刪除</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-slate-500 m-0">💡 個別日子唔使集會：到「清單」視圖按該日集會嘅「✕ 取消呢日」。行事曆只係標記當日有乜；會議文件及紀錄喺「🤝 會議」頁保存。</p>
        </section>
      )}

      {/* ═════ 分類標籤管理（團長／管理員可加新標籤）═════ */}
      {isLeader && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
          <h3 className="font-bold text-sm m-0">🏷️ 分類標籤</h3>
          <p className="text-[13px] text-slate-500 m-0 -mt-1 leading-relaxed">
            預設有「恆常集會」「活動」「會議」，你可以加自己嘅標籤（例如「訓練」「服務」「營火會」），純粹用來分類同篩選。
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 text-[13px] font-bold bg-slate-100 text-slate-700 rounded-full pl-2.5 pr-1 py-1">
                {t}
                <button onClick={() => removeTag(t)} className="text-slate-400 hover:text-rose-600 bg-transparent border-0 cursor-pointer px-1" title="刪除標籤">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="新標籤名稱" value={newTag} onChange={e => setNewTag(e.target.value)} />
            <button onClick={addTag} className="text-[13px] font-bold bg-brand-600 text-white px-3 py-1.5 rounded-lg">+ 加入</button>
          </div>
        </section>
      )}

      {/* ═════ 活動表單（inline，唔使跳頁）═════ */}
      {form && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm m-0">{form.id ? '✏️ 編輯活動' : '➕ 新增活動'}</h3>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">名稱<input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：旅團露營" /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">日期<input type="date" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">時間<input className={inputCls} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="例如：19:00-21:00" /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">類型
              <select className={inputCls} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as 'event' | 'meeting', tag: e.target.value === 'meeting' ? '會議' : form.tag })}>
                <option value="event">活動</option>
                <option value="meeting">會議</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">支部

              <select className={inputCls} value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">地點<input className={inputCls} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="例如：西貢" /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">可見對象<input className={inputCls} value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} placeholder="例如：全旅、童軍及家長、領袖" /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">分類標籤
              <select className={inputCls} value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}>
                {tags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {formErr && <p className="text-[13px] font-bold text-rose-700 bg-rose-50 rounded-lg px-2 py-1.5 m-0">{formErr}</p>}
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
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">支部
              <select className={inputCls} value={ruleForm.branch} onChange={e => setRuleForm({ ...ruleForm, branch: e.target.value })}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">星期
              <select className={inputCls} value={ruleForm.weekday} onChange={e => setRuleForm({ ...ruleForm, weekday: e.target.value })}>
                {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">時間<input className={inputCls} value={ruleForm.time} onChange={e => setRuleForm({ ...ruleForm, time: e.target.value })} placeholder="19:00-21:00" /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">地點<input className={inputCls} value={ruleForm.location} onChange={e => setRuleForm({ ...ruleForm, location: e.target.value })} placeholder="旅團部" /></label>
            {formErr && <p className="text-[13px] font-bold text-rose-700 bg-rose-50 rounded-lg px-2 py-1.5 m-0">{formErr}</p>}
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
