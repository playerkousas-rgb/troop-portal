'use client';
import { useState } from 'react';

const MEETINGS = [
  { id: 'm1', title: '9月份領袖會議', date: '2026-09-10', time: '19:00-21:00', location: '旅團部', status: 'upcoming' as const, agenda: true, minutes: false, files: [{ name: '議程.pdf', size: '120KB' }, { name: '預算表.xlsx', size: '45KB' }, { name: '活動計劃.docx', size: '89KB' }] },
  { id: 'm2', title: '週年大會', date: '2026-10-15', time: '14:00-17:00', location: '社區中心', status: 'upcoming' as const, agenda: false, minutes: false, files: [] },
  { id: 'm3', title: '8月份領袖會議', date: '2026-08-12', time: '19:00-21:00', location: '旅團部', status: 'past' as const, agenda: true, minutes: true, files: [{ name: '議程.pdf', size: '110KB' }, { name: '會議紀錄.pdf', size: '250KB' }, { name: '照片.zip', size: '3.2MB' }] },
];

export default function MeetingsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const meeting = MEETINGS.find(m => m.id === selected);

  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">🤝 會議</h1>

      {!meeting ? (
        <>
          <h2 className="font-bold text-sm text-slate-600">即將進行</h2>
          <div className="space-y-2">
            {MEETINGS.filter(m => m.status === 'upcoming').map(m => (
              <button key={m.id} onClick={() => setSelected(m.id)} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 card-hover">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{m.title}</span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">即將進行</span>
                </div>
                <div className="text-[11px] text-slate-500">📅 {m.date} · ⏰ {m.time} · 📍 {m.location}</div>
                {m.files.length > 0 && <div className="text-[11px] text-brand-600 mt-1">📎 {m.files.length} 個文件</div>}
              </button>
            ))}
          </div>
          <h2 className="font-bold text-sm text-slate-600 mt-4">已結束</h2>
          <div className="space-y-2">
            {MEETINGS.filter(m => m.status === 'past').map(m => (
              <button key={m.id} onClick={() => setSelected(m.id)} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 card-hover opacity-70">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{m.title}</span>
                  <span className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">已結束</span>
                </div>
                <div className="text-[11px] text-slate-500">📅 {m.date} · ⏰ {m.time} · 📍 {m.location}</div>
                {m.files.length > 0 && <div className="text-[11px] text-brand-600 mt-1">📎 {m.files.length} 個文件</div>}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setSelected(null)} className="text-[11px] text-brand-600 font-bold">← 返回列表</button>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-base mb-2">{meeting.title}</h2>
            <div className="text-[11px] text-slate-500 space-y-0.5 mb-4">
              <div>📅 {meeting.date} · ⏰ {meeting.time} · 📍 {meeting.location}</div>
              <div>{meeting.status === 'upcoming' ? '🟢 即將進行' : '📁 已結束'}</div>
            </div>
            <h3 className="font-bold text-xs mb-2">📎 文件 ({meeting.files.length})</h3>
            {meeting.files.length === 0 ? (
              <p className="text-[11px] text-slate-500">暫無文件</p>
            ) : (
              <div className="space-y-1.5">
                {meeting.files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{f.name.endsWith('.pdf') ? '📄' : f.name.endsWith('.xlsx') ? '📊' : f.name.endsWith('.docx') ? '📝' : '📦'}</span>
                      <div><div className="text-[11px] font-bold">{f.name}</div><div className="text-[11px] text-slate-500">{f.size}</div></div>
                    </div>
                    <span className="text-[11px] text-brand-600 font-bold">下載 →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
