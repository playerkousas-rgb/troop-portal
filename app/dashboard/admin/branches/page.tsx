'use client';
export default function BranchesPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">🏢 支部與小隊設定</h1>
      {[
        { id: 'b1', name: '小童軍', members: 8, patrols: 0, note: '預設沒有分隊' },
        { id: 'b2', name: '幼童軍', members: 22, patrols: 4, note: '按顏色分隊 (RED/YELLOW/BLUE/GREEN)' },
        { id: 'b3', name: '童軍', members: 28, patrols: 3, note: '按動物小隊 (TIGER/SEAGULL/WOLF)' },
        { id: 'b4', name: '深資童軍', members: 16, patrols: 0, note: '預設沒有分隊' },
        { id: 'b5', name: '樂行童軍', members: 12, patrols: 0, note: '預設沒有分隊' },
      ].map(b => (
        <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm">{b.name}</span>
            <span className="text-[10px] text-slate-400">{b.members} 人 · {b.patrols} 小隊</span>
          </div>
          <p className="text-[10px] text-slate-500">{b.note}</p>
          <div className="flex gap-2 mt-2">
            <button className="text-[9px] text-brand-600 font-bold">管理小隊 →</button>
            <button className="text-[9px] text-slate-500 font-bold">編輯支部 →</button>
          </div>
        </div>
      ))}
    </main>
  );
}
