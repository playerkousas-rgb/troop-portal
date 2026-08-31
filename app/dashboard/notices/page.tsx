'use client';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   MOCK 公告 = announcement（提示類）
   ── 對照用戶定義：公告係「突然要取消活動」「提家長交幾月團費」呢類提示，
      唔係活動通告文件（通告文件屬於活動，用 Drive 連結或模板）。
   ── 對照用戶要求 #6：有權限者直接喺呢一頁發佈／編輯／刪除，唔使跳去管理工具。
   ═══════════════════════════════════════════════════ */

type Announcement = {
  id: string;
  title: string;
  body: string;
  target: string;        // 全旅 / 領袖 / 家長 / 某支部
  urgent: boolean;
  date: string;          // 發佈日
  validUntil: string;    // 有效至（留空＝長期）
};

const TODAY = '2026-09-01';

const SEED: Announcement[] = [
  {
    id: 'n1',
    title: '9月20日旅團露營因天氣不穩定取消',
    body: '天文台預報週末有雷暴，為安全起見，9月20-21日旅團露營取消，順延至10月18-19日（地點不變）。已繳費用會自動轉到新日期，如需退款請於9月10日前通知旅團會計。',
    target: '全旅',
    urgent: true,
    date: '2026-09-01',
    validUntil: '2026-09-22',
  },
  {
    id: 'n2',
    title: '請家長於 9 月 15 日前交 9 月團費',
    body: '9 月團費 $80，可轉數快俾旅團會計（帳號見通告）或集會時交現金。逾期會暫停活動報名資格。',
    target: '家長',
    urgent: false,
    date: '2026-08-30',
    validUntil: '2026-09-15',
  },
  {
    id: 'n3',
    title: '新學年第一次領袖會議改期',
    body: '原定 9 月 5 日嘅領袖會議改到 9 月 12 日（星期五）20:00，地點旅團部。請各支部領袖預先填好支部人數表。',
    target: '領袖',
    urgent: false,
    date: '2026-08-28',
    validUntil: '2026-09-12',
  },
  {
    id: 'n4',
    title: '幼童軍六長選舉結果公佈',
    body: '恭喜以下成員當選六長：陳大文、李小明、黃家怡。9 月 3 日集會舉行宣誓。',
    target: '幼童軍',
    urgent: false,
    date: '2026-08-20',
    validUntil: '2026-08-31',
  },
];

const TARGETS = ['全旅', '領袖', '家長', '小童軍', '幼童軍', '童軍', '深資', '樂行'];

const emptyForm = { id: '', title: '', body: '', target: '全旅', urgent: false, date: TODAY, validUntil: '' };

