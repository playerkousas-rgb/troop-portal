#!/usr/bin/env node
/**
 * check:links —— 路由 gate 一致性 ＋ 連結完整性檢查
 *
 * ## 點解要有呢個 check
 *
 * 2026-09-03 做咗一次全 repo 連結審計（601 條「源頁可達 × 對外連結」組合），
 * 搵到 **4 條真斷連結**，全部同一個根因：每頁嘅 `<Auth roles={[...]}>` 同
 * 每條 link 嘅顯示條件**各自 hardcode 角色列表**，兩邊會 drift。
 *
 *   1. `/admin/members`（gate 收 coach）入面條「📥 批量開戶」link 完全冇守衛，
 *      但目標 `/admin/users` gate 唔收 coach → 教練員撳落去撞「未獲授權」牆。
 *   2. `/equipment`（冇 gate）用 `LEADER_ROLES`（包 coach）決定 show 唔 show
 *      「🛠️ 物資管理」掣，但目標 `/admin/equipment` gate 唔收 coach → 同一個牆。
 *   3./4. `/leader` 冇 gate 就 `redirect('/admin')`，家長／成員跟舊書籤入嚟撞牆。
 *
 * 修法係建 `lib/routeAccess.ts` 做單一真相來源。呢個 script 就係防止佢再 drift：
 *
 *   §1 每頁 `<Auth roles>` 必須同 `ROUTE_ROLES` 完全一致
 *   §2 `ROUTE_ROLES` 入面每個 route 必須真係有對應嘅 page.tsx（冇懸空登記）
 *   §3 全 repo 引用嘅內部路徑必須存在（app route 或 public/ 靜態檔案）
 *   §4 `/leader` 唔可以再無條件 redirect 去有 gate 嘅頁
 *
 * ⚠️ 呢個 check **測唔到條件渲染**：靜態掃描分唔到「條 link 只對有權限嘅角色
 *    顯示」同「條 link 對所有人顯示」。所以 §3 只報「目標唔存在」呢種硬錯誤；
 *    gate drift 由 §1 負責（嗰個係可以靜態判定嘅）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTE_ROLES, canAccessRoute } from '../lib/routeAccess.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
const errors = [];
const ok = (name, cond, detail = '') => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { errors.push(name); console.log(`  ❌ ${name}${detail ? `\n       ${detail}` : ''}`); }
};

// ---------- 收集 app route ----------
const routes = new Set();
const pageText = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'page.tsx') {
      const rel = path.relative(path.join(ROOT, 'app'), dir).split(path.sep).filter(Boolean).join('/');
      const route = '/' + rel;
      routes.add(route === '/' ? '/' : route.replace(/\/$/, ''));
      pageText.set(route === '/' ? '/' : route.replace(/\/$/, ''), fs.readFileSync(p, 'utf8'));
    }
  }
})(path.join(ROOT, 'app'));

// ---------- 收集全 repo 原始碼 ----------
const srcFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', '.mockdata', 'public', 'dist', 'out'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) srcFiles.push(p);
  }
})(ROOT);

const rel = (p) => path.relative(ROOT, p);

// ==================== §1 gate 一致性 ====================
console.log('\n【§1 每頁 <Auth roles> 必須同 ROUTE_ROLES 完全一致】');
{
  const gateRe = /<Auth[^>]*roles=\{\[([^\]]*)\]/;
  let checked = 0;
  for (const [route, txt] of pageText) {
    const m = txt.match(gateRe);
    if (!m) {
      // 冇 gate ＝ 公開頁，ROUTE_ROLES 亦唔應該登記佢
      ok(`${route} 冇 gate（公開頁）→ ROUTE_ROLES 冇登記`, !ROUTE_ROLES[route],
        `ROUTE_ROLES 有登記：${JSON.stringify(ROUTE_ROLES[route])}`);
      continue;
    }
    checked++;
    const inPage = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
    const inMap = (ROUTE_ROLES[route] || []).slice().sort();
    ok(`${route} gate 同 ROUTE_ROLES 一致`,
      inPage.length === inMap.length && inPage.every((r, i) => r === inMap[i]),
      `page.tsx=[${inPage.join(',')}]  ROUTE_ROLES=[${inMap.join(',')}]`);
  }
  console.log(`  （檢查咗 ${checked} 個有 gate 嘅頁面）`);
}

// ==================== §2 ROUTE_ROLES 冇懸空登記 ====================
console.log('\n【§2 ROUTE_ROLES 每個 route 都要真係存在】');
for (const route of Object.keys(ROUTE_ROLES).sort()) {
  ok(`ROUTE_ROLES['${route}'] 有對應 page.tsx`, routes.has(route),
    `app 入面搵唔到 ${route}/page.tsx`);
}

// ==================== §3 內部連結完整性 ====================
console.log('\n【§3 全 repo 引用嘅內部路徑必須存在】');
{
  const pat = /(?:href\s*[:=]\s*|router\.push\(\s*|router\.replace\(\s*|redirect\(\s*)['"`](\/[^'"`$]*)['"`]/g;
  const refs = new Map();
  for (const f of srcFiles) {
    const txt = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = pat.exec(txt))) {
      const raw = m[1];   // JS regex exec() 回陣列，唔係 Python 嘅 match 物件
      const target = (raw.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/');
      if (!refs.has(target)) refs.set(target, []);
      refs.get(target).push(`${rel(f)}:${txt.slice(0, m.index).split('\n').length}`);
    }
  }
  let checked = 0;
  for (const [target, locs] of [...refs].sort()) {
    checked++;
    const isRoute = routes.has(target);
    // public/ 入面嘅靜態檔案（例如 /downloads/*.txt）唔係 app route，但一樣要存在
    const staticPath = path.join(ROOT, 'public', target);
    const isStatic = fs.existsSync(staticPath);
    ok(`${target} 存在${isStatic ? '（public/ 靜態檔案）' : ''}`, isRoute || isStatic,
      `引用位置：${locs.slice(0, 4).join(', ')}${locs.length > 4 ? ` …等 ${locs.length} 處` : ''}`);
  }
  console.log(`  （檢查咗 ${checked} 個唔同嘅內部路徑）`);
}

// ==================== §4 /leader 唔可以再無條件撞牆 ====================
console.log('\n【§4 legacy redirect 頁唔可以再無條件送去有 gate 嘅頁】');
{
  const p = path.join(ROOT, 'app/leader/page.tsx');
  const raw = fs.readFileSync(p, 'utf8');
  /**
   * ★ 必須剝走註釋先至 match。
   *
   * 呢個頁嘅文件註釋刻意寫低咗舊行為 `redirect('/admin')` 做解說，
   * 直接 match 原文會**假失敗**（我第一版就中咗呢個陷阱）。
   */
  const txt = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comment
    .replace(/^\s*\/\/.*$/gm, '');          // line comment
  const naive = /redirect\(\s*['"]\/admin['"]\s*\)/.test(txt);
  ok('/leader 唔再無條件 redirect(\'/admin\')', !naive,
    '仲係 redirect(\'/admin\')：家長／成員跟舊書籤入嚟會撞「未獲授權」牆');
  ok('/leader 用 dashboardFor() 決定目標', /dashboardFor\(/.test(txt),
    '應該用 dashboardFor(role) —— 同 app/page.tsx 登入後跳轉同一個函數');
  ok('/leader 係 client component（先讀到 localStorage session）',
    /^'use client'/m.test(txt),
    'session 只存喺 localStorage，server component 讀唔到 → 所有人都會被當未登入');

  // 行為驗證：每個角色都要去到一个佢入到嘅頁
  const { dashboardFor } = await import('../lib/session.ts');
  for (const role of ['super_admin', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach', 'parent', 'member']) {
    const target = dashboardFor(role);
    ok(`  ${role} → ${target}（目標收呢個角色）`, canAccessRoute(target, role),
      `dashboardFor('${role}') = ${target}，但 ROUTE_ROLES 唔收 ${role}`);
  }
}

// ==================== §5 孤兒頁偵測（每個 route 都要可達） ====================
/**
 * §3 只驗證「被連結嘅路徑存在」，冇驗證反方向 ——「存在嘅路徑有冇人連過去」。
 * 2026-09-03 審計就漏咗呢一類：demo 樹有 5 個頁面完全冇入站連結
 * （/dashboard/admin/{settings,plugins,branches}、/dashboard/{marketplace,connectors}），
 * 因為管理中心嘅「系統管理」卡直接指去 leaf 頁 /dashboard/admin/audit，
 * 而正式版係指去 hub 頁 /admin/system 再分流。用戶永遠到唔到嗰 5 頁。
 *
 * ★★ 呢度有個我踩過兩次嘅陷阱，務必保留：
 *   引用唔止 `href="/x"` 一種寫法。實際見過 4 種：
 *     1. href="/badges"                      （精確字串）
 *     2. href={`/badges?member=${c.id}`}     （模板字串 —— 有 $ 插值）
 *     3. { href: '/badges' }                 （物件屬性，array.map 砌卡）
 *     4. router.push('/x') / redirect('/x')
 *   §3 嘅 regex 用 [^'"`$]* **刻意排除 $**（因為模板字串嘅完整路徑攞唔到），
 *   所以形式 2 完全唔會被 §3 捕捉。我頭兩次 grep 就因為只配形式 1，
 *   誤判 `/badges` 係死碼 —— 佢其實有 /member:42 同 /parent:201 兩條入站連結。
 *   下面嘅 INBOUND 刻意用「路徑前綴」比對，4 種形式一律計。
 */
console.log('\n【§5 每個 app route 都要有入站連結（唔可以有孤兒頁）】');
{
  /**
   * ★ 第一版用 `href=|router.push|redirect(` 做前綴，結果 6 個假陽性。
   *   實際見過嘅引用形式遠多過呢三種：
   *     1. href="/badges"                                  精確字串
   *     2. href={`/badges?member=${c.id}`}                 模板字串（有 $ 插值）
   *     3. { href: '/badges' }                             物件屬性（array.map 砌卡）
   *     4. href: canUsers ? '/admin/users?tab=x' : '/admin/applications'   三元
   *     5. href: isDemo ? '/dashboard' : (role === 'parent' ? '/parent' : …)  嵌套三元
   *   形式 4/5 嘅引號唔緊跟 `href:`，任何「前綴式」regex 都會漏。
   *   → 改成：**剝走註解後，配任何引號包住嘅內部路徑**，再排除已知非連結來源。
   *
   * ★ 剝註解係必須嘅（§4 已經踩過）：lib/routeAccess.ts 同 app/leader/page.tsx
   *   嘅文件註釋刻意寫低咗路徑做解說，唔剝就會假陽性。
   */
  const QUOTED_PATH = /['"`](\/[A-Za-z0-9\-_/]*)/g;

  /** 呢啲檔／陣列列出嚟嘅路徑唔係連結，要排除 */
  const NOT_A_LINK_FILES = new Set([
    'lib/routeAccess.ts',   // 路由登記表（gate 定義），唔係導航
  ]);
  // HIDDEN_PATHS 係「呢啲頁唔顯示 bottom nav」嘅排除清單，列出嚟≠連過去
  const stripNonLinkArrays = (txt) => txt.replace(/const\s+HIDDEN_PATHS\s*=\s*\[[^\]]*\]/g, '');

  const inbound = new Map();   // route → [引用位置]
  for (const f of srcFiles) {
    const selfFile = rel(f);
    if (NOT_A_LINK_FILES.has(selfFile)) continue;
    const txt = stripNonLinkArrays(fs.readFileSync(f, 'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g, '')   // block comment
      .replace(/^\s*\/\/.*$/gm, '');      // line comment
    let m;
    while ((m = QUOTED_PATH.exec(txt))) {
      const raw = m[1].replace(/\/+$/, '') || '/';
      const line = txt.slice(0, m.index).split('\n').length;
      if (!inbound.has(raw)) inbound.set(raw, []);
      inbound.get(raw).push(`${selfFile}:${line}`);
    }
  }

  /**
   * 刻意唔需要入站連結嘅頁。加新條目要寫理由 —— 呢個 allowlist 應該長期保持極短。
   */
  const ENTRY_POINTS = new Map([
    // 根頁：app 入口，由瀏覽器直接入
    ['/', 'app 入口，由瀏覽器直接入'],
    // legacy redirect 頁：存在嘅目的就係接舊書籤（見 §4）。
    // 冇任何頁應該連去佢 —— 佢係俾 2026 年前嘅外部書籤／QR code 用。
    ['/leader', 'legacy redirect 頁，專接舊書籤；冇頁應該連去佢（見 §4）'],
    /**
     * 外部引入頁：由站外嘅「童軍通告圖書館」(https://scout-circulars.vercel.app/)
     * 帶住 query 參數跳入嚟（?title=&sourceSite=&deadline=&fee=&audience=）。
     * 頁內 L158 自己寫住「從圖書館引入時，標題、來源、截止、費用、對象已自動帶入」，
     * 而且 app/library/ 根本冇 index 頁 —— 佢唔係站内導航嘅一部分，係外部 entry point。
     * gate 係 ADMIN_BRANCH_COACH（lib/routeAccess.ts:68）。
     */
    ['/library/import', '外部通告圖書館帶 query 參數跳入；app/library/ 冇 index 頁'],
    /**
     * 已接入旅團公開目錄頁。
     *
     * ★ 2026-09-03 問過用戶，佢嘅答覆重新定義咗「公開展示」：
     *   「先連結進旅團，再看旅團是否開放了行事曆等公開資料卡片，
     *     可在不登入情況下觀看（下方 4 大按鈕）其之三」
     *   即係公開展示嘅正常流程係：根頁 `/` 揀旅團 → 底欄三個公開掣
     *   （行事曆／相簿／活動）→ 內容由三張公開卡決定。
     *   呢個流程入面**冇**一個獨立嘅旅團目錄頁，根頁嘅 inline 旅團選擇器
     *   已經做咗「先連結進旅團」呢一步。
     *
     *   用戶冇揀「刪除」，所以保留呢頁做直接網址／QR code 分享用嘅 entry point。
     *   ⚠️ 佢同根頁嘅旅團選擇器功能重疊 —— 如果確定唔需要，刪頁時要一齊清
     *      components/LatestNewsBar.tsx:11 同 components/layout/BottomNav.tsx:39
     *      兩個 HIDDEN_PATHS 陣列入面嘅 '/troops'。
     */
    ['/troops', '已接入旅團公開目錄；正常流程經根頁揀旅團，呢頁只供直接網址分享'],
  ]);

  /**
   * ★★ 淨係數「有冇入站連結」係唔夠嘅 —— 要數「由 entry point 出發現唔現場到」。
   *
   * 我做 negative control 時親身撞到：把管理中心嘅「系統管理」卡由 hub 頁
   * `/dashboard/admin/system` 改返指去 leaf 頁 `/dashboard/admin/audit` 之後，
   * hub 自己變孤兒（✅ 被捉到），但 hub 下面嗰 5 個頁
   * （settings／plugins／branches／marketplace／connectors）**仍然有入站連結**
   * —— 因為佢哋嘅入站連結來自嗰個已經不可達嘅 hub。
   * 用戶實際上已經到唔到佢哋，但「有冇入站連結」呢個判準話佢哋冇事。
   *
   * 所以呢度做真正嘅 BFS 可達性分析：由 ENTRY_POINTS 出發，沿住連結行，
   * 行唔到嘅 route 就係不可達（不論直接定傳遞性）。
   */

  // 每條 route 自己嘅 page.tsx 連去邊
  const pageLinks = new Map();     // route → Set<target route>
  // 全站共用元件嘅 link（app/layout.tsx 渲染 TopNav／LatestNewsBar／BackButton／
  // SiteFooter／BottomNav，所以佢哋嘅 link 由**每一頁**都到）
  const globalLinks = new Set();

  for (const f of srcFiles) {
    const selfFile = rel(f);
    if (NOT_A_LINK_FILES.has(selfFile)) continue;
    const txt = stripNonLinkArrays(fs.readFileSync(f, 'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const isPage = /(^|\/)app\/.*\/page\.tsx$/.test(selfFile.replace(/\\/g, '/'))
      || selfFile.replace(/\\/g, '/') === 'app/page.tsx';
    let owner = null;
    if (isPage) {
      const r = '/' + selfFile.replace(/\\/g, '/').replace(/^app\//, '').replace(/\/page\.tsx$/, '');
      owner = r === '/' ? '/' : r.replace(/\/$/, '');
      if (!pageLinks.has(owner)) pageLinks.set(owner, new Set());
    }
    let m;
    QUOTED_PATH.lastIndex = 0;
    while ((m = QUOTED_PATH.exec(txt))) {
      const raw = m[1].replace(/\/+$/, '') || '/';
      if (!routes.has(raw)) continue;          // 只關心真係 route 嘅目標
      if (owner) pageLinks.get(owner).add(raw);
      else globalLinks.add(raw);               // 共用元件／lib → 全域可達
    }
  }

  // BFS
  const reached = new Set();
  const queue = [...ENTRY_POINTS.keys()].filter((r) => routes.has(r));
  while (queue.length) {
    const cur = queue.shift();
    if (reached.has(cur)) continue;
    reached.add(cur);
    const next = new Set([...(pageLinks.get(cur) || []), ...globalLinks]);
    for (const n of next) if (!reached.has(n)) queue.push(n);
  }

  let unreachable = 0;
  for (const route of [...routes].sort()) {
    if (ENTRY_POINTS.has(route)) {
      console.log(`  ⏭️  ${route} —— entry point（${ENTRY_POINTS.get(route)}）`);
      passed++;
      continue;
    }
    const directIn = (inbound.get(route) || []).filter(
      (l) => !l.startsWith(`app${route === '/' ? '' : route}/page.tsx:`),
    );
    if (reached.has(route)) {
      ok(`${route} 可達`, true);
    } else {
      unreachable++;
      ok(`${route} 可達`, false,
        directIn.length === 0
          ? '完全冇入站連結 → 用戶永遠到唔到（直接孤兒頁）。'
          : `有入站連結（${directIn.slice(0, 3).join(', ')}）但**上游自己不可達** → `
            + '傳遞性孤兒頁：用戶一樣到唔到。要修上游，唔係修呢頁。',
      );
    }
  }
  console.log(`  （檢查咗 ${routes.size} 個 route；由 ${ENTRY_POINTS.size} 個 entry point 出發可達 ${reached.size} 個；不可達 ${unreachable} 個）`);
}

// ==================== 結果 ====================
console.log('');
if (errors.length) {
  console.log(`❌ 連結檢查失敗：${errors.length} 項（通過 ${passed} 項）`);
  errors.forEach((e) => console.log(`   ・${e}`));
  process.exit(1);
}
console.log(`✅ 路由 gate 一致 ＋ 連結完整（每頁 <Auth> 同 ROUTE_ROLES 對得上；冇斷連結；legacy redirect 唔會撞牆 — ${passed} 項斷言全過）`);
