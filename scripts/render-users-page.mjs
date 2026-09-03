/**
 * 真正嘅 client render 測試 —— 驗證「👑 交接旅長」掣同「旅長」金徽章
 * 對唔同角色到底渲染唔渲染得出。
 *
 * ★ 點解要咁麻煩：`/admin/users` 第 478 行係 `if(!s) return <div>載入中...</div>`，
 *   state 由 `useEffect` 載入。所以 `renderToStaticMarkup`（SSR）**永遠到唔到**
 *   嗰個掣 —— HTTP 200 同 SSR 都證明唔到 client render。必须用 jsdom 行 useEffect。
 */
import { JSDOM } from 'jsdom';

// ---------- 1. jsdom 環境（必须喺 import React 之前設好） ----------
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000/',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// Node 22 嘅 globalThis.navigator 係 read-only getter，直接 assign 會 TypeError
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ---------- 2. seed localStorage（session + 選咗嘅旅團） ----------
function seedSession(role, userId, name) {
  localStorage.setItem('scoutsystem2_selected_troop', JSON.stringify({ key: 'troop_demo', id: '0088', name: '演示旅團' }));
  localStorage.setItem('scoutsystem2_current_user', JSON.stringify({
    userId, name, role, troopCode: '0088', troopName: '演示旅團', iat: Date.now(),
  }));
}

// ---------- 3. fetch → 打去真實 dev server（唔好自己砌假資料） ----------
const REAL = 'http://127.0.0.1:3000';
// ★ 必须先把原生 fetch 存起嚟。直接喺 stub 入面 call `fetch(...)` 會解析返去
//   `globalThis.fetch`（即係 stub 自己）→ 無限遞歸 → Maximum call stack size exceeded。
//   （第一版就中咗：fetch 計數飆到 14761 次。）
const nativeFetch = globalThis.fetch.bind(globalThis);
let fetchCount = 0;
globalThis.fetch = async (url, opts) => {
  fetchCount++;
  const u = String(url).startsWith('http') ? String(url) : REAL + String(url);
  return nativeFetch(u, opts);
};

// ---------- 4. import React + 頁面 ----------
const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act } = await import('react');
const { default: ConfirmProvider } = await import('@/components/ConfirmProvider.tsx');
const Page = (await import('@/app/admin/users/page.tsx')).default;

// ---------- 5. 逐個角色 render ----------
async function renderAs(role, userId, name) {
  seedSession(role, userId, name);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(React.createElement(ConfirmProvider, null, React.createElement(Page))); });
  // 等 useEffect 嘅 loadStateSlice 完成
  for (let i = 0; i < 30; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    if (!/載入中/.test(host.textContent || '')) break;
  }
  const html = host.innerHTML;
  const text = host.textContent || '';
  root.unmount();
  host.remove();
  return { html, text };
}

const CASES = [
  ['troop_leader', 'u_tl', '周旅長'],
  ['admin', 'u_admin', '陳堅強'],
  ['group_leader', 'u_gl', '李偉國'],
];

let bad = 0;
const ok = (n, c, d = '') => {
  if (c) console.log(`  ✅ ${n}`);
  else { bad++; console.log(`  ❌ ${n}${d ? `\n       ${d}` : ''}`); }
};

console.log('\n【真正 client render：/admin/users】\n');
for (const [role, uid, name] of CASES) {
  const { html, text } = await renderAs(role, uid, name);
  console.log(`── ${role}（${name}, ${uid}）──`);
  ok('  頁面有 render 出內容（唔係「載入中」/「未獲授權」)',
    !/載入中/.test(text) && text.length > 200,
    `text 長度=${text.length}，開頭：${text.slice(0, 80)}`);

  const handoverCount = (html.match(/交接旅長/g) || []).length;
  const badgeCount = (html.match(/badge gold[^>]*>旅長</g) || []).length;

  if (role === 'troop_leader') {
    ok('  旅長睇到「👑 交接旅長」掣', handoverCount > 0, `出現 ${handoverCount} 次`);
    // 唔應該對自己顯示（u_tl 自己嗰行唔应该有掣）
    ok('  但唔會對自己顯示（掣數 < 用戶數）', handoverCount < 13, `掣=${handoverCount}，用戶=13`);
    ok('  「旅長」金徽章有 render', badgeCount > 0, `badge gold>旅長< 出現 ${badgeCount} 次`);
  } else {
    ok(`  ${role} 睇唔到「交接旅長」掣`, handoverCount === 0, `竟然出現 ${handoverCount} 次`);
  }
  console.log(`     （交接掣 ${handoverCount} 個｜旅長金徽章 ${badgeCount} 個｜fetch ${fetchCount} 次）\n`);
}

