#!/usr/bin/env node
/**
 * 全 route render 檢查 —— 第 12 個 check script。
 *
 * 背景（2026-09-03）：用戶問「從新以不同帳戶檢測有沒有BUG 或矛盾地方」。
 * 當時嘅 render 類檢查只覆蓋 4 個頁面：`check:render` 做 `/admin/users` +
 * demo 行事曆，`check:accounts` 做 `/admin`、`/parent`、`/member`。
 * 即係 61 個 route 入面 **約 54 個從未喺任何測試 render 過** ——
 * 一個白屏 bug 可以匿咗好耐。呢個 script 補嗰個缺口。
 *
 * 用 jsdom 以 `u_admin`（可達 route 最多嘅角色）真正 render **每一個** route，
 * 斷言：
 *   1. 冇 exception（白屏嘅常見成因）
 *   2. render 出非平凡 DOM（元素數 ≥ MIN_ELS，且有文字或表單控件）
 *
 * ★ 點解用 DOM 元素數而唔係純文字數
 *   表單為主嘅頁面（例如 `/profile`：19 個元素 / 4 個表單控件）喺 jsdom 入面
 *   `<input>` 係冇 `textContent` 嘅，所以純文字數只有 34 字。用「60 字」呢類
 *   文字門檻會把正常嘅表單頁判做白屏 —— 量錯咗嘢。故改以 DOM 結構為主。
 *
 * ★ 兩個必要嘅 jsdom 補丁（都係工具限制，唔係產品 bug）
 *   - `Element.prototype.scrollIntoView`：jsdom 冇實作（`typeof === 'undefined'`），
 *     `/attendance` 嘅 effect 會直接炸。
 *   - `next/link` + `next/navigation` stub：Next runtime 之外冇 ESM entry。
 *     冇 stub 嘅話 4 個 route 會「Cannot find module」。
 *
 * ★ 點解要 driver + worker 分批（唔好「簡化」返單 process）
 *   61 個 page module 連同 `lib/api`、`lib/store`、React dev build 全部累積喺
 *   同一個 process，實測 **OOM（heap ~1.9GB，FATAL ERROR）**，而且爆之前
 *   一行結果都印唔出。分批 spawn 子 process 先可以在批與批之間釋放記憶體。
 *   呢個檔案同時係 driver（冇 PAGES_BATCH 時）同 worker（有 PAGES_BATCH 時）。
 *
 * 用法：npm run check:pages   （需要 dev server 行緊）
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';
import { writeFileSync, appendFileSync, readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const BATCH = process.env.PAGES_BATCH;          // worker 模式標記
const BATCH_SIZE = Number(process.env.PAGES_BATCH_SIZE || 8);
const CHILD_TIMEOUT_MS = Number(process.env.PAGES_CHILD_TIMEOUT_MS || 90000);
const MARK = '@@PAGE@@';
if (process.env.PAGES_DEBUG) {
  process.stderr.write(`[debug] PAGES_BATCH=${JSON.stringify(process.env.PAGES_BATCH)} → mode=${BATCH ? 'WORKER' : 'DRIVER'}\n`);
}

/* ══════════════════ route 掃描（兩邊都要） ══════════════════ */
const APP = join(fileURLToPath(new URL('..', import.meta.url)), 'app');
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e === 'page.tsx') out.push(p);
  }
  return out;
}
const ROUTES = walk(APP)
  .map(p => '/' + relative(APP, p).replace(/\/?page\.tsx$/, ''))
  .sort();

/* ══════════════════ 白名單（有具體理由） ══════════════════ */
const ALLOWLIST = {
  // `/leader` 係一個純 client-side redirect 頁：render 出
  // 「正在前往你的控制台…」然後 `router.replace(dashboardFor(role))`。
  // DOM 只有 1 個元素係設計如此（見 app/leader/page.tsx 註解），唔係白屏。
  '/leader': '純 redirect 頁：render「正在前往你的控制台…」後 router.replace（設計如此）',
};

const MIN_ELS = 3;
const MIN_TEXT = 10;
const WAIT_ROUNDS = 30;

