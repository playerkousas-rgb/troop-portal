#!/usr/bin/env node
/**
 * 保留角色（防提權）檢查（npm run check:security）
 *
 * 要防嘅 bug：**後端冇限制「目標角色」，令到可以造出第二個 super_admin。**
 *
 * super_admin 係硬編碼嘅系統帳號（sheep），全系統只應該有一個。
 * 前端 assignableRoles() 唔會提供呢個選項，但前端守衛唔等於後端守衛 ——
 * operatedBy 係前端傳上嚟嘅，request 可以自己砌。歷史上確認過三條提權路：
 *
 *   1. updateUserRole        → 直接改 role
 *   2. updateUserField       → 萬用寫入，field='role' 一樣得
 *   3. applyJoin（公開表單） → 申請人自填 role，管理員批核時照抄建帳號
 *
 * 呢個腳本**執行真實代碼**（唔係 grep 原始碼）：
 *   ・GS 用 node:vm 載入 `gs/SCOUTSYSTEM_2_SETUP.gs`，經**真實 doGet dispatch** 打
 *   ・MOCK 直接 import `lib/mockServer.ts` 嘅 handleMockRequest
 *
 * ⚠️ 兩個踩過嘅陷阱，改呢個腳本時要小心：
 *   ・**唔好直接調 `handleXxx_`** —— 咁樣會繞過 `checkActionPermission_`，
 *     睇落似「守衛冇效」，但其實守衛喺 dispatch 層。必須經 doGet。
 *   ・stub `API_KEY_HASH` 時 `sha256_` 回傳嘅係**小寫** hex（GS 148 行）。
 *     用錯大寫會令所有請求死喺 API key 檢查，然後所有「應該被擋」嘅斷言
 *     假陽性通過 —— 呢種測試比冇測試更危險。
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const GS_PATH = 'gs/SCOUTSYSTEM_2_SETUP.gs';
const RESERVED = 'super_admin';
const API_KEY = 'check-security-key';
/** GS sha256_ 回傳小寫 hex —— 呢度必須一致，否則請求會死喺 API key 檢查 */
const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

const errors = [];
let passed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { errors.push(name); console.log(`  ❌ ${name}${detail ? `\n       ${detail}` : ''}`); }
}

// ==================== 1. 載入真實 GS ====================

function loadGs() {
  const src = readFileSync(GS_PATH, 'utf8');
  const Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    computeDigest: (_algo, s) => Array.from(createHash('sha256').update(String(s)).digest()),
  };
  const ContentService = {
    MimeType: { JSON: 'JSON' },
    createTextOutput: (s) => ({ setMimeType: () => ({ __text: s }) }),
  };
  const ctx = vm.createContext({
    Utilities,
    ContentService,
    SpreadsheetApp: { getActiveSpreadsheet: () => null, getActive: () => null },
    console, JSON, Date, Math, String, Number, Boolean, Array, Object, RegExp,
    parseInt, parseFloat, isNaN,
  });
  vm.runInContext(src, ctx, { filename: GS_PATH });
  return ctx;
}

/**
 * 砌一個可控嘅 GS 環境：Users / Applications 表用 fixture，寫入全部 capture 落嚟。
 * 回傳 { call(action, params), users, apps, writes, audits }
 */
function makeGsEnv() {
  const ctx = loadGs();
  const users = [
    { userId: 'u_admin', name: '陳堅強', role: 'admin', branchId: '', approved: 'TRUE' },
    { userId: 'u_target', name: '目標', role: 'member', branchId: 'b3', approved: 'TRUE' },
  ];
  const apps = [];
  const writes = [];
  const audits = [];

  ctx.getSheet_ = () => null;
  ctx.readTable_ = (n) => (n === 'Users' ? users : n === 'Applications' ? apps : []);
  ctx.updateCellByName_ = (sheet, idCol, id, col, val) => {
    writes.push({ id, col, val });
    const arr = sheet === 'Applications' ? apps : users;
    const row = arr.find((x) => x[idCol] === id);
    if (row) row[col] = val;
  };
  ctx.findRowIndexById_ = (sheet, idCol, id) => {
    const arr = sheet === 'Applications' ? apps : users;
    return arr.findIndex((x) => x[idCol] === id);
  };
  ctx.appendRowByHeaders_ = (sheet, row) => {
    (sheet === 'Applications' ? apps : users).push(row);
  };
  ctx.writeAudit_ = (u, a, e, i, d) => { audits.push(`${a}:${d}`); };
  ctx.getUserFeatures_ = () => [];
  ctx.uid_ = (prefix) => `${prefix}_check1`;
  ctx.now_ = () => '2026-09-03';
  ctx.sendEmail_ = () => {};
  ctx.getConfigValue_ = (k) => (k === 'API_KEY_HASH' ? sha256(API_KEY) : '');

  /** 經真實 doGet dispatch 打 —— 先至會行到 checkActionPermission_ */
  const call = (action, params = {}) => {
    const out = ctx.doGet({ parameter: Object.assign({ apiKey: API_KEY, action }, params) });
    return JSON.parse(out.__text);
  };

  return { call, users, apps, writes, audits, reset: () => { writes.length = 0; audits.length = 0; } };
}

