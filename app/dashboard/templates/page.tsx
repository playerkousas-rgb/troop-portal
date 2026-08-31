'use client';
/* ═══════════════════════════════════════════════════
   MOCK 模板下載（點 2）
   簡單列出可下載嘅模板，詳細說明放返喺活動通告管理度
   ═══════════════════════════════════════════════════ */

const TEMPLATES = [
  { icon: '📋', name: '活動通告格式', desc: 'Excel 格式，填好活動日期、地點、收費等資料後可上傳到 Drive 再貼連結到活動通告度。', file: '/templates/activity_notice_template.xlsx' },
  { icon: '📝', name: '集會點名表', desc: 'Excel 格式，按支部印出嚟點名用。', file: '/templates/attendance_template.xlsx' },
  { icon: '📊', name: '成員資料表', desc: '匯入成員用嘅 CSV 格式。', file: '/templates/member_import_template.csv' },
  { icon: '💰', name: '收費紀錄表', desc: '紀錄成員繳費情況嘅 Excel 格式。', file: '/templates/payment_template.xlsx' },
  { icon: '📦', name: '物資借用申請表', desc: '成員借用物資嘅申請表格式。', file: '/templates/equipment_request_template.xlsx' },
];

export default function TemplatesPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-violet-600 text-white rounded-xl flex items-center justify-center text-sm">📂</span>
        <h1 className="font-bold text-lg m-0">模板下載</h1>
      </div>
      <p className="text-[11px] text-slate-500 m-0 -mt-2 leading-relaxed">
        按需要下載模板，填好後可上傳到 Google Drive 再貼到活動通告／公告度使用。詳細說明去「活動」頁嘅通告管理。
      </p>

      <div className="grid gap-2.5">
        {TEMPLATES.map((t, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs">{t.name}</div>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed">{t.desc}</p>
            </div>
            <a href={t.file} download
              className="bg-violet-600 text-white text-[11px] font-bold px-3 py-2 rounded-xl no-underline hover:bg-violet-700 transition flex-shrink-0">
              ⬇️ 下載
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}