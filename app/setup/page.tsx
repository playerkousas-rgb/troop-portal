'use client';
import Link from 'next/link';

export default function Setup(){
return <div className="stack">
<section className="hero">
  <span className="badge gold">🧩 接入教學</span>
  <h1>如何接入 2026 Scout System</h1>
  <p>6 步完成。最後一步提交申請，等管理員開通即可使用。</p>
  <Link className="btn gold" href="/onboard">開始接入 →</Link>
</section>

<section className="grid-wide">
  <div className="card">
    <h3>📋 流程總覽</h3>
    <ol className="muted">
      <li><strong>建立 Google Sheet</strong> — 開空白 Sheet</li>
      <li><strong>貼上 Apps Script</strong> — 下載模板，貼到 Apps Script</li>
      <li><strong>執行 Setup</strong> — 彈窗顯示 API Key，<strong>立即複製！</strong></li>
      <li><strong>填寫旅團資料</strong> — SystemConfig 填旅團號、名稱、管理員 Email</li>
      <li><strong>部署 Web App</strong> — 複製 /exec 網址</li>
      <li><strong>提交申請</strong> — 到「申請接入」頁面填入網址和 API Key</li>
    </ol>
    <p className="muted">等管理員開通 → 到首頁選擇旅團 → 用 Email + changeme 登入 → 完成！</p>
  </div>

  <div className="card">
    <h3>🔑 關於 API Key</h3>
    <ul className="muted">
      <li>Setup 彈窗<strong>只顯示一次</strong>，請即複製</li>
      <li>Google Sheet 只存雜湊值（API_KEY_HASH），不存明文</li>
      <li>複製後提交到「申請接入」頁面，管理員存入伺服器環境變數</li>
      <li>忘記了？Sheet 選單 → 重新生成 API Key</li>
    </ul>
  </div>
</section>

<section className="card">
  <h3>你需要準備</h3>
  <div className="grid-wide">
    <div>
      <p className="muted">✅ Google 帳號</p>
      <p className="muted">✅ 旅團名稱及旅團號（如 0082）</p>
      <p className="muted">✅ 第一位管理員 Email</p>
    </div>
    <div>
      <p className="muted">✅ 空白 Google Sheet</p>
      <p className="muted">✅ GS 模板（<Link href="/downloads">下載</Link>）</p>
      <p className="muted">✅ 成員 YMIS 編號（10 位數字）</p>
    </div>
  </div>
</section>

<section className="card">
  <h3>⚠️ 常見問題</h3>
  <dl className="muted">
    <dt>看不到我的旅團？</dt>
    <dd>代表尚未開通。請先到「申請接入」提交，等管理員確認。</dd>
    <dt>忘記了 API Key？</dt>
    <dd>到 Google Sheet 選單 → 2026 Scout System → 重新生成 API Key，把新 Key 提交給管理員。</dd>
    <dt>Deploy 後出現 Access Denied？</dt>
    <dd>確認「誰可以存取」設成了「任何人」，不是「只有我自己」。</dd>
    <dt>登入後看不到成員？</dt>
    <dd>確認 Members 表有填 ymNumber（10 位數字），且成員的 active = TRUE。</dd>
  </dl>
</section>
</div>}
