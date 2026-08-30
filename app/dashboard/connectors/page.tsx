'use client';
export default function ConnectorsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">🔌 轉駁中心</h1>
      <p className="text-[11px] text-slate-500">管理第 3 級元件的連線端點。各旅團可自定義後端 URL 及 API Key。</p>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold text-xs mb-3">已連接元件</h3>
        <div className="space-y-2">
          {[
            { name: '進度獎章追蹤', url: 'https://script.google.com/.../exec', status: 'ok' },
          ].map((c, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
              <div>
                <div className="font-bold text-[11px]">{c.name}</div>
                <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{c.url}</div>
              </div>
              <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">已連接</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
