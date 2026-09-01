'use client';
import { useState } from 'react';

const EVENTS = [
  { id: 'a1', title: '旅團露營', date: '9月20-21日', type: 'internal' as const, registered: 32, interested: 8, pending: 12, declined: 5, paid: 28, deadline: '9月15日', expired: false },
  { id: 'a2', title: '區運會', date: '10月5日', type: 'internal' as const, registered: 18, interested: 3, pending: 22, declined: 2, paid: 10, deadline: '9月28日', expired: false },
  { id: 'a3', title: '總區領袖訓練', date: '9月28日', type: 'external' as const, registered: 5, interested: 2, pending: 8, declined: 1, paid: 5, deadline: '已過期', expired: true },
];

const REPLIES = [
  { name: '王小明', branch: '童軍', patrol: 'TIGER', status: 'registered' as const, paid: 'confirmed' as const },
  { name: '李大文', branch: '童軍', patrol: 'SEAGULL', status: 'registered' as const, paid: 'pending' as const },
  { name: '張小芳', branch: '幼童軍', patrol: 'RED', status: 'interested' as const, paid: 'unpaid' as const },
  { name: '陳偉強', branch: '深資', patrol: '', status: 'pending' as const, paid: 'unpaid' as const },
];

export default function RegistrationsPage() {
  const [eventId, setEventId] = useState('a1');
  const event = EVENTS.find(e => e.id === eventId);

  return (
    <main className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">🎫 報名管理</h1>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[13px] font-bold text-slate-500">🏠 旅團內部活動</label>
          <select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white mt-0.5">
            {EVENTS.filter(e => e.type === 'internal').map(e => <option key={e.id} value={e.id}>{e.title} ({e.date})</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[13px] font-bold text-slate-500">📚 外部（圖書館）活動</label>
          <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white mt-0.5">
            {EVENTS.filter(e => e.type === 'external').map(e => <option key={e.id} value={e.id}>{e.title} ({e.date})</option>)}
          </select>
        </div>
      </div>

      {event && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '✅ 報名', value: event.registered, bg: 'bg-emerald-50', text: 'text-emerald-700' },
              { label: '❤️ 有興趣', value: event.interested, bg: 'bg-amber-50', text: 'text-amber-700' },
              { label: '⚠️ 待回覆', value: event.pending, bg: 'bg-slate-100', text: 'text-slate-600' },
              { label: '💰 已付款', value: `${event.paid}/${event.registered}`, bg: event.paid >= event.registered ? 'bg-emerald-50' : 'bg-rose-50', text: event.paid >= event.registered ? 'text-emerald-700' : 'text-rose-700' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-xl px-2 py-2 text-center`}>
                <div className={`text-base font-extrabold ${s.text}`}>{s.value}</div>
                <div className={`text-[13px] font-semibold ${s.text} opacity-80`}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Reply list */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-xs">報名名單 — {event.title}</h3>
              <button className="text-[13px] bg-emerald-700 text-white px-2 py-1 rounded-lg font-bold">📥 匯出 CSV</button>
            </div>
            <div className="space-y-1.5">
              {REPLIES.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[13px]">{r.name}</span>
                      <span className="text-[13px] text-slate-500">{r.branch} · {r.patrol || '—'}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 items-center flex-shrink-0">
                    <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-bold ${
                      r.status === 'registered' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'interested' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {r.status === 'registered' ? '✅' : r.status === 'interested' ? '❤️' : '⚠️'}
                    </span>
                    <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-bold ${
                      r.paid === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                      r.paid === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {r.paid === 'confirmed' ? '💰 已核實' : r.paid === 'pending' ? '💰 待核實' : '❌ 未付'}
                    </span>
                    {/* 領袖可直接核實付款 */}
                    {r.paid !== 'confirmed' && r.status === 'registered' && (
                      <button className="text-[13px] bg-emerald-700 text-white px-1.5 py-0.5 rounded font-bold ml-1">✓ 核實</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