/* ══════════════════════════ WORKER ══════════════════════════ */
if (BATCH) {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/', pretendToBeVisual: true,
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.Event = dom.window.Event;
  globalThis.CustomEvent = dom.window.CustomEvent;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  // ★ jsdom 冇實作 scrollIntoView；`/attendance` 嘅 effect 會 call 佢
  if (typeof dom.window.Element.prototype.scrollIntoView !== 'function') {
    dom.window.Element.prototype.scrollIntoView = function () {};
  }
  if (!dom.window.matchMedia) {
    dom.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  }

  const REAL = process.env.PORTAL_ORIGIN || 'http://127.0.0.1:3000';
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (u, o) => nativeFetch(String(u).startsWith('http') ? u : REAL + u, o);

  // 登入身份：u_admin（可達 route 最多）
  localStorage.setItem('scoutsystem2_selected_troop', JSON.stringify({ key: 'troop_demo', id: '0088', name: '演示旅團' }));
  localStorage.setItem('scoutsystem2_current_user', JSON.stringify({
    userId: 'u_admin', name: '陳堅強', role: 'admin', troopCode: '0088', troopName: '演示旅團', iat: Date.now(),
  }));

  const React = (await import('react')).default;
  const { act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { default: ConfirmProvider } = await import('@/components/ConfirmProvider.tsx');

  for (const route of BATCH.split(',')) {
    let els = 0, inputs = 0, chars = 0, err = '';
    try {
      const Page = (await import(`@/app${route === '/' ? '' : route}/page.tsx`)).default;
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = createRoot(host);
      await act(async () => {
        root.render(React.createElement(ConfirmProvider, null, React.createElement(Page)));
      });
      for (let i = 0; i < WAIT_ROUNDS; i++) {
        await act(async () => { await new Promise(r => setTimeout(r, 50)); });
        if (!/載入中/.test(host.textContent || '')) break;
      }
      els = host.querySelectorAll('*').length;
      inputs = host.querySelectorAll('input,textarea,select,button').length;
      chars = (host.textContent || '').replace(/\s+/g, ' ').trim().length;
      root.unmount();
      host.remove();
    } catch (e) {
      err = String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 110);
    }
    const rec = `${MARK}${JSON.stringify({ route, els, inputs, chars, err })}\n`;
    process.stdout.write(rec);
    // ★ 同時即時 append 落檔案：stdout 去 pipe 時係 buffered，若 process 被
    //   SIGTERM 殺咗，緩衝會整個丟失（實測「0 個結果」其實係輸出丟咗，唔係冇 render）。
    if (process.env.PAGES_OUT) appendFileSync(process.env.PAGES_OUT, rec);
  }
  process.exit(0);
}

/* ══════════════════════════ DRIVER ══════════════════════════ */
const chunks = [];
for (let i = 0; i < ROUTES.length; i += BATCH_SIZE) chunks.push(ROUTES.slice(i, i + BATCH_SIZE));

