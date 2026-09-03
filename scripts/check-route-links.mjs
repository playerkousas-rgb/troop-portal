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

// ==================== 結果 ====================
console.log('');
if (errors.length) {
  console.log(`❌ 連結檢查失敗：${errors.length} 項（通過 ${passed} 項）`);
  errors.forEach((e) => console.log(`   ・${e}`));
  process.exit(1);
}
console.log(`✅ 路由 gate 一致 ＋ 連結完整（每頁 <Auth> 同 ROUTE_ROLES 對得上；冇斷連結；legacy redirect 唔會撞牆 — ${passed} 項斷言全過）`);
