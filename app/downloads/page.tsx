import Link from 'next/link';

// 模板下載：純粹係「下載模板」，唔放任何模式／教學說明。
// 通告有咩做法、點樣用模板，一律喺「通告管理」（活動頁內）告知，唔喺呢度重複。
const TEMPLATES = [
  {
    icon: '⚙️',
    title: 'GS 初始化模板',
    desc: '建立工作表、Config、角色、支部及預設欄位。新旅團接入必裝。',
    href: '/downloads/SCOUTSYSTEM_2_SETUP.gs.txt',
    tag: '必要',
  },
  {
    icon: '🏕️',
    title: '活動通告格式',
    desc: '俾未有自己通告格式嘅旅團用：一個活動一張，例如露營、訓練、服務。',
    href: '/downloads/SCOUTSYSTEM_ACTIVITY_NOTICE_TEMPLATE.txt',
  },
  {
    icon: '🤝',
    title: '會議通告格式',
    desc: '會議議程／通知用，簡單一頁。',
    href: '/downloads/SCOUTSYSTEM_MEETING_NOTICE_TEMPLATE.txt',
  },
  {
    icon: '📄',
    title: '一般通告 Word 模板',
    desc: '一般資訊性通告（舊版 Word 格式）。',
    href: '/downloads/SCOUTSYSTEM_NOTICE_WORD_TEMPLATE.txt',
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
          撳「下載」攞模板；點樣用、有咩做法，睇返「通告管理」頁內說明。
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
                  <span className="text-[12px] font-black bg-brand-100 text-brand-700 rounded-full px-2 py-0.5">{t.tag}</span>
                )}
              </span>
              <span className="block text-sm text-slate-500 mt-0.5 leading-relaxed">{t.desc}</span>
            </span>
            <span className="text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-2.5 py-1.5 flex-shrink-0">⬇️ 下載</span>
          </a>
        ))}
      </div>
    </div>
  );
}
