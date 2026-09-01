'use client';
import { useState } from 'react';

const APPLICATIONS = [
  { id: 'app1', type: 'parent' as const, name: '陳爸爸', email: 'chan@ex.com', branch: '童軍', status: 'pending' as const, date: '2026-08-28' },
  { id: 'app2', type: 'member' as const, name: '劉小華', ymNumber: '5678901234', branch: '幼童軍', status: 'pending' as const, date: '2026-08-27' },
  { id: 'app3', type: 'leader' as const, name: '何教練', email: 'ho@ex.com', branch: '童軍', status: 'approved' as const, date: '2026-08-20' },
  { id: 'app4', type: 'supplies' as const, name: '帳篷借用', requester: '王小明', branch: '童軍', status: 'pending' as const, date: '2026-08-29' },
];

export default function ApplicationsPage() {
  const [tab, setTab] = useState<'pending' | 'history' | 'supplies'>('pending');

  const pendingApps = APPLICATIONS.filter(a => a.status === 'pending' && a.type !== 'supplies');
  const pendingSupplies = APPLICATIONS.filter(a => a.status === 'pending' && a.type === 'supplies');
  const historyApps = APPLICATIONS.filter(a => a.status !== 'pending');

  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">✅ 批核中心</h1>

      <div className="flex gap-1.5">
        {[{ id: 'pending' as const, label: '⏳ 待批核', count: pendingApps.length }, { id: 'supplies' as const, label: '📦 物資', count: pendingSupplies.length }, { id: 'history' as const, label: '📊 紀錄' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`text-[13px] px-3 py-1.5 rounded-full font-bold border ${tab === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            {t.label} {'count' in t && t.count ? `(${t.count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        <div className="space-y-2">
          {pendingApps.length === 0 && <p className="text-center text-sm text-slate-500 py-8">沒有待批核的申請</p>}
          {pendingApps.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                    {a.type === 'parent' ? '👨‍👩‍👧 家長' : a.type === 'member' ? '🧒 成員' : '👤 領袖'}
                  </span>
                  <span className="font-bold text-xs">{a.name}</span>
                </div>
                <span className="text-[13px] text-slate-500">{a.date}</span>
              </div>
              <div className="text-[13px] text-slate-500 space-y-0.5">
                {'email' in a && <div>Email: {a.email}</div>}
                {'ymNumber' in a && <div>YMIS: {a.ymNumber}</div>}
                <div>支部：{a.branch}</div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 text-[13px] font-bold py-2 rounded-lg bg-emerald-700 text-white">✅ 批核</button>
                <button className="flex-1 text-[13px] font-bold py-2 rounded-lg bg-rose-100 text-rose-700">❌ 拒絕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'supplies' && (
        <div className="space-y-2">
          {pendingSupplies.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">📦 {a.name}</span>
                <span className="text-[13px] text-slate-500">{a.date}</span>
              </div>
              <div className="text-[13px] text-slate-500">申請人：{a.requester} · {a.branch}</div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 text-[13px] font-bold py-2 rounded-lg bg-emerald-700 text-white">✅ 批核借用</button>
                <button className="flex-1 text-[13px] font-bold py-2 rounded-lg bg-rose-100 text-rose-700">❌ 拒絕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {historyApps.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between opacity-70">
              <div className="flex items-center gap-2">
                <span className={`text-[13px] px-1.5 py-0.5 rounded font-bold ${a.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {a.status === 'approved' ? '✅ 已批核' : '❌ 已拒絕'}
                </span>
                <span className="font-bold text-[13px]">{a.name}</span>
                <span className="text-[13px] text-slate-500">{a.branch}</span>
              </div>
              <span className="text-[13px] text-slate-500">{a.date}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
