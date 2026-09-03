'use client';

import { useState } from 'react';
import { useConfirm, kv } from '@/components/ConfirmProvider';

/** MOCK 會議管理：有管理權的角色可在會議頁直接新增、修改及刪除。 */
type Meeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: 'upcoming' | 'past';
  agenda: boolean;
  minutes: boolean;
  files: { name: string; size: string }[];
};

const SEED: Meeting[] = [
  { id: 'm1', title: '9月份領袖會議', date: '2026-09-10', time: '19:00-21:00', location: '旅團部', status: 'upcoming', agenda: true, minutes: false, files: [{ name: '議程.pdf', size: '120KB' }, { name: '預算表.xlsx', size: '45KB' }, { name: '活動計劃.docx', size: '89KB' }] },
  { id: 'm2', title: '週年大會', date: '2026-10-15', time: '14:00-17:00', location: '社區中心', status: 'upcoming', agenda: false, minutes: false, files: [] },
  { id: 'm3', title: '8月份領袖會議', date: '2026-08-12', time: '19:00-21:00', location: '旅團部', status: 'past', agenda: true, minutes: true, files: [{ name: '議程.pdf', size: '110KB' }, { name: '會議紀錄.pdf', size: '250KB' }, { name: '照片.zip', size: '3.2MB' }] },
];

const ROLE_LABELS: Record<string, string> = {
  troop_leader: '旅長', parent: '家長', member: '成員', group_leader: '團長', branch_leader: '支部領袖', admin: '管理員',
};

type MeetingForm = { id: string; title: string; date: string; time: string; location: string };
const blankForm: MeetingForm = { id: '', title: '', date: '', time: '', location: '' };

