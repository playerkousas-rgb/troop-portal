'use client';
import Link from 'next/link';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   MOCK 活動 —— 對照用戶定義：
   (1) 旅團自己搞的活動：有通告（Drive 連結或模板上傳），並會自動加入行事曆
   (2) 區／地域總會搞的活動：由領袖引入，成員睇下有冇興趣，有興趣自己搵領袖報名（通告係連結）
   ── 對照用戶要求 #6：有權限者直接喺呢一頁新增／編輯／刪除／引入，唔使跳去管理工具
   ═══════════════════════════════════════════════════ */

type NoticeLink = {
  label: string;
  kind: 'link' | 'inline';   // link＝Drive／外部連結；inline＝直接喺 APP 內建內容
  url?: string;
  body?: string;
  source?: 'link' | 'template' | 'inline' | 'library';
};

/** Drive 連結轉做可內嵌預覽嘅 /preview 網址 */
function toEmbedUrl(url: string): string {
  const u = String(url || '');
  if (/drive\.google\.com\/file\/d\//.test(u)) return u.replace(/\/view.*$/, '/preview');
  if (/docs\.google\.com/.test(u)) return u.replace(/\/edit.*$/, '/preview') + (u.includes('?') ? '&' : '?') + 'embedded=true';
  return u;
}

type Act = {
  id: string;
  title: string;
  kind: 'internal' | 'external';
  date: string;
  deadline: string;
  location: string;
  branch: string;
  tag: string;
  fee: string;
  summary: string;              // 內文摘要：領袖自己填（系統唔自動翻譯通告）
  notices: NoticeLink[];        // 通告（可多張 → 下拉式清單）
  registerWay: 'app' | 'leader';
  quota: number;                // 名額（0＝無限）
  registered: number;
  myStatus: 'registered' | 'interested' | 'declined' | 'unresponded';
  expired?: boolean;            // 過期區：唔刪除，保留集合時間地點俾已報名嘅人睇
};

const SEED: Act[] = [
  {
    id: 'a1', title: '旅團露營（9月）', kind: 'internal', date: '2026-09-20', deadline: '2026-09-15',
    location: '西貢白沙灣', branch: '全旅', tag: '露營', fee: '$300',
    summary: '兩日一夜旅團露營，含晚間營火會及周日早會。請自備水壺、電筒及個人藥品。9月18日 19:00 旅團部集合。',
    notices: [
      { label: '露營通告（家長帳戶登入報名＝簽署）', kind: 'link', url: 'https://drive.google.com/file/d/demo1/view' },
      { label: '重點內容', kind: 'inline', body: '集合：9月20日 09:00 旅團部\n解散：9月21日 16:00 同一地點\n費用：$300（含營費及膳食）\n要帶：睡袋、水壺、電筒、個人藥品、制服\n家長不用簽署：用家長帳戶登入報名＝已簽署，9月15日前喺 APP 回覆參加／不參加。' },
    ],
    registerWay: 'app', quota: 40, registered: 31, myStatus: 'registered',
  },
  {
    id: 'a2', title: '童軍支部日營', kind: 'internal', date: '2026-10-12', deadline: '2026-10-05',
    location: '大埔滘', branch: '童軍', tag: '訓練', fee: '$120',
    summary: '支部日營，含先鋒工程及定向活動。名額優先俾未參加過日營嘅成員。',
    notices: [
      { label: '日營通告', kind: 'link', url: 'https://drive.google.com/file/d/demo2/view' },
      { label: '裝備清單', kind: 'link', url: 'https://drive.google.com/file/d/demo3/view' },
    ],
    registerWay: 'app', quota: 24, registered: 9, myStatus: 'unresponded',
  },
  {
    id: 'a3', title: '九龍地域領袖訓練工作坊', kind: 'external', date: '2026-09-28', deadline: '2026-09-20',
    location: '九龍塘童軍中心', branch: '領袖', tag: '訓練', fee: '免費',
    summary: '地域總會舉辦，內容係支部節目設計。有興趣嘅領袖請直接搵團長報名，名額有限。',
    notices: [{ label: '地域通告（連結）', kind: 'link', url: 'https://www.scout.org.hk/demo-notice' }],
    registerWay: 'leader', quota: 0, registered: 0, myStatus: 'unresponded',
  },
  {
    id: 'a4', title: '區錦標賽（游泳）', kind: 'external', date: '2026-11-08', deadline: '2026-10-25',
    location: '九龍公園游泳池', branch: '童軍', tag: '比賽', fee: '$50',
    summary: '區會舉辦嘅游泳錦標賽，成員可自行睇下有冇興趣，有興趣請搵支部領袖報名及交表。',
    notices: [{ label: '區會通告及報名表（連結）', kind: 'link', url: 'https://www.scout.org.hk/demo-swim' }],
    registerWay: 'leader', quota: 0, registered: 0, myStatus: 'interested',
  },
  // 過期區示例：活動過咗期 → 移入過期區，唔刪除（已報名嘅成員／家長仍然睇到集合時間地點）
  {
    id: 'a8', title: '8月親子同樂日（已過期）', kind: 'internal', date: '2026-08-30', deadline: '2026-08-27',
    location: '大埔海濱公園', branch: '全旅', tag: '集會', fee: '',
    summary: '親子活動。已結束，留存作紀錄。',
    notices: [{ label: '同樂日通告', kind: 'inline', body: '集合：8月30日 09:00 大埔海濱公園\n解散：12:00' }],
    registerWay: 'app', quota: 0, registered: 22, myStatus: 'registered', expired: true,
  },
  {
    id: 'a9', title: '8月旅團集會（已過期）', kind: 'internal', date: '2026-08-24', deadline: '2026-08-20',
    location: '旅團部', branch: '全旅', tag: '集會', fee: '',
    summary: '常規集會。已結束，留存作紀錄。',
    notices: [{ label: '集會通告', kind: 'inline', body: '集合：8月24日 19:00 旅團部\n解散：21:00\n當日內容：小隊會議 + 團務' }],
    registerWay: 'app', quota: 0, registered: 15, myStatus: 'registered', expired: true,
  },
  {
    id: 'a10', title: '7月夏日嘉年華（已過期）', kind: 'internal', date: '2026-07-12', deadline: '2026-07-08',
    location: '旅團部', branch: '全旅', tag: '服務', fee: '',
    summary: '攤位服務。已結束，留存作紀錄。',
    notices: [{ label: '嘉年華通告', kind: 'inline', body: '集合：7月12日 08:30 旅團部\n解散：18:00' }],
    registerWay: 'app', quota: 0, registered: 30, myStatus: 'declined', expired: true,
  },
];

const BRANCHES = ['全旅', '小童軍', '幼童軍', '童軍', '深資', '樂行', '領袖'];
const ACTIVITY_TAGS = ['露營', '訓練', '服務', '比賽', '集會', '其他'];
const LIBRARY_NOTICES = [
  { id: 'lib1', title: '第 118 屆周年童軍週', source: '香港童軍總會', url: 'https://www.scout.org.hk/demo-library-118' },
  { id: 'lib2', title: '秋季跨旅遠足', source: '十一區', url: 'https://www.scout.org.hk/demo-library-hike' },
];

const emptyForm: Act = {
  id: '', title: '', kind: 'internal', date: '', deadline: '', location: '', branch: '全旅', tag: '其他', fee: '',
  summary: '', notices: [], registerWay: 'app', quota: 0, registered: 0, myStatus: 'unresponded',
};

export default function ActivitiesPage() {
  const [role, setRole] = useState('parent');
  const [items, setItems] = useState<Act[]>(SEED);
  const [filter, setFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [showExpired, setShowExpired] = useState(false); // 過期區：收合做下拉式，撳先展開
  const [adult, setAdult] = useState(false); // 成員示範：18 歲或以上可自行報名
  const [detail, setDetail] = useState<string | null>(null);
  const [form, setForm] = useState<Act | null>(null);
  const [formErr, setFormErr] = useState('');
  const [msg, setMsg] = useState('');
  const [noticeDraft, setNoticeDraft] = useState<NoticeLink>({ label: '', kind: 'link', url: '', body: '' });
  const [preview, setPreview] = useState<string | null>(null);
  // 旅團活動三種處理方法；區／地域總會活動兩種處理方法。
  const [noticeSourcingMethod, setNoticeSourcingMethod] = useState<'link' | 'template' | 'inline' | 'library'>('link');
  const [libraryNoticeId, setLibraryNoticeId] = useState(LIBRARY_NOTICES[0].id);

  const isLeader = ['admin', 'group_leader', 'branch_leader', 'coach'].includes(role);
  const activeList = (filter === 'all' ? items : items.filter(a => a.kind === filter)).filter(a => !a.expired);
  // 過期區：由新至舊排列（日期近嘅放最上）
  const expiredList = items.filter(a => a.expired).sort((a, b) => b.date.localeCompare(a.date));
  const current = detail ? items.find(a => a.id === detail) || null : null;
  // 開另一張活動詳情時，重設通告預覽選擇

  /* ══════════ 管理動作 ══════════ */

  function openNew(kind: 'internal' | 'external') {
    setFormErr(''); setMsg('');
    setNoticeSourcingMethod(kind === 'external' ? 'library' : 'template');
    setNoticeDraft({ label: '', kind: 'link', url: '', body: '' });
    setForm({ ...emptyForm, kind, registerWay: kind === 'internal' ? 'app' : 'leader', notices: [] });
  }
  function openEdit(id: string) {
    const a = items.find(x => x.id === id);
    if (a) {
      setFormErr(''); setMsg('');
      setNoticeSourcingMethod(a.kind === 'external' ? 'link' : 'template');
      setNoticeDraft({ label: '', kind: 'link', url: '', body: '' });
      setForm({ ...a, notices: [...a.notices] });
    }
  }

  function save() {
    if (!form) return;
    // 防呆：必填＋日期格式
    if (!form.title.trim()) { setFormErr('請填寫活動名稱。'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) { setFormErr('請選擇活動日期。'); return; }
    if (form.deadline && form.deadline > form.date) { setFormErr('報名截止日期唔可以遲過活動日期。'); return; }
    if (form.quota < 0) { setFormErr('名額唔可以係負數。'); return; }
    const clean: Act = { ...form, title: form.title.trim(), location: form.location.trim(), summary: form.summary.trim() };
    if (form.id) {
      setItems(prev => prev.map(a => (a.id === form.id ? clean : a)));
      setMsg(`✅ 已更新「${clean.title}」${clean.kind === 'internal' ? '（行事曆已同步更新）' : ''}`);
    } else {
      setItems(prev => [...prev, { ...clean, id: 'a' + Date.now() }].sort((a, b) => a.date.localeCompare(b.date)));
      setMsg(clean.kind === 'internal'
        ? `✅ 已新增「${clean.title}」，並自動加入行事曆（${clean.date}）`
        : `✅ 已引入「${clean.title}」（區／總會活動，成員可自行睇下有冇興趣）`);
    }
    setForm(null);
  }

  function del(id: string) {
    const a = items.find(x => x.id === id);
    if (!a) return;
    // 防呆：刪除前確認（刪除後已報名嘅人會睇唔到集合資料）
    if (!window.confirm(`確定永久刪除「${a.title}」？已報名嘅成員／家長之後就睇唔到集合時間地點，建議改用「移入過期區」。${a.kind === 'internal' ? '行事曆上嘅呢個活動都會一併移除。' : ''}`)) return;
    setItems(prev => prev.filter(x => x.id !== id));
    setDetail(null);
    setMsg(`🗑 已永久刪除「${a.title}」`);
  }

  /** 移入過期區：唔刪除，保留集合資料俾已報名嘅人睇（對照用戶要求 #13） */
  function moveToExpired(id: string) {
    const a = items.find(x => x.id === id);
    if (!a) return;
    setItems(prev => prev.map(x => x.id === id ? { ...x, expired: true } : x));
    setDetail(null);
    setMsg(`⏰ 已將「${a.title}」移入過期區（已報名者仍可查看集合時間／地點）`);
  }

  function restoreFromExpired(id: string) {
    const a = items.find(x => x.id === id);
    if (!a) return;
    setItems(prev => prev.map(x => x.id === id ? { ...x, expired: false } : x));
    setMsg(`↺ 已恢復「${a.title}」到進行中列表`);
  }

  function addNotice() {
    if (!form) return;
    const label = noticeDraft.label.trim();

    if (noticeSourcingMethod === 'library') {
      const libraryNotice = LIBRARY_NOTICES.find(n => n.id === libraryNoticeId);
      if (!libraryNotice) { setFormErr('請先選擇圖書館通告。'); return; }
      setForm({
        ...form,
        notices: [...form.notices, { label: `${libraryNotice.title} · ${libraryNotice.source}`, kind: 'link', url: libraryNotice.url, source: 'library' }],
      });
      setMsg(`✅ 已從圖書館加入「${libraryNotice.title}」，請再設定活動標籤及截止日期。`);
    } else if (noticeSourcingMethod === 'template') {
      setForm({
        ...form,
        notices: [...form.notices, { label: label || '活動通告模板', kind: 'link', url: '/downloads/SCOUTSYSTEM_ACTIVITY_NOTICE_TEMPLATE.txt', source: 'template' }],
      });
      setMsg('✅ 已加入活動通告模板連結，填妥後可替換成旅團自己的 Drive 連結。');
    } else if (!label) {
      setFormErr('請填寫通告名稱（例如「露營通告」）。'); return;
    } else if (noticeSourcingMethod === 'link') {
      if (!/^https?:\/\/.+/.test((noticeDraft.url || '').trim())) { setFormErr('請貼上完整連結（要 http:// 或 https:// 開頭）。'); return; }
      setForm({
        ...form,
        notices: [...form.notices, { label, kind: 'link', url: noticeDraft.url!.trim(), source: 'link' }],
      });
    } else {
      if (!(noticeDraft.body || '').trim()) { setFormErr('請輸入通告內容。'); return; }
      setForm({
        ...form,
        notices: [...form.notices, { label, kind: 'inline', body: noticeDraft.body!.trim(), source: 'inline' }],
      });
    }
    setNoticeDraft({ label: '', kind: 'link', url: '', body: '' });
    setNoticeSourcingMethod(form.kind === 'external' ? 'library' : 'template');
    setFormErr('');
  }

  function removeNotice(i: number) {
    if (!form) return;
    setForm({ ...form, notices: form.notices.filter((_, idx) => idx !== i) });
  }

  function respond(id: string, type: 'registered' | 'interested' | 'declined') {
    setItems(prev => prev.map(a => {
      if (a.id !== id) return a;
      const wasRegistered = a.myStatus === 'registered';
      const nextRegistered = a.registered + (type === 'registered' && !wasRegistered ? 1 : wasRegistered && type !== 'registered' ? -1 : 0);
      return { ...a, myStatus: type, registered: Math.max(0, nextRegistered) };
    }));
    setMsg(type === 'registered' ? '✅ 已回覆參加' : type === 'interested' ? '❤️ 已標記有興趣，請搵領袖報名' : '❌ 已回覆不參加');
    setDetail(null);
  }

  const inputCls = 'flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs';
  const kindBadge = (k: 'internal' | 'external') =>
    k === 'internal'
      ? <span className="text-[13px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-bold">🏠 旅團活動</span>
      : <span className="text-[13px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">🌐 區／總會活動</span>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">

      {/* Demo 角色 */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[13px] text-slate-500 mr-1">Demo：</span>
        {['parent', 'member', 'branch_leader', 'admin'].map(r => (
          <button key={r} onClick={() => { setRole(r); setMsg(''); }}
            className={`text-[13px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {r === 'parent' ? '家長' : r === 'member' ? '成員' : r === 'branch_leader' ? '支部領袖' : '管理員'}
          </button>
        ))}
        {isLeader && <span className="text-[13px] text-emerald-700 font-bold">· 你可直接喺本頁管理</span>}
        {role === 'member' && (
          <label className="flex items-center gap-1 text-[13px] font-bold text-slate-600">
            <input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} />
            18 歲或以上（可自行報名）
          </label>
        )}
      </div>

      {/* Header + 管理入口 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-bold text-lg m-0">🎯 活動</h1>
        {isLeader && (
          <div className="flex gap-1.5">
            <button onClick={() => openNew('internal')} className="text-[13px] px-2.5 py-1 rounded-lg font-bold bg-brand-600 text-white">+ 新增旅團活動</button>
            <button onClick={() => openNew('external')} className="text-[13px] px-2.5 py-1 rounded-lg font-bold bg-violet-600 text-white">📚 引入區／總會活動</button>
          </div>
        )}
      </div>

      {msg && <div className="text-[13px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">{msg}</div>}

      {/* 篩選 */}
      <div className="flex gap-1.5">
        {([{ id: 'all', label: '全部' }, { id: 'internal', label: '🏠 旅團活動' }, { id: 'external', label: '🌐 區／總會' }] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-[13px] px-3 py-1.5 rounded-full font-bold border ${filter === f.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 列表（每一張都可以撳入去睇詳情） */}
      <div className="space-y-2">
        {activeList.length === 0 && <p className="text-center text-sm text-slate-500 py-8">暫無活動</p>}
        {activeList.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 card-hover">
            <button onClick={() => { setDetail(a.id); setPreview(null); }} className="w-full text-left bg-transparent border-0 p-0 cursor-pointer">
              <div className="flex items-center gap-1.5 flex-wrap">{kindBadge(a.kind)}<span className="font-bold text-[13px]">{a.title}</span><span className="text-[13px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">🏷️ {a.tag}</span></div>
              <div className="text-[13px] text-slate-500 mt-1">{a.date} · {a.location || '待定'} · {a.branch}{a.fee ? ` · ${a.fee}` : ''}</div>
              <div className="text-[13px] text-slate-500 mt-0.5">
                {a.deadline ? `報名截止 ${a.deadline} · ` : ''}
                {a.registerWay === 'app'
                  ? (a.quota ? `名額 ${a.registered}/${a.quota}` : '名額不限')
                  : '有興趣請搵領袖報名'}
                {a.notices.length > 0 && ` · 📎 通告 ${a.notices.length}`}
              </div>
              {a.myStatus !== 'unresponded' && (
                <span className={`inline-block mt-1.5 text-[13px] px-1.5 py-0.5 rounded font-bold ${
                  a.myStatus === 'registered' ? 'bg-emerald-100 text-emerald-700' :
                  a.myStatus === 'declined' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                  {a.myStatus === 'registered' ? '✅ 已回覆參加' : a.myStatus === 'declined' ? '❌ 已回覆不參加' : '❤️ 已標記有興趣'}
                </span>
              )}
            </button>
            {isLeader && (
              <div className="flex gap-1 justify-end mt-1.5">
                <button onClick={() => openEdit(a.id)} className="text-[13px] text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100" title="編輯">✏️ 編輯</button>
                <button onClick={() => moveToExpired(a.id)} className="text-[13px] text-amber-700 px-1.5 py-0.5 rounded hover:bg-amber-50" title="移入過期區">⏰ 移入過期區</button>
                <button onClick={() => del(a.id)} className="text-[13px] text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50" title="刪除">🗑 刪除</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ═════ 過期區（下拉式：預設收合，撳先展開；由新至舊排列） ═════ */}
      {expiredList.length > 0 && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 overflow-hidden">
          <button
            onClick={() => setShowExpired(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left bg-transparent border-0 cursor-pointer hover:bg-slate-100/70 transition"
            aria-expanded={showExpired}
          >
            <h3 className="font-bold text-sm m-0 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-400 text-white rounded-lg flex items-center justify-center text-[13px]">⏰</span>
              過期區（{expiredList.length}）
            </h3>
            <span className="flex items-center gap-2">
              <span className="text-[13px] text-slate-500 hidden sm:inline">由新至舊 · 已報名者仍可睇集合時間／地點</span>
              <span className="text-slate-500 text-xs">{showExpired ? '▲ 收合' : '▼ 展開'}</span>
            </span>
          </button>
          {showExpired && (
            <div className="space-y-2 px-3.5 pb-3.5">
              {expiredList.map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-3 card-hover">
                  <button onClick={() => { setDetail(a.id); setPreview(null); }} className="w-full text-left bg-transparent border-0 p-0 cursor-pointer">
                    <div className="flex items-center gap-1.5 flex-wrap">{kindBadge(a.kind)}<span className="font-bold text-[13px]">{a.title}</span>
                      <span className="text-[13px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">🏷️ {a.tag}</span>
                      {a.expired && <span className="text-[13px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">已過期</span>}
                    </div>
                    <div className="text-[13px] text-slate-500 mt-1">{a.date} · {a.location || '待定'} · {a.branch}</div>
                    {a.myStatus === 'registered' && <span className="inline-block mt-1.5 text-[13px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">✅ 你已報名（仍可睇集合資料）</span>}
                  </button>
                  {isLeader && (
                    <div className="flex gap-1 justify-end mt-1.5">
                      <button onClick={() => restoreFromExpired(a.id)} className="text-[13px] text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100" title="恢復">↺ 恢復</button>
                      <button onClick={() => del(a.id)} className="text-[13px] text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50" title="刪除">🗑 永久刪除</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═════ 詳情（點入去睇） ═════ */}
      {current && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDetail(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 flex-wrap">{kindBadge(current.kind)}<h3 className="font-bold text-sm m-0">{current.title}</h3></div>
            <div className="text-[13px] text-slate-600 space-y-0.5">
              <div>📅 日期：{current.date}{current.deadline ? ` · 報名截止 ${current.deadline}` : ''}</div>
              <div>📍 地點：{current.location || '待定'}</div>
              <div>👥 對象：{current.branch}{current.fee ? ` · 💰 ${current.fee}` : ''}</div>
              <div>🏷️ 標籤：{current.tag}</div>
              {current.registerWay === 'app' && <div>🎟️ 名額：{current.quota ? `${current.registered}/${current.quota}` : '不限'}</div>}
            </div>
            {current.summary && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[13px] font-bold text-slate-500 mb-1">內文摘要（領袖填寫）</div>
                <p className="text-[13px] text-slate-700 m-0 leading-relaxed whitespace-pre-wrap">{current.summary}</p>
              </div>
            )}
            {current.notices.length > 0 && (() => {
              const idx = Math.max(0, current.notices.findIndex(n => n.label === preview));
              const n = current.notices[idx] || current.notices[0];
              return (
                <div className="space-y-1.5">
                  <div className="text-[13px] font-bold text-slate-500">
                    📎 通告{current.notices.length > 1 ? `（${current.notices.length} 張，揀一張睇）` : ''}
                  </div>
                  {current.notices.length > 1 && (
                    <select className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs" value={n.label}
                      onChange={e => setPreview(e.target.value)}>
                      {current.notices.map((x, i) => (
                        <option key={i} value={x.label}>{x.label}{x.kind === 'inline' ? '（APP 內建）' : ''}</option>
                      ))}
                    </select>
                  )}

                  {/* APP 內建內容：直接顯示，唔使開檔案 */}
                  {n.kind === 'inline' ? (
                    <div className="bg-brand-50 border border-brand-200 rounded-xl p-3">
                      <div className="text-[13px] font-bold text-brand-700 mb-1">{n.label} · APP 內建</div>
                      <p className="text-[13px] text-slate-700 m-0 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                    </div>
                  ) : (
                    <>
                      {/* 連結：內嵌預覽（最好），加開新分頁做後備 */}
                      <div className="overflow-hidden rounded-xl border border-slate-200">
                        <iframe src={toEmbedUrl(n.url || '')} title={n.label} className="w-full h-64 bg-white" />
                      </div>
                      <div className="flex gap-2">
                        <a href={n.url} target="_blank" rel="noreferrer" className="flex-1 text-center text-[13px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2 no-underline">
                          ↗ 開新分頁睇原檔
                        </a>
                      </div>
                      <p className="text-[13px] text-slate-400 m-0 leading-relaxed">
                        💡 預覽載入唔到？有啲網站唔准內嵌，撳「開新分頁」就得。
                      </p>
                    </>
                  )}
                </div>
              );
            })()}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5">
              <p className="text-[13px] text-amber-800 m-0 leading-relaxed">
                {current.registerWay === 'app'
                  ? 'ℹ️ 呢個係旅團活動：可以直接喺 APP 回覆，活動已自動列入行事曆。家長不用簽署：用家長帳戶登入報名＝已簽署。'
                  : 'ℹ️ 呢個係區／地域總會活動：有興趣請自己搵領袖報名。'}
              </p>
            </div>
            {isLeader ? (
              <div className="flex gap-2">
                <p className="flex-1 text-[13px] text-slate-500 m-0 self-center">領袖請用「編輯」或報名管理處理報名名單。</p>
                <button onClick={() => setDetail(null)} className="flex-1 text-[12px] font-bold bg-slate-100 text-slate-600 py-2 rounded-xl">關閉</button>
              </div>
            ) : (
              <div className="space-y-2">
                {current.registerWay === 'app' ? (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => respond(current.id, 'interested')} className="flex-1 text-[12px] font-bold bg-amber-500 text-white py-2 rounded-xl">❤️ 有興趣</button>
                    {(role === 'parent' || adult) && (
                      <>
                        <button onClick={() => respond(current.id, 'registered')} className="flex-1 text-[12px] font-bold bg-brand-600 text-white py-2 rounded-xl">✅ 參加</button>
                        <button onClick={() => respond(current.id, 'declined')} className="flex-1 text-[12px] font-bold bg-rose-600 text-white py-2 rounded-xl">❌ 不參加</button>
                      </>
                    )}
                  </div>
                ) : (
                  <button onClick={() => respond(current.id, 'interested')} className="w-full text-[12px] font-bold bg-violet-600 text-white py-2 rounded-xl">❤️ 我有興趣（搵領袖報名）</button>
                )}
                <p className="text-[13px] text-slate-500 m-0 leading-relaxed">
                  {role === 'parent'
                    ? 'ℹ️ 家長可標示：有興趣／參加／不參加。選「參加」才需標記已付款；選「不參加」不用 tick。'
                    : adult
                    ? 'ℹ️ 你已 18 歲或以上，可自行報名。'
                    : 'ℹ️ 你未滿 18 歲，可按「有興趣」；參加／不參加由家長用家長帳戶回覆。'}
                </p>
                <button onClick={() => setDetail(null)} className="w-full text-[12px] font-bold bg-slate-100 text-slate-600 py-2 rounded-xl">關閉</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════ 新增／編輯表單（inline） ═════ */}
      {form && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm m-0">
              {form.id ? '✏️ 編輯活動' : form.kind === 'internal' ? '➕ 新增旅團活動' : '📚 引入區／總會活動'}
            </h3>
            <p className="text-[13px] text-slate-500 m-0 -mt-1 leading-relaxed">
              {form.kind === 'internal'
                ? '旅團活動：儲存後會自動加入行事曆，並可掛上你自己嘅通告。'
                : '區／總會活動：引入俾成員睇下有冇興趣，成員有興趣會自己搵領袖報名（取代以前抄返 WhatsApp 群組嘅做法）。'}
            </p>
            {form.kind === 'external' && !form.id && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                <div className="text-[13px] font-bold text-violet-800 mb-1">區／地域總會活動：兩種引入方式</div>
                <p className="text-[13px] text-violet-700 m-0 leading-relaxed">
                  ① 從已接入的圖書館選通告；或 ② 直接貼上外部連結。兩種方式都要在這裡補上活動標籤及報名截止日期。
                </p>
              </div>
            )}
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">名稱<input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={form.kind === 'internal' ? '例如：旅團露營' : '例如：地域領袖工作坊'} /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">活動日期<input type="date" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">報名截止<input type="date" className={inputCls} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">地點<input className={inputCls} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="例如：西貢白沙灣" /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">對象
              <select className={inputCls} value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">分類標籤
              <select className={inputCls} value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}>
                {ACTIVITY_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">費用<input className={inputCls} value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} placeholder="例如：$300 或 免費" /></label>
            {form.kind === 'internal' && (
              <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">名額<input type="number" min={0} className={inputCls} value={form.quota} onChange={e => setForm({ ...form, quota: Number(e.target.value) })} placeholder="0＝不限" /></label>
            )}
            <label className="flex flex-col gap-1 text-[13px] font-bold text-slate-600">內文摘要（領袖自己填，系統唔會自動讀通告內容）
              <textarea rows={3} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="重點內容、集合時間、要帶咩" />
            </label>

            {/* 通告：旅團活動三種方法；區／地域總會活動兩種方法 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <div>
                <div className="text-[13px] font-bold text-slate-600">📎 活動通告（可加入多張）</div>
                <p className="text-[13px] text-slate-500 m-0 mt-1 leading-relaxed">
                  {form.kind === 'internal'
                    ? '旅團自辦活動：模板、貼現成連結、或直接輸入內容，三種都可以。'
                    : '區／地域總會活動：從圖書館引入，或直接貼上外部連結。'}
                </p>
              </div>

              {form.notices.map((n, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1.5">
                  <span className="text-[13px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 flex-shrink-0">
                    {n.source === 'library' ? '📚 圖書館' : n.source === 'template' ? '📋 模板' : n.kind === 'inline' ? '📝 內建' : '🔗 連結'}
                  </span>
                  <span className="flex-1 min-w-0 text-[13px] text-slate-700 truncate">{n.label}</span>
                  <button type="button" onClick={() => removeNotice(i)} className="text-[13px] text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50">移除</button>
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {form.kind === 'internal' ? (
                  ([
                    { id: 'template' as const, label: '📋 用活動模板' },
                    { id: 'link' as const, label: '🔗 貼上連結' },
                    { id: 'inline' as const, label: '📝 直接輸入' },
                  ]).map(method => (
                    <button key={method.id} type="button" onClick={() => { setNoticeSourcingMethod(method.id); setNoticeDraft({ ...noticeDraft, kind: method.id === 'inline' ? 'inline' : 'link' }); setFormErr(''); }}
                      className={`text-[13px] font-bold px-2 py-1.5 rounded-lg border ${noticeSourcingMethod === method.id ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                      {method.label}
                    </button>
                  ))
                ) : (
                  ([
                    { id: 'library' as const, label: '📚 從圖書館引入' },
                    { id: 'link' as const, label: '🔗 貼上外部連結' },
                  ]).map(method => (
                    <button key={method.id} type="button" onClick={() => { setNoticeSourcingMethod(method.id); setNoticeDraft({ ...noticeDraft, kind: 'link' }); setFormErr(''); }}
                      className={`text-[13px] font-bold px-2 py-1.5 rounded-lg border ${noticeSourcingMethod === method.id ? 'bg-violet-700 text-white border-violet-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                      {method.label}
                    </button>
                  ))
                )}
              </div>

              {noticeSourcingMethod === 'library' ? (
                <>
                  <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={libraryNoticeId} onChange={e => setLibraryNoticeId(e.target.value)}>
                    {LIBRARY_NOTICES.map(n => <option key={n.id} value={n.id}>{n.title} · {n.source}</option>)}
                  </select>
                  <p className="text-[13px] text-violet-700 m-0 leading-relaxed">揀選後會帶入圖書館通告連結；活動標籤及截止日期仍由你決定。</p>
                </>
              ) : noticeSourcingMethod === 'template' ? (
                <>
                  <input className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="通告名稱（例如：露營通告）" value={noticeDraft.label} onChange={e => setNoticeDraft({ ...noticeDraft, label: e.target.value })} />
                  <p className="text-[13px] text-slate-500 m-0 leading-relaxed">先下載模板填寫，之後可上傳到 Drive，再用「貼上連結」加入旅團自己的檔案。</p>
                  <Link href="/dashboard/templates" className="inline-flex text-[13px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-1.5 no-underline">⬇️ 下載活動通告模板</Link>
                </>
              ) : noticeSourcingMethod === 'link' ? (
                <>
                  <input className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder={form.kind === 'internal' ? '通告名稱（例如：露營通告）' : '通告名稱（例如：區會報名表）'} value={noticeDraft.label} onChange={e => setNoticeDraft({ ...noticeDraft, label: e.target.value })} />
                  <input className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="https://…（Drive 或外部網址）" value={noticeDraft.url || ''} onChange={e => setNoticeDraft({ ...noticeDraft, url: e.target.value })} />
                </>
              ) : (
                <>
                  <input className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="通告名稱（例如：集合及裝備資料）" value={noticeDraft.label} onChange={e => setNoticeDraft({ ...noticeDraft, label: e.target.value })} />
                  <textarea rows={4} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="直接輸入日期、地點、費用、集合時間、要帶甚麼…" value={noticeDraft.body || ''} onChange={e => setNoticeDraft({ ...noticeDraft, body: e.target.value })} />
                </>
              )}

              <button type="button" onClick={addNotice} className="w-full text-[13px] font-bold bg-slate-700 text-white px-2.5 py-1.5 rounded-lg">＋ 加入通告</button>
            </div>

            {formErr && <p className="text-[13px] font-bold text-rose-700 bg-rose-50 rounded-lg px-2 py-1.5 m-0">{formErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={save} className="flex-1 text-[12px] font-bold bg-brand-600 text-white py-2 rounded-xl">儲存</button>
              <button onClick={() => { setForm(null); setFormErr(''); }} className="flex-1 text-[12px] font-bold bg-slate-100 text-slate-600 py-2 rounded-xl">取消</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