// ==================== 2. GS：三條提權路 ====================

console.log('\n【GS：提權路必須全部被擋（經真實 doGet dispatch）】');
{
  const env = makeGsEnv();

  env.reset();
  let r = env.call('updateUserRole', { userId: 'u_target', role: RESERVED, operatedBy: 'u_admin' });
  ok('updateUserRole → super_admin 被拒', r.success === false, JSON.stringify(r));
  ok('  且冇寫入 role', env.writes.length === 0, `writes=${JSON.stringify(env.writes)}`);
  ok('  錯誤訊息講明係系統內建帳號', /系統內建帳號/.test(r.error || ''), r.error);

  env.reset();
  r = env.call('updateUserField', { userId: 'u_target', field: 'role', value: RESERVED, operatedBy: 'u_admin' });
  ok('updateUserField(field=role) → super_admin 被拒', r.success === false, JSON.stringify(r));
  ok('  且冇寫入', env.writes.length === 0, `writes=${JSON.stringify(env.writes)}`);

  env.reset();
  r = env.call('createUser', { name: '新超管', email: 'x@y.z', role: RESERVED, password: 'p', operatedBy: 'u_admin' });
  ok('createUser → super_admin 被拒', r.success === false, JSON.stringify(r));

  env.reset();
  r = env.call('updateUserRole', { userId: 'u_target', role: RESERVED, operatedBy: 'sheep' });
  ok('連 sheep（技術測試帳號）都被拒', r.success === false, JSON.stringify(r));
}

// ==================== 3. GS：對照組（正常流程唔可以壞） ====================

console.log('\n【GS：對照組 —— 正常操作必須照常】');
{
  const env = makeGsEnv();

  env.reset();
  let r = env.call('updateUserRole', { userId: 'u_target', role: 'branch_leader', operatedBy: 'u_admin' });
  ok('updateUserRole → branch_leader 放行', r.success === true, JSON.stringify(r).slice(0, 120));
  ok('  且真的寫入 branch_leader',
    env.writes.some((w) => w.col === 'role' && w.val === 'branch_leader'),
    `writes=${JSON.stringify(env.writes)}`);

  env.reset();
  r = env.call('updateUserField', { userId: 'u_target', field: 'name', value: '新名', operatedBy: 'u_admin' });
  ok('updateUserField(field=name) 放行', r.success === true, JSON.stringify(r).slice(0, 120));

  env.reset();
  r = env.call('updateUserRole', { userId: 'u_target', role: 'troop_super', operatedBy: 'sheep' });
  ok('troop_super 唔係保留角色，仍可指派', r.success === true, JSON.stringify(r).slice(0, 120));
}

// ==================== 4. GS：公開申請路（靜默降級，唔好洩露角色名） ====================