const results = [];
let batchNo = 0;
for (const chunk of chunks) {
  batchNo++;
  process.stderr.write(`  批次 ${batchNo}/${chunks.length}（${chunk.length} 個 route）…\n`);
  const outFile = `/tmp/pages-batch${batchNo}.ndjson`;
  try { unlinkSync(outFile); } catch { /* 未有檔案 */ }
  const out = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      '--no-warnings=MODULE_TYPELESS_PACKAGE_JSON',
      '--import', './scripts/node-tsx-render-hook.mjs',
      SELF,
    ], {
      env: { ...process.env, PAGES_BATCH: chunk.join(','), PAGES_OUT: outFile },
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let so = '', se = '', killed = false;
    child.stdout.on('data', d => so += d);
    child.stderr.on('data', d => se += d);
    child.on('error', reject);
    // ★ 硬 timeout：實測某個 route 會令 React `act()` 永遠 spin（WAIT_ROUNDS
    //   循環本身有 1.5s 上限，所以 hang 唔喺循環而喺 act queue）。冇呢個 timeout
    //   嘅話成個 check 會永久卡死而唔報错。
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, CHILD_TIMEOUT_MS);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ so, se, code, signal, killed });
    });
  });

  // ★ 優先用落檔結果：stdout 去 pipe 係 buffered，child 被 SIGKILL 時緩衝整個丟失
  const raw = (() => { try { return readFileSync(outFile, 'utf8'); } catch { return out.so; } })();
  for (const line of raw.split('\n')) {
    if (!line.startsWith(MARK)) continue;
    try { results.push(JSON.parse(line.slice(MARK.length))); } catch { /* 忽略半行 */ }
  }
  if (process.env.PAGES_DEBUG) {
    writeFileSync(`/tmp/child-b${batchNo}.err`, out.se);
    process.stderr.write(`[debug] child exit=${out.code} stdout=${out.so.length}B stderr=${out.se.length}B\n`);
    process.stderr.write(`[debug] child stderr 開頭：${out.se.slice(0, 300).replace(/\n/g, ' | ')}\n`);
  }
  if (out.killed || out.code !== 0) {
    const done = results.length;
    const last = results.length ? results[results.length - 1].route : '（一個都未完成）';
    process.stderr.write(`\n❌ 批次 ${batchNo} ${out.killed ? `超過 ${CHILD_TIMEOUT_MS / 1000}s 被 SIGKILL` : `異常結束（exit=${out.code} signal=${out.signal}）`}，完成 ${done}/${chunk.length} 個。\n`);
    process.stderr.write(`   最後完成嘅 route：${last}\n`);
    const stuck = chunk.find(r => !results.some(x => x.route === r));
    if (stuck) process.stderr.write(`   ⚠️ 疑似卡死喺：${stuck}\n`);
    if (/out of memory|OOM/i.test(out.se)) {
      process.stderr.write('   記憶體不足 —— 試細啲嘅批次：PAGES_BATCH_SIZE=4 npm run check:pages\n');
    } else {
      process.stderr.write(out.se.split('\n').slice(-12).join('\n') + '\n');
    }
    process.exit(1);
  }
}

/* ══════════════════ 報告 ══════════ */
const missing = ROUTES.filter(r => !results.some(x => x.route === r));
let pass = 0;
const failures = [];

for (const route of ROUTES) {
  const r = results.find(x => x.route === route);
  if (!r) { failures.push({ route, err: '（worker 冇回傳結果）' }); continue; }
  const allowed = ALLOWLIST[route];
  const nonTrivial = r.els >= MIN_ELS && (r.chars >= MIN_TEXT || r.inputs >= 1);
  const ok = !r.err && (allowed ? r.els >= 1 : nonTrivial);
  if (ok) pass++;
  else failures.push({ route, ...r, allowed });
  const flag = !ok ? '❌' : allowed ? '🔵' : r.els >= MIN_ELS ? '✅' : '⚠️ ';
  const detail = r.err ? r.err : `${r.els} 元素 / ${r.inputs} 控件 / ${r.chars} 字`;
  console.log(`${flag} ${route.padEnd(34)} ${detail}${allowed ? '  （白名單）' : ''}`);
}

console.log(`\n═══ 共 ${ROUTES.length} 個 route：${pass} 通過，${failures.length} 失敗 ═══`);
if (missing.length) console.log(`⚠️  ${missing.length} 個 route 冇結果：${missing.join(', ')}`);
if (failures.length) {
  console.log('\n❌ 失敗明細：');
  for (const f of failures) {
    console.log(`   ${f.route}`);
    if (f.err) console.log(`      💥 ${f.err}`);
    else console.log(`      DOM ${f.els} 元素 / ${f.inputs} 控件 / ${f.chars} 字 —— 疑似白屏（門檻：≥${MIN_ELS} 元素且有文字或控件）`);
  }
  console.log('\n若係新加嘅 route 而係合法嘅最小頁，請喺 ALLOWLIST 加註理由。');
  process.exit(1);
}
console.log('✅ 全部 route 都 render 出非平凡內容，冇 exception。');
