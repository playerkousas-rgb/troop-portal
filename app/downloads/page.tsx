import Link from 'next/link';

// 模板下載：只放實際要下載嘅模板。
// 「插件規格」「旅團設定表」已移除（規格性說明唔屬於下載頁）。
// 通告 Word 模板／行事曆 Excel 之後會改放到「公告」同「行事曆」頁，呢度暫時唔放。
const TEMPLATES = [
  {
    icon: '📄',
    title: 'GS 初始化模板',
    desc: '建立工作表、Config、角色、支部及預設欄位。新旅團接入必裝。',
    href: '/downloads/SCOUTSYSTEM_2_SETUP.gs.txt',
    tag: '必要',
  },
  {
    icon: '🏕️',
    title: '活動通告格式',
    desc: '一個活動一張，例如露營、訓練、服務。',
    href: '/downloads/SCOUTSYSTEM_ACTIVITY_NOTICE_TEMPLATE.txt',
  },
  {
    icon: '📅',
    title: '日常集會安排格式',
    desc: '每月／每週集會公告，可一張列多個集會項目。',
    href: '/downloads/SCOUTSYSTEM_MEETING_NOTICE_TEMPLATE.txt',
  },
];

export default function Downloads() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-4">
      {/* ── 返回 ── */}
      <Link href="/" className="no-underline text-[12px] font-bold text-slate-600 hover:text-brand-700 inline-flex items-center gap-1">
        ← 返回首頁
      </Link>

      {/* ── 頁首 ── */}
      <section className="text-center pt-1">
        <div className="text-4xl mb-1" aria-hidden>⬇️</div>
        <h1 className="text-2xl font-black text-brand-700 leading-tight m-0">模板下載</h1>
        <p className="text-[12px] text-slate-500 mt-2 mb-0 leading-relaxed">
          下載後全選複製，貼進 Google Apps Script 編輯器即可。
        </p>
      </section>

      {/* ── 模板清單 ── */}
      <div className="grid gap-2.5">
        {TEMPLATES.map(t => (
          <a
            key={t.href}
            href={t.href}
            download
            className="no-underline text-inherit bg-white rounded-2xl border border-slate-200 p-4 hover:border-brand-300 hover:shadow-sm transition flex items-center gap-3"
          >
            <span className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{t.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-800">{t.title}</span>
                {t.tag && (
                  <span className="text-[10px] font-black bg-brand-100 text-brand-700 rounded-full px-2 py-0.5">{t.tag}</span>
                )}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">{t.desc}</span>
            </span>
            <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-2.5 py-1.5 flex-shrink-0">⬇️ 下載</span>
          </a>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
        💡 列印用嘅通告 Word 模板同埋行事曆 Excel 模板，之後會直接放喺「公告」同「行事曆」頁，方便旅團即場攞用。
      </p>
    </div>
  );
}