// ============================================================================
// 第二階段：/dashboard/** demo 樹嘅旅長（2026-09-03 用戶決定）
//
// 用戶：「多加1個旅長（其實只是 COPY 管理員）讓用戶感覺有而已。」
// demo 樹原本 3 個 local `type Role` 都冇 troop_leader（super_admin 喺 88c783f
// 被移除時一齊冇咗），所以 demo 樹冇辦法展示旅長。而家加返。
//
// ★ 呢度順便鎖死一個真 bug：app/dashboard/calendar/page.tsx 嘅
//   `isAdminRole = role === 'admin'` 係狹窄比較，會漏 troop_leader
//   → 旅長喺 demo 行事曆睇唔到其他支部。而家改成 `|| role === 'troop_leader'`。
//
// ★ 量度方法有兩個陷阱，記錄喺呢度免得重蹈：
//   1. 唔好用 `text.includes('童軍')` 數支部 —— 「童軍」係「幼童軍」嘅子字串，
//      活動標題「幼童軍露營」會假陽性命中。
//   2. 唔好自己砌 BRANCHES —— 真實嘅係 6 個（含「小童軍」），漏一個就數錯。
//   正確做法：攞支部 filter 列（由 visibleBranches render，頭一個掣係「全部」），
//   用**精確**按鈕文字比對。
// ============================================================================
const DemoPage = (await import('@/app/dashboard/calendar/page.tsx')).default;
// 同 app/dashboard/calendar/page.tsx L14 保持一致
const DEMO_BRANCHES = ['小童軍', '幼童軍', '童軍', '深資', '樂行', '全旅'];

function readBranchChips(host) {
  const all = [...host.querySelectorAll('button')];
  const anchor = all.find((b) => (b.textContent || '').trim() === '全部');
  if (!anchor || !anchor.parentElement) return null;
  return [...anchor.parentElement.querySelectorAll('button')]
    .map((b) => (b.textContent || '').trim())
    .filter((t) => t && t !== '全部');
}

async function renderDemoAs(roleLabel) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(React.createElement(DemoPage)); });
  for (let i = 0; i < 20; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    if (!/載入中/.test(host.textContent || '')) break;
  }
  const chip = [...host.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === roleLabel);
  if (chip) {
    await act(async () => { chip.click(); });
    for (let i = 0; i < 10; i++) await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
  }
  const chips = readBranchChips(host);
  root.unmount();
  host.remove();
  return { hasChip: !!chip, chips };
}

console.log('── /dashboard/** demo 樹：旅長角色 ──');
const demoTl = await renderDemoAs('旅長');
const demoAdmin = await renderDemoAs('管理員');
const demoBl = await renderDemoAs('支部領袖');

ok('  demo 行事曆嘅角色選擇器有「旅長」掣', demoTl.hasChip);
ok('  旅長睇到全部 6 個支部（isAdminRole 已包含 troop_leader）',
  demoTl.chips && demoTl.chips.length === DEMO_BRANCHES.length,
  `實際 ${demoTl.chips ? demoTl.chips.length : 'null'}/${DEMO_BRANCHES.length}`);
ok('  旅長 == 管理員（用戶要求「COPY 管理員」）',
  JSON.stringify(demoTl.chips) === JSON.stringify(demoAdmin.chips),
  `旅長=${JSON.stringify(demoTl.chips)}｜管理員=${JSON.stringify(demoAdmin.chips)}`);
