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

console.log(bad === 0 ? '✅ 全部通過' : `❌ ${bad} 項失敗`);
process.exit(bad === 0 ? 0 : 1);
