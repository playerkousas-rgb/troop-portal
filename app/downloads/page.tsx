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
    title: '活動通告格式（選用作）',
    desc: '俾未有自己通告格式嘅旅團用：一個活動一張，例如露營、訓練、服務。已有自己格式嘅旅團可以完全唔用，直接把通告放 Drive 貼連結就得。',
    href: '/downloads/SCOUTSYSTEM_ACTIVITY_NOTICE_TEMPLATE.txt',
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
          GS 模組下載後全選複製，貼進 Google Apps Script 編輯器即可。通告則有兩種做法，見下面。
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

      {/* 通告：兩種方法（各旅團有自己的通告模樣，所以唔強制用模板）*/}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
        <h2 className="font-bold text-xs text-slate-800 m-0">📎 活動通告：三種方法，任揀</h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="font-bold text-[11px] text-slate-700">方法一 · 用自己嘅通告（建議）</div>
          <p className="text-[11px] text-slate-500 mt-1 m-0 leading-relaxed">
            旅團用自己嘅 Word／PDF 格式，放喺 Google Drive，喺活動入面貼連結。成員喺 APP 撳連結就跳去睇通告；
            同一時間有多張通告會做成下拉式清單。內文摘要由領袖自己填（系統唔會自動翻譯通告內容，避免唔準確）。
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="font-bold text-[11px] text-slate-700">方法二 · 用平台模板</div>
          <p className="text-[11px] text-slate-500 mt-1 m-0 leading-relaxed">
            未有自己格式嘅旅團，可以用上面嘅「活動通告格式」模板，填好再上傳。
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="font-bold text-[11px] text-slate-700">方法三 · 直接喺 APP 內建內容</div>
          <p className="text-[11px] text-slate-500 mt-1 m-0 leading-relaxed">
            打破「一定要出一張通告」嘅框框：領袖直接喺活動入面輸入通告內容（日期、地點、費用、要帶咩、集合時間…），
            成員喺 APP 即刻睇到，唔使開檔案、唔使下載。適合簡單活動或臨時改動。
          </p>
        </div>
      </section>

      {/* 行事曆：唔使模板 */}
      <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
        💡 <strong>行事曆唔使模板</strong>：恆常集會只要喺行事曆頁輸入一次就會自動重複；新增活動時會一併自動加入行事曆，
        全部直接喺前端加或改，再寫入 Google Sheet。
      </p>
    </div>
  );
}
