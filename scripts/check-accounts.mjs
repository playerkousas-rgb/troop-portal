#!/usr/bin/env node
/**
 * check:accounts —— 逐個帳戶真正 render 佢自己嘅首頁（npm run check:accounts）
 *
 * ## 點解要有呢個 check
 *
 * 用戶要求：「從新以不同帳戶檢測有沒有 BUG 或矛盾地方」。
 *
 * 其他 check 覆蓋唔到呢一環：
 *   ・check:links  §1 只驗證 `<Auth roles>` 同 ROUTE_ROLES 一致（靜態）
 *   ・check:links  §4 只驗證 dashboardFor(role) 嘅目標**理論上**收呢個角色
 *   ・check:render 只 render `/admin/users`（3 個角色）同 demo 行事曆
 *
 * 即係話：**從來冇任何 check 驗證過「每個真實帳戶撳入去，佢自己嘅首頁
 * 真係 render 得出內容」**。gate 啱 ≠ 頁 render 到 —— 頁面可以因為
 * state slice 缺欄位、session 欄位唔齊、或者 useEffect 爆 error 而白屏。
 *
 * ★ HTTP 200 證明唔到 client render：getSession()／getTroopKey() 讀
 *   localStorage，SSR 階段讀唔到。所以必须用 jsdom 行 useEffect。
 *
 * ## 做法
 *
 * 1. 由真實 dev server 攞帳戶清單（唔好自己砌假資料）
 * 2. 逐個帳戶 seed localStorage session
 * 3. 用 dashboardFor(role) 決定佢應該去邊
 * 4. 斷言：(a) gate 收呢個角色 (b) 頁面真係 render 出內容 (c) render 冇爆
 *
 * 需要 live dev server（npm run dev）。
 *
 * 用法：npm run check:accounts
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

// ---------- 2. fetch → 打去真實 dev server ----------
const REAL = 'http://127.0.0.1:3000';
// ★ 必须先把原生 fetch 存起嚟。直接喺 stub 入面 call `fetch(...)` 會解析返去
//   `globalThis.fetch`（即係 stub 自己）→ 無限遞歸 → Maximum call stack size exceeded。
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (u, o) => nativeFetch(String(u).startsWith('http') ? u : REAL + u, o);

// ---------- 3. import React ＋ 共用邏輯 ----------
const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: ConfirmProvider } = await import('@/components/ConfirmProvider.tsx');
const { dashboardFor } = await import('../lib/session.ts');
const { canAccessRoute } = await import('../lib/routeAccess.ts');

// ---------- 4. 由真實後台攞帳戶清單 ----------
let users;
try {
  const res = await nativeFetch(REAL + '/api/proxy?action=getState&troopKey=troop_demo&keys=users&userId=u_admin');
  users = (await res.json()).state.users;
} catch (e) {
  console.log(`❌ 連唔到 dev server（${REAL}）。check:accounts 需要 live dev server：先跑 npm run dev。`);
  process.exit(1);
}
if (!Array.isArray(users) || users.length === 0) {
  console.log('❌ 攞唔到帳戶清單（state.users 係空）。dev server 起咗未？');
  process.exit(1);
}

const pageFor = (route) => `@/app${route === '/' ? '' : route}/page.tsx`;

let pass = 0, fail = 0;
const ok = (n, c, e = '') => {
  console.log(`  ${c ? '✅' : '❌'} ${n}${e ? `  ${e}` : ''}`);
  c ? pass++ : fail++;
};

/** render 出嚟少過呢個字數當作白屏（正常首頁最少都有幾百字） */
const MIN_TEXT = 60;

console.log(`【逐個帳戶 render 自己嘅首頁 —— ${users.length} 個帳戶】\n`);

for (const u of users) {
  const target = dashboardFor(u.role);

  localStorage.setItem('scoutsystem2_selected_troop', JSON.stringify({ key: 'troop_demo', id: '0088', name: '演示旅團' }));
  localStorage.setItem('scoutsystem2_current_user', JSON.stringify({
    userId: u.id, name: u.name, role: u.role, troopCode: '0088', troopName: '演示旅團', iat: Date.now(),
  }));

  const gateOk = canAccessRoute(target, u.role);
  let rendered = false, text = '', err = '';
  try {
    const Page = (await import(pageFor(target))).default;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => { root.render(React.createElement(ConfirmProvider, null, React.createElement(Page))); });
    // 等 useEffect 嘅 loadStateSlice 完成
    for (let i = 0; i < 25; i++) {
      await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
      if (!/載入中/.test(host.textContent || '')) break;
    }
    text = host.textContent || '';
    rendered = text.length >= MIN_TEXT;
    root.unmount();
    host.remove();
  } catch (e) {
    err = String((e && e.message) || e).slice(0, 110);
  }

  ok(`${u.id}（${u.role}）→ ${target}`,
    gateOk && rendered && !err,
    err ? `render 爆咗：${err}`
      : !gateOk ? `canAccessRoute('${target}','${u.role}') = false —— dashboardFor 同 gate 矛盾`
        : !rendered ? `白屏：只 render 出 ${text.length} 字 →「${text.slice(0, 50)}」`
          : `${text.length} 字`);
}

console.log('');
console.log(fail === 0
  ? `✅ 全部帳戶都入到自己嘅首頁（${pass} 個帳戶）`
  : `❌ ${fail} 個帳戶有問題（通過 ${pass} 個）`);
process.exit(fail === 0 ? 0 : 1);
