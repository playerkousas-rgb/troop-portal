'use client';
export default function PluginsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">🧩 單位元件設定</h1>
      <p className="text-[11px] text-slate-500">設定第 2/3 級元件的後端 URL 及 API Key。</p>
      {[
        { name: '進度獎章追蹤', tier: 3, backend: '已設定', enabled: true },
        { name: '出席統計分析', tier: 2, backend: '—', enabled: false },
      ].map((p, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">Tier {p.tier}</span>
              <span className="font-bold text-xs">{p.name}</span>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${p.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.enabled ? '啟用' : '停用'}</span>
          </div>
          <div className="text-[11px] text-slate-500">後端：{p.backend}</div>
          {p.tier === 3 && (
            <div className="mt-2 space-y-1.5">
              <input placeholder="後端 Apps Script URL" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]" />
              <input placeholder="API Key" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]" />
              <button className="text-[11px] bg-brand-600 text-white px-3 py-1.5 rounded-lg font-bold">儲存設定</button>
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