export default function NoticesPage() {
  const [role, setRole] = useState('parent');
  const [items, setItems] = useState<Announcement[]>(SEED);
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [formErr, setFormErr] = useState('');
  const [msg, setMsg] = useState('');
  const [showExpired, setShowExpired] = useState(false);

  const isLeader = ['admin', 'group_leader', 'branch_leader', 'coach'].includes(role);
  const isExpired = (a: Announcement) => !!a.validUntil && a.validUntil < TODAY;
  const visible = showExpired ? items : items.filter(a => !isExpired(a));
  const sorted = [...visible].sort((a, b) => (Number(b.urgent) - Number(a.urgent)) || b.date.localeCompare(a.date));

  function openNew() { setFormErr(''); setMsg(''); setForm({ ...emptyForm }); }
  function openEdit(id: string) {
    const a = items.find(x => x.id === id);
    if (a) { setFormErr(''); setMsg(''); setForm({ ...a }); }
  }

  function save() {
    if (!form) return;
    // 防呆：標題＋內文必填
    if (!form.title.trim()) { setFormErr('請填寫公告標題。'); return; }
    if (!form.body.trim()) { setFormErr('請填寫公告內容。'); return; }
    const clean = { ...form, title: form.title.trim(), body: form.body.trim() };
    if (form.id) {
      setItems(prev => prev.map(a => (a.id === form.id ? clean : a)));
      setMsg(`✅ 已更新公告「${clean.title}」`);
    } else {
      setItems(prev => [{ ...clean, id: 'n' + Date.now() }, ...prev]);
      setMsg(`✅ 已發佈公告「${clean.title}」（${clean.target}${clean.urgent ? ' · 緊急' : ''}）`);
    }
    setForm(null);
  }

  function del(id: string) {
    const a = items.find(x => x.id === id);
    if (!a) return;
    // 防呆：刪除前確認
    if (!window.confirm(`確定刪除公告「${a.title}」？刪除後成員就唔會再見到。`)) return;
    setItems(prev => prev.filter(x => x.id !== id));
    setMsg(`🗑 已刪除公告「${a.title}」`);
  }

  const inputCls = 'flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs';

  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">

      {/* Demo 角色 */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[11px] text-slate-500 mr-1">Demo：</span>
        {['parent', 'member', 'branch_leader', 'admin'].map(r => (
          <button key={r} onClick={() => { setRole(r); setMsg(''); }}
            className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {r === 'parent' ? '家長' : r === 'member' ? '成員' : r === 'branch_leader' ? '支部領袖' : '管理員'}
          </button>
        ))}
        {isLeader && <span className="text-[11px] text-emerald-700 font-bold">· 你可直接喺本頁發佈／編輯</span>}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-bold text-lg m-0">📢 公告</h1>
        {isLeader && (
          <button onClick={openNew} className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-brand-600 text-white">+ 發佈公告</button>
        )}
      </div>
      <p className="text-[11px] text-slate-500 m-0 -mt-2 leading-relaxed">
        公告＝提示類訊息，例如「活動因天氣取消」「請家長交團費」「集會改期」。活動通告文件唔喺呢度，喺「活動」入面。
      </p>

      {msg && <div className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">{msg}</div>}

      {/* 列表 */}
      <div className="space-y-2">
        {sorted.length === 0 && <p className="text-center text-sm text-slate-500 py-8">暫無公告</p>}
        {sorted.map(a => {
          const expired = isExpired(a);
          return (
            <div key={a.id} className={`rounded-2xl border p-3.5 ${a.urgent && !expired ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'} ${expired ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {a.urgent && <span className="text-[11px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold">緊急</span>}
                    {expired && <span className="text-[11px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">已過期</span>}
                    <span className="font-bold text-[13px]">{a.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 m-0 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    {a.date} · 對象：{a.target}{a.validUntil ? ` · 有效至 ${a.validUntil}` : ' · 長期'}
                  </div>
                </div>
                {isLeader && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(a.id)} className="text-[11px] text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100" title="編輯">✏️</button>
                    <button onClick={() => del(a.id)} className="text-[11px] text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50" title="刪除">🗑</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 過期公告開關 */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowExpired(v => !v)} className="text-[11px] font-bold text-slate-600 bg-slate-100 border-0 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-200">
          {showExpired ? '隱藏已過期公告' : `顯示已過期公告（${items.filter(isExpired).length}）`}
        </button>
      </div>

      {/* 發佈／編輯表單（inline） */}
      {form && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm m-0">{form.id ? '✏️ 編輯公告' : '📢 發佈公告'}</h3>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">標題<input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：9月20日露營因天氣取消" /></label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">內容
              <textarea rows={4} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="寫清楚發生咩事、成員／家長要做咩、限期" />
            </label>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">對象
              <select className={inputCls} value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}>
                {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">有效至<input type="date" className={inputCls} value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
              <input type="checkbox" checked={form.urgent} onChange={e => setForm({ ...form, urgent: e.target.checked })} />
              標記為緊急（紅色顯示，排最前）
            </label>
            {formErr && <p className="text-[11px] font-bold text-rose-700 bg-rose-50 rounded-lg px-2 py-1.5 m-0">{formErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={save} className="flex-1 text-[12px] font-bold bg-brand-600 text-white py-2 rounded-xl">{form.id ? '儲存' : '發佈'}</button>
              <button onClick={() => { setForm(null); setFormErr(''); }} className="flex-1 text-[12px] font-bold bg-slate-100 text-slate-600 py-2 rounded-xl">取消</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