console.log('\n【GS：applyJoin（公開表單）必須靜默降級，唔好對匿名訪客報安全錯誤】');
{
  const env = makeGsEnv();

  env.reset();
  let r = env.call('applyJoin', { type: 'parent', name: '公開申請人', email: 'pub@x.z', role: RESERVED, branchId: 'b3' });
  ok('applyJoin(role=super_admin) 仍然成功（唔係報錯）', r.success === true, JSON.stringify(r));
  ok('  存入 Applications 嘅 role 已降級為 parent',
    env.apps.length === 1 && env.apps[0].role === 'parent',
    `apps=${JSON.stringify(env.apps.map((a) => a.role))}`);
  ok('  有留審計', env.audits.some((a) => a.startsWith('SANITIZE:applyJoin')), JSON.stringify(env.audits));
  ok('  回應冇洩露 super_admin 字樣',
    !JSON.stringify(r).includes(RESERVED), JSON.stringify(r));

  // 第二道守衛：就算 Applications 表被直接植入（繞過 applyJoin），批核時都要擋
  // ⚠️ 唔好清走 env.users —— checkActionPermission_ 要喺 Users 表搵到操作者，
  //    清晒會令佢回「找不到操作者帳號」，斷言就會假失敗。只記低基線長度。
  env.apps.length = 0; env.reset();
  const baseUsers = env.users.length;
  env.apps.push({ applicationId: 'app_evil', name: '後door', email: 'e@x.z', role: RESERVED, branchId: 'b3', password: 'pw' });
  r = env.call('decideApplication', { applicationId: 'app_evil', status: 'approved', operatedBy: 'u_admin' });
  ok('decideApplication 批核成功（唔係被權限擋）', r.success === true, JSON.stringify(r).slice(0, 140));
  const created = env.users[baseUsers];
  ok('decideApplication：Applications 被直接植入 super_admin，批核後仍降級',
    !!created && created.role === 'parent',
    `created role=${created && created.role}`);
  ok('  有留審計', env.audits.some((a) => a.startsWith('SANITIZE:decideApplication')), JSON.stringify(env.audits));

  // 對照：正常申請全程冇受影響
  env.apps.length = 0; env.reset();
  const baseUsers2 = env.users.length;
  r = env.call('applyJoin', { type: 'parent', name: '正常家長', email: 'ok@x.z', role: 'parent', branchId: 'b3' });
  ok('對照：applyJoin(role=parent) 成功', r.success === true, JSON.stringify(r));
  ok('  role 保留 parent', env.apps[0] && env.apps[0].role === 'parent', `role=${env.apps[0] && env.apps[0].role}`);
  r = env.call('decideApplication', { applicationId: env.apps[0].applicationId, status: 'approved', operatedBy: 'u_admin' });
  ok('  批核後 role 仍係 parent', env.users[baseUsers2] && env.users[baseUsers2].role === 'parent',
    `role=${env.users[baseUsers2] && env.users[baseUsers2].role}`);
}

// ==================== 5. GS：batchCreateUsers 白名單 ====================

console.log('\n【GS：batchCreateUsers 白名單唔可以包 super_admin】');
{
  const src = readFileSync(GS_PATH, 'utf8');
  const m = src.match(/var allowedRoles\s*=\s*\[([^\]]*)\]/);
  ok('搵到 allowedRoles 白名單', !!m, '無法定位 allowedRoles');
  if (m) {
    const list = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    ok('allowedRoles 唔包 super_admin', !list.includes(RESERVED), `list=${JSON.stringify(list)}`);
  }
}

// ==================== 6. MOCK：鏡像同一套守衛 ====================