export default function MeetingsPage() {
  const [role, setRole] = useState('parent');
  const [items, setItems] = useState<Meeting[]>(SEED);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<MeetingForm | null>(null);
  const [msg, setMsg] = useState('');
  const [formErr, setFormErr] = useState('');
  const { confirm } = useConfirm();

  const isLeader = ['troop_leader', 'admin', 'group_leader', 'branch_leader'].includes(role);
  const meeting = items.find(m => m.id === selected);

  function openNew() {
    setFormErr('');
    setForm({ ...blankForm, date: '2026-09-25', time: '19:00-21:00', location: '旅團部' });
  }

  function openEdit(m: Meeting) {
    setSelected(null);
    setFormErr('');
    setForm({ id: m.id, title: m.title, date: m.date, time: m.time, location: m.location });
  }

  function save() {
    if (!form) return;
    if (!form.title.trim()) { setFormErr('請填寫會議名稱。'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) { setFormErr('請選擇會議日期。'); return; }
    const clean = { ...form, title: form.title.trim(), location: form.location.trim() };
    if (form.id) {
      setItems(prev => prev.map(m => m.id === form.id ? { ...m, ...clean } : m));
      setMsg(`✅ 已更新「${clean.title}」`);
    } else {
      setItems(prev => [...prev, { ...clean, id: `m${Date.now()}`, status: clean.date >= '2026-09-01' ? 'upcoming' : 'past', agenda: false, minutes: false, files: [] }]);
      setMsg(`✅ 已新增「${clean.title}」，已加入行事曆`);
    }
    setForm(null);
  }

  async function remove(m: Meeting) {
    const ok = await confirm({
      title: '確認刪除會議',
      message: kv([['會議', m.title], ['日期', `${m.date} ${m.time}`]]),
      confirmLabel: '確認刪除',
      danger: true,
    });
    if (!ok) return;
    setItems(prev => prev.filter(x => x.id !== m.id));
    setSelected(null);
    setMsg(`🗑 已刪除「${m.title}」`);
  }

  const card = (m: Meeting) => (
    <div key={m.id} className={`bg-white rounded-2xl border border-slate-200 p-4 card-hover ${m.status === 'past' ? 'opacity-70' : ''}`}>
      <button onClick={() => setSelected(m.id)} className="w-full text-left bg-transparent border-0 p-0 cursor-pointer">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="font-bold text-sm">{m.title}</span>
          <span className={`text-[13px] px-1.5 py-0.5 rounded font-bold ${m.status === 'upcoming' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {m.status === 'upcoming' ? '即將進行' : '已結束'}
          </span>
        </div>
        <div className="text-[13px] text-slate-500">📅 {m.date} · ⏰ {m.time} · 📍 {m.location}</div>
        {m.files.length > 0 && <div className="text-[13px] text-brand-600 mt-1">📎 {m.files.length} 個文件</div>}
      </button>
      {isLeader && (
        <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-slate-100">
          <button onClick={() => openEdit(m)} className="text-[13px] font-bold text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100">✏️ 編輯</button>
          <button onClick={() => remove(m)} className="text-[13px] font-bold text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50">🗑 刪除</button>
        </div>
      )}
    </div>
  );

  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[13px] text-slate-500 mr-1">Demo：</span>
        {['troop_leader', 'admin', 'group_leader', 'branch_leader', 'parent', 'member'].map(r => (
          <button key={r} onClick={() => { setRole(r); setMsg(''); }} className={`text-[13px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {ROLE_LABELS[r]}
          </button>
        ))}
        {isLeader && <span className="text-[13px] text-emerald-700 font-bold">· 可直接在本頁管理</span>}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-bold text-lg m-0">🤝 會議</h1>
          <p className="text-[13px] text-slate-500 m-0 mt-1">會議議程、紀錄及文件；新增後會同步到行事曆。</p>
        </div>
        {isLeader && <button onClick={openNew} className="text-[13px] px-2.5 py-1.5 rounded-lg font-bold bg-brand-600 text-white">+ 新增會議</button>}
      </div>

      {msg && <div className="text-[13px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">{msg}</div>}

      {!meeting ? (
        <>
          <h2 className="font-bold text-sm text-slate-600">即將進行</h2>
          <div className="space-y-2">{items.filter(m => m.status === 'upcoming').map(card)}</div>
          <h2 className="font-bold text-sm text-slate-600 mt-4">已結束</h2>
          <div className="space-y-2">{items.filter(m => m.status === 'past').map(card)}</div>
        </>
      ) : (
        <>
          <button onClick={() => setSelected(null)} className="text-[13px] text-brand-600 font-bold">← 返回列表</button>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-base mb-2">{meeting.title}</h2>
              {isLeader && <button onClick={() => remove(meeting)} className="text-[13px] text-rose-600 font-bold">🗑 刪除</button>}
            </div>
            <div className="text-[13px] text-slate-500 space-y-0.5 mb-4">
              <div>📅 {meeting.date} · ⏰ {meeting.time} · 📍 {meeting.location}</div>
              <div>{meeting.status === 'upcoming' ? '🟢 即將進行' : '📁 已結束'}</div>
            </div>
            <h3 className="font-bold text-xs mb-2">📎 文件 ({meeting.files.length})</h3>
            {meeting.files.length === 0 ? (
              <p className="text-[13px] text-slate-500">暫無文件</p>
            ) : (
              <div className="space-y-1.5">
                {meeting.files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{f.name.endsWith('.pdf') ? '📄' : f.name.endsWith('.xlsx') ? '📊' : f.name.endsWith('.docx') ? '📝' : '📦'}</span>
                      <div><div className="text-[13px] font-bold">{f.name}</div><div className="text-[13px] text-slate-500">{f.size}</div></div>
                    </div>
                    <span className="text-[13px] text-brand-600 font-bold">下載 →</span>
                  </div>
                ))}
              </div>
            )}
            {isLeader && <button onClick={() => openEdit(meeting)} className="w-full mt-4 text-[13px] font-bold text-slate-700 bg-slate-100 rounded-xl py-2">✏️ 編輯會議資料</button>}
          </div>
        </>
      )}

      {form && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-sm m-0">{form.id ? '✏️ 編輯會議' : '➕ 新增會議'}</h3>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">名稱<input className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：十月份領袖會議" /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">日期<input type="date" className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">時間<input className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="19:00-21:00" /></label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-slate-600">地點<input className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="旅團部" /></label>
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
