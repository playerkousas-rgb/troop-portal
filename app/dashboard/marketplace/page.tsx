'use client';
export default function MarketplacePage() {
  const plugins = [
    { name: '進度獎章追蹤', tier: 3, desc: '追蹤成員獎章進度', installed: true },
    { name: '出席統計分析', tier: 2, desc: '分析出席趨勢及圖表', installed: false },
    { name: '活動相冊', tier: 2, desc: '活動照片分享及下載', installed: false },
  ];
  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">🛒 元件市場</h1>
      <p className="text-[11px] text-slate-500">瀏覽及安裝擴充元件。Tier 2 即插即用，Tier 3 需要自設後端。</p>
      <div className="space-y-2">
        {plugins.map((p, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-xl">🧩</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs">{p.name}</span>
                <span className="text-[11px] bg-violet-100 text-violet-700 px-1 py-0.5 rounded font-bold">Tier {p.tier}</span>
              </div>
              <p className="text-[11px] text-slate-500">{p.desc}</p>
            </div>
            <button className={`text-[11px] px-3 py-1.5 rounded-lg font-bold ${p.installed ? 'bg-slate-100 text-slate-500' : 'bg-brand-600 text-white'}`}>
              {p.installed ? '已安裝' : '安裝'}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
