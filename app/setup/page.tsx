import Link from 'next/link';

// 新旅團申請及教學：GS 模組下載直接做咗流程入面嘅一步（第 2 步），
// 唔再另外搞「必要下載」卡，亦唔放其他模板（其他模板之後放喺公告／行事曆頁）。
// 步驟順序（對照用戶反饋）：先 RUN SETUP 攞到 API Key → 部署 → 填 FORM 提交申請，
// 最後先喺 Sheet 設定管理員（唔使佢設好晒先嚟搵 API Key 填申請表）。
const STEPS: { icon: string; title: string; desc: string; download?: { label: string; href: string } }[] = [
  { icon: '1️⃣', title: '建立 Google Sheet', desc: '開一個全新嘅空白 Google Sheet（建議用旅團專用 Google 帳號）。' },
  {
    icon: '2️⃣',
    title: '貼上 GS 模組',
    desc: '撳下面下載 GS 模組 → 打開 Sheet 的「擴充功能 → Apps Script」→ 刪除預設內容 → 全選貼上 → 儲存。',
    download: { label: '⬇️ 下載 GS 模組（必要）', href: '/downloads/SCOUTSYSTEM_2_SETUP.gs.txt' },
  },
  { icon: '3️⃣', title: '執行 Setup 並複製 API Key', desc: '喺 Apps Script 選 setup 再執行；彈窗會顯示 API Key，只顯示一次，立即複製！（之後填申請表會用到）' },
  { icon: '4️⃣', title: '部署 Web App', desc: 'Deploy → New deployment → Web app；「誰可以存取」揀「任何人」，複製 /exec 網址。' },
  { icon: '5️⃣', title: '填寫申請（提交 FORM）', desc: '喺「申請接入」頁填入旅團號、旅團名稱、/exec 網址同 API Key（第 3 步複製嘅），提交後等平台管理員審核開通。' },
  { icon: '6️⃣', title: '開通後，先喺 Sheet 設定管理員', desc: '等管理員開通後，先返去 Sheet 填 SystemConfig（旅團號／名稱／管理員 Email）、Members，再用「重新建立管理員帳號」生成登入密碼。唔使喺提交申請前就設定晒。' },
];

export default function Setup() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-4">
      {/* ── 返回 ── */}
      <Link href="/" className="no-underline text-[12px] font-bold text-slate-600 hover:text-brand-700 inline-flex items-center gap-1">
        ← 返回首頁
      </Link>

      {/* ── 頁首 ── */}
      <section className="text-center pt-1">
        <div className="text-4xl mb-1" aria-hidden>📖</div>
        <h1 className="text-2xl font-black text-brand-700 leading-tight m-0">新旅團申請及教學</h1>
        <p className="text-[12px] text-slate-500 mt-2 mb-0 leading-relaxed">
          6 步完成接入。所需 GS 模組喺第 2 步直接下載，唔使跳出嚟搵；第 3 步執行 Setup 後複製 API Key，第 5 步填申請表就會用到。設定管理員留到最後（第 6 步）。
        </p>
        <Link href="/onboard" className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl no-underline hover:bg-brand-700 transition mt-3">
          開始接入 →
        </Link>
      </section>

      {/* ── 流程（GS 下載 = 第 2 步）── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
        <h2 className="font-bold text-sm flex items-center gap-2 mt-0 mb-1">
          <span className="w-7 h-7 bg-brand-600 text-white rounded-lg flex items-center justify-center text-sm">📋</span>
          流程總覽
        </h2>

        {STEPS.map(s => (
          <div key={s.title} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="text-lg leading-none flex-shrink-0">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[13px] text-slate-800">{s.title}</div>
                <p className="text-[11px] text-slate-500 mt-1 m-0 leading-relaxed">{s.desc}</p>
                {s.download && (
                  <a
                    href={s.download.href}
                    download
                    className="inline-flex items-center gap-2 bg-brand-600 text-white text-[11px] font-bold px-3 py-2 rounded-xl no-underline hover:bg-brand-700 transition mt-2"
                  >
                    {s.download.label}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}

        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
          ✅ 等管理員開通後 → 先喺 Sheet 設定管理員（SystemConfig + Members + 重新建立管理員帳號）→ 回首頁選擇旅團 → 用管理員 Email ＋初始密碼登入 → 即時改密碼 → 完成。
        </p>
      </section>

      {/* ── API Key ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h2 className="font-bold text-sm flex items-center gap-2 mt-0 mb-2">
          <span className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center text-sm">🔑</span>
          關於 API Key
        </h2>
        <ul className="text-[11px] text-slate-600 leading-relaxed m-0 pl-5 space-y-1">
          <li>Setup 彈窗<strong>只顯示一次</strong>，請即複製。</li>
          <li>Google Sheet 只存雜湊值（API_KEY_HASH），唔會存明文。</li>
          <li>複製後提交到「申請接入」頁，由平台管理員存入伺服器環境變數。</li>
          <li>忘記咗？Sheet 選單 → 2026 Scout System → 重新生成 API Key。</li>
        </ul>
      </section>

      {/* ── 你需要準備 ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h2 className="font-bold text-sm flex items-center gap-2 mt-0 mb-2">
          <span className="w-7 h-7 bg-slate-600 text-white rounded-lg flex items-center justify-center text-sm">🎒</span>
          你需要準備
        </h2>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <p className="m-0">✅ Google 帳號</p>
          <p className="m-0">✅ 空白 Google Sheet</p>
          <p className="m-0">✅ 旅團名稱及旅團號（如 0082）</p>
          <p className="m-0">✅ GS 模組（第 2 步下載）</p>
          <p className="m-0">✅ 第一位管理員 Email</p>
          <p className="m-0">✅ 成員 YMIS 編號（10 位數字）</p>
        </div>
      </section>

      {/* ── 常見問題 ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h2 className="font-bold text-sm flex items-center gap-2 mt-0 mb-2">
          <span className="w-7 h-7 bg-rose-500 text-white rounded-lg flex items-center justify-center text-sm">⚠️</span>
          常見問題
        </h2>
        <dl className="text-[11px] m-0 space-y-2">
          <div>
            <dt className="font-bold text-slate-700">看不到我的旅團？</dt>
            <dd className="text-slate-500 m-0 ml-0 mt-0.5">代表尚未開通。請先提交「申請接入」，等平台管理員確認。</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-700">忘記了 API Key？</dt>
            <dd className="text-slate-500 m-0 ml-0 mt-0.5">Google Sheet 選單 → 2026 Scout System → 重新生成 API Key，再把新 Key 提交給管理員。</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-700">Deploy 後出現 Access Denied？</dt>
            <dd className="text-slate-500 m-0 ml-0 mt-0.5">確認「誰可以存取」設成「任何人」，而不是「只有我自己」。</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-700">登入後看不到成員？</dt>
            <dd className="text-slate-500 m-0 ml-0 mt-0.5">確認 Members 表有填 ymNumber（10 位數字），而且成員的 active = TRUE。</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
