'use client';
export default function AuditPage() {
  const logs = [
    { time: '08-30 14:22', user: '陳管理員', action: '批核申請', entity: '家長申請 #app1', detail: '批准' },
    { time: '08-30 13:15', user: '李團長', action: '新增活動', entity: '旅團露營', detail: '已發布' },
    { time: '08-30 11:40', user: '陳管理員', action: '核實付款', entity: '王小明 → 旅團露營', detail: '$300' },
    { time: '08-29 19:30', user: '黃支部', action: '儲存點名', entity: '童軍 08-29', detail: '28人 P/A/L' },
    { time: '08-29 16:00', user: '陳管理員', action: '修改設定', entity: 'SystemConfig', detail: 'announcement_folder' },
  ];
  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">📜 審核紀錄</h1>
      <div className="space-y-1.5">
        {logs.map((l, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[11px] flex-shrink-0">📋</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[11px]">{l.action}</span>
                <span className="text-[11px] text-slate-500">{l.entity}</span>
              </div>
              <div className="text-[11px] text-slate-500">{l.user} · {l.time} · {l.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