// 支部領袖 myBranch='童軍' → 全旅＋童軍。確認旅長改動冇波及佢。
ok('  支部領袖仍只睇到全旅＋自己支部（旅長改動冇波及）',
  demoBl.chips && demoBl.chips.length === 2 && demoBl.chips.includes('全旅')
    && demoBl.chips.includes('童軍') && !demoBl.chips.includes('幼童軍'),
  `實際 ${JSON.stringify(demoBl.chips)}`);
console.log('');

/* ══════════════════════════════════════════════════════════════════════
 * 【真正 client render：/activities（底欄「🎯 活動」）】
 *
 * 驗證未登入訪客真係按「活動」公開卡過濾。
 *
 * ★ 點解要 jsdom：呢頁係 client component，state 由 useEffect 載入。
 *   HTTP 200 同 SSR 都證明唔到 client render（同上）。
 *
 * ★ 數據（troop_demo 原始 seed，已用 curl 核實）：
 *   8 個已發佈活動 → b3×2, troop×2, b2×1, b5×1, b4×1, b1×1
 *   「活動」卡 scope = troop,b2（由舊 key PUBLIC_SCOPE_NOTICES fallback 讀到）
 *   → 訪客應該只睇到 3 個：e02（troop）、e08（troop）、e03（b2）
 *   → 2026-09-03 改動之前係 8 個全部（呢頁當時完全冇消費任何公開卡）
 *
 * ★ 已用 negative control 証明呢一節咬得住：攞走 L48 嘅 isItemPublic
 *   過濾 → 訪客見到 8 個、6 項斷言變紅。
 * ══════════════════════════════════════════════════════════════════════ */
const ACT_TITLES = [
  ['e02', '童軍週末營', true],      // troop → 睇到
  ['e08', '全旅親子遠足日', true],  // troop → 睇到
  ['e03', '十一區運動會', true],    // b2    → 睇到
  ['e00', '八月童軍技能日', false], // b3    → 睇唔到
  ['e01', '九月山徑健行', false],   // b3    → 睇唔到
  ['e05', '樂行社區服務日', false], // b5    → 睇唔到
  ['e06', '深資遠征', false],       // b4    → 睇唔到
  ['e07', '小童軍親子日', false],   // b1    → 睇唔到
];

async function renderActivitiesAsGuest() {
  // ★「訪客」= 有選定旅團、但冇 session。
  //   唔可以直接 localStorage.clear()：getTroopKey()（lib/api.ts:8-14）讀
  //   'scoutsystem2_selected_troop' 嚟砌 API URL，清咗佢 API 會攞唔到嘢，
  //   頁面會永遠停喺「載入中...」→ 要驗證嘅過濾 code path 根本行唔到。
  //   （第一版就中咗：text 長度=6，即係「載入中...」，10 項斷言全係空轉。）
  localStorage.removeItem('scoutsystem2_current_user');   // ← 呢個先係「未登入」
  localStorage.setItem('scoutsystem2_selected_troop',
    JSON.stringify({ key: 'troop_demo', id: '0088', name: '演示旅團' }));
  const Page2 = (await import('@/app/activities/page.tsx')).default;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(React.createElement(Page2)); });
  for (let i = 0; i < 30; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    if (!/載入中/.test(host.textContent || '')) break;
  }
  const text = host.textContent || '';
  root.unmount();
  host.remove();
  return text;
}

console.log('── /activities：未登入訪客（活動卡 scope = troop,b2）──');
const actText = await renderActivitiesAsGuest();

ok('  頁面有 render 出內容（唔係「載入中」）',
  !/載入中/.test(actText) && actText.length > 100, `text 長度=${actText.length}`);

let actSeen = 0;
for (const [id, title, shouldSee] of ACT_TITLES) {
  const visible = actText.includes(title);
  if (visible) actSeen++;
  ok(`  ${id}「${title}」${shouldSee ? '睇到' : '睇唔到'}`, visible === shouldSee,
    `實際=${visible ? '睇到' : '睇唔到'}`);
}
ok('  訪客淨係睇到 3 個活動（唔係改動前嘅 8 個）', actSeen === 3,
  `實際睇到 ${actSeen} 個`);
console.log('');

console.log(bad === 0 ? '✅ 全部通過' : `❌ ${bad} 項失敗`);
process.exit(bad === 0 ? 0 : 1);