console.log('\n【MOCK：必須鏡像同一套守衛（MOCK mirror 現實）】');
{
  const { handleMockRequest } = await import('../lib/mockServer.ts');
  const j = (o) => JSON.stringify(o);

  // ⚠️ MOCK 嘅 store 會由 .mockdata 載入**持久**狀態（之前 live HTTP 測試、
  //    甚至負向對照跑過嘅寫入都會留低）。所以：
  //      ・用每次獨一無二嘅 email，避免同環境狀態撞車
  //      ・用**基線快照**比對，只斷言「今次 check 自己冇新增超管」，
  //        唔好斷言成個 store 乾淨 —— 咁樣先 hermetic，唔會因環境殘留假失敗。
  const snapshotUsers = () =>
    ((handleMockRequest('getState', { userId: 'u_admin', keys: 'users' }).state || {}).users || [])
      .filter((u) => u.role === RESERVED).map((u) => u.id);
  const snapshotApps = () =>
    ((handleMockRequest('getApplications', { userId: 'u_admin' }).applications) || [])
      .filter((a) => a.role === RESERVED).map((a) => a.email);
  const baseSuperUsers = snapshotUsers();
  const baseSuperApps = snapshotApps();

  let r = handleMockRequest('updateUserRole', { userId: 'u_m1', role: RESERVED, operatedBy: 'u_admin' });
  ok('updateUserRole → super_admin 被拒', r.success === false, j(r));
  ok('  錯誤訊息同 GS 一致', /系統內建帳號/.test(r.error || ''), r.error);

  r = handleMockRequest('updateUserField', { userId: 'u_m1', field: 'role', value: RESERVED, operatedBy: 'u_admin' });
  ok('updateUserField(field=role) → super_admin 被拒', r.success === false, j(r));

  r = handleMockRequest('createUser', { name: '新超管', email: 'x@y.z', role: RESERVED, operatedBy: 'u_admin' });
  ok('createUser → super_admin 被拒', r.success === false, j(r));

  const marker = `sec-check-${Date.now()}@example.org`;
  r = handleMockRequest('applyJoin', { type: 'parent', name: '公開申請人', email: marker, role: RESERVED, branchId: 'b3' });
  ok('applyJoin 靜默降級（success=true）', r.success === true, j(r));
  ok('  回應冇洩露 super_admin 字樣', !j(r).includes(RESERVED), j(r));

  const allApps = (handleMockRequest('getApplications', { userId: 'u_admin' }).applications) || [];
  const mine = allApps.filter((a) => a.email === marker);
  ok('  存入嘅 role 已降級為 parent', mine.length === 1 && mine[0].role === 'parent',
    `roles=${j(mine.map((a) => a.role))}`);

  // ★ 安全不變量：今次 check 嘅攻擊嘗試**冇新增**任何 super_admin
  const newSuperUsers = snapshotUsers().filter((id) => !baseSuperUsers.includes(id));
  const newSuperApps = snapshotApps().filter((e) => !baseSuperApps.includes(e));
  ok('今次攻擊嘗試冇新增 super_admin 帳號', newSuperUsers.length === 0, `新增=${j(newSuperUsers)}`);
  ok('今次攻擊嘗試冇新增 super_admin 申請', newSuperApps.length === 0, `新增=${j(newSuperApps)}`);

  // 對照組
  r = handleMockRequest('updateUserRole', { userId: 'u_m2', role: 'branch_leader', operatedBy: 'u_admin' });
  ok('對照：updateUserRole → branch_leader 放行', r.success === true, j(r).slice(0, 100));
  r = handleMockRequest('updateUserField', { userId: 'u_m2', field: 'name', value: '王小名', operatedBy: 'u_admin' });
  ok('對照：updateUserField(field=name) 放行', r.success === true, j(r).slice(0, 100));
}

// ==================== 7. 兩邊守衛都要喺 dispatch 最前面 ====================

console.log('\n【結構檢查：守衛必須喺身份豁免之前，先至擋得到所有人】');
{
  const gs = readFileSync(GS_PATH, 'utf8');
  const guardAt = gs.indexOf('isReservedRole_(requestedRole_(p))');
  const bypassAt = gs.indexOf('if (isPrivilegedOperator_(operatedBy)) return null;');
  ok('GS 保留角色守衛存在', guardAt > 0);
  ok('GS 守衛喺 isPrivilegedOperator_ 豁免之前',
    guardAt > 0 && bypassAt > 0 && guardAt < bypassAt,
    `guardAt=${guardAt} bypassAt=${bypassAt}`);

  const mock = readFileSync('lib/mockServer.ts', 'utf8');
  const mockGuard = mock.indexOf('isReservedRole(requestedRole(p))');
  ok('MOCK 守衛存在', mockGuard > 0);
  ok('兩邊都有 applyJoin 例外',
    /action !== 'applyJoin'/.test(gs) && /action !== 'applyJoin'/.test(mock));
}

// ==================== 結果 ====================

console.log('');
if (errors.length) {
  console.log(`❌ 保留角色檢查失敗：${errors.length} 項（通過 ${passed} 項）`);
  errors.forEach((e) => console.log(`   ・${e}`));
  process.exit(1);
}
console.log(`✅ 保留角色守衛正確（super_admin 唔可以經 API 指派／建立／申請；三條提權路全封閉；正常流程冇受影響 — ${passed} 項斷言全過）`);
