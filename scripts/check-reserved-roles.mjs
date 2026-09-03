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
  r = env.call('updateUserRole', { userId: 'u_target', role: 'admin', operatedBy: 'sheep' });
  ok('admin 唔係保留角色，仍可指派（平級／向下）', r.success === true, JSON.stringify(r).slice(0, 120));
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

// ==================== 8. 授權路：唔可以越權自我授權 ====================
//
// 同一類 bug 嘅審計：`checkActionPermission_` 只驗操作者「有冇某個 feature」，
// 唔驗「佢批出嚟嘅嘢有冇超出自己權限」。updateUserRole 就係咁中伏（已修）。
// 呢度鎖住另外兩條授權路嘅既有守衛，防止日後被改鬆：
//   ・grantFeature             —— 支部領袖只可授自己支部 ＋ 只可授自己擁有嘅功能
//   ・updateUserPermissions    —— 限 admin／super_admin／troop_super
console.log('\n【GS：授權路唔可以越權自我授權】');
{
  const ctx = loadGs();
  const users = [
    { id: 'u_admin', name: '陳堅強', role: 'admin', branchId: '', approved: true },
    { id: 'u_bl', name: '黃志遠', role: 'branch_leader', branchId: 'b3', approved: true },
    { id: 'u_gl', name: '李偉國', role: 'group_leader', branchId: 'b4', approved: true },
    { id: 'u_co', name: '何健', role: 'coach', branchId: '', approved: true },
  ];
  const grants = [];
  ctx.getSheet_ = () => null;
  ctx.mapUsers_ = () => users;
  ctx.readTable_ = (n) => (n === 'Users' ? users : []);
  ctx.appendRowByHeaders_ = (sheet, row) => { if (sheet === 'UserPermissions') grants.push(row); };
  ctx.writeAudit_ = () => {};
  ctx.now_ = () => '2026-09-03';
  // 支部領袖 b3 只有 attendance；團長 b4 有 attendance + events
  ctx.getUserFeatures_ = (uid) =>
    (uid === 'u_bl' ? ['attendance'] : uid === 'u_gl' ? ['attendance', 'events'] : []);

  grants.length = 0;
  let r = ctx.handleGrantFeature_({ operatedBy: 'u_bl', targetUserId: 'u_bl', feature: 'attendance', branchId: 'b2' });
  ok('grantFeature：支部領袖 b3 唔可以授權去其他支部（b2）', r.success === false, JSON.stringify(r));
  ok('  且冇寫入', grants.length === 0, `grants=${grants.length}`);

  grants.length = 0;
  r = ctx.handleGrantFeature_({ operatedBy: 'u_bl', targetUserId: 'u_co', feature: 'users', branchId: 'b3' });
  ok('grantFeature：唔可以授出自己都冇嘅功能（users）', r.success === false, JSON.stringify(r));
  ok('  且冇寫入', grants.length === 0, `grants=${grants.length}`);

  grants.length = 0;
  r = ctx.handleGrantFeature_({ operatedBy: 'u_bl', targetUserId: 'u_co', feature: 'attendance', branchId: 'b3' });
  ok('對照：支部領袖可以喺自己支部授出自己擁有嘅功能', r.success === true, JSON.stringify(r));
  ok('  寫入嘅 branchId 係自己支部 b3',
    grants.length === 1 && grants[0].branchId === 'b3', JSON.stringify(grants));

  r = ctx.handleUpdateUserPermissions_({ operatedBy: 'u_bl', targetUserId: 'u_co', features: '["users","permissions"]' });
  ok('updateUserPermissions：支部領袖被拒', r.success === false, JSON.stringify(r));
  r = ctx.handleUpdateUserPermissions_({ operatedBy: 'u_gl', targetUserId: 'u_co', features: '["users"]' });
  ok('updateUserPermissions：團長都被拒（限管理層）', r.success === false, JSON.stringify(r));
}

// ==================== 9. 旅長唯一：唔可以經 API 指派 ====================
//
// 用戶決定（2026-09-03）：**旅長全旅只有一個 ＝ 最早建立嘅管理員**。
// `troop_super`（超管）已廢除 —— 佢同旅長職能重疊，而且 GS 9 處 admin 級守衛
// 有 0 處包含 troop_leader，令旅長實際低過管理員（實測確認）。
//
// 新模型下 `troop_leader` 係唯一嘅 NON_ASSIGNABLE_ROLE：只可以經 bootstrap
// 或者「交接旅長」交換按鈕（transferTroopLeader）產生，唔可以經角色下拉指派。
// 否則任何有「使用者管理」權限嘅 admin 都可以砌 request 造出第二個旅長。
//
// 注意 admin → admin 係**刻意容許**（管理員「只能加不能減」：可以開新管理員帳號）。
console.log('\n【GS：旅長唔可以經 API 指派（唯一，只經 bootstrap／交接）】');
{
  const ctx = loadGs();
  const users = [
    { userId: 'u_tl', name: '周旅長', role: 'troop_leader', branchId: '', approved: 'TRUE' },
    { userId: 'u_admin', name: '陳堅強', role: 'admin', branchId: '', approved: 'TRUE' },
    { userId: 'u_target', name: '目標', role: 'member', branchId: 'b3', approved: 'TRUE' },
  ];
  const writes = [];
  ctx.getSheet_ = () => null;
  ctx.readTable_ = (n) => (n === 'Users' ? users : []);
  ctx.updateCellByName_ = (sheet, idCol, id, col, val) => {
    writes.push({ id, col, val });
    const row = users.find((x) => x[idCol] === id);
    if (row) row[col] = val;
  };
  ctx.findRowIndexById_ = (s, c, id) => users.findIndex((x) => x[c] === id);
  ctx.appendRowByHeaders_ = (sheet, row) => users.push(row);
  ctx.writeAudit_ = () => {};
  ctx.getUserFeatures_ = () => [];
  ctx.uid_ = (p) => `${p}_s9`;
  ctx.now_ = () => '2026-09-03';
  ctx.sendEmail_ = () => {};
  ctx.getConfigValue_ = (k) => (k === 'API_KEY_HASH' ? sha256(API_KEY) : '');
  const call = (action, params = {}) =>
    JSON.parse(ctx.doGet({ parameter: Object.assign({ apiKey: API_KEY, action }, params) }).__text);

  writes.length = 0;
  let r = call('updateUserRole', { userId: 'u_target', role: 'troop_leader', operatedBy: 'u_admin' });
  ok('admin 唔可以把人升做旅長', r.success === false, JSON.stringify(r));
  ok('  且冇寫入', writes.length === 0, `writes=${JSON.stringify(writes)}`);
  ok('  錯誤訊息講明要用交接', /交接旅長/.test(r.error || ''), r.error);

  writes.length = 0;
  r = call('updateUserField', { userId: 'u_target', field: 'role', value: 'troop_leader', operatedBy: 'u_admin' });
  ok('updateUserField(field=role) 一樣擋到', r.success === false, JSON.stringify(r));
  ok('  且冇寫入', writes.length === 0, `writes=${JSON.stringify(writes)}`);

  writes.length = 0;
  r = call('createUser', { name: '新旅長', email: 's9@y.z', role: 'troop_leader', password: 'p', operatedBy: 'u_admin' });
  ok('createUser 一樣擋到', r.success === false, JSON.stringify(r));
  ok('  且冇建帳號', users.filter((u) => u.email === 's9@y.z').length === 0, '竟然建咗帳號');

  // ★ 連現任旅長自己都唔可以經角色下拉指派旅長（只可以經交接按鈕）
  writes.length = 0;
  r = call('updateUserRole', { userId: 'u_target', role: 'troop_leader', operatedBy: 'u_tl' });
  ok('連現任旅長都不可以經 updateUserRole 指派旅長（只可以經交接）', r.success === false, JSON.stringify(r));
  ok('  且冇寫入', writes.length === 0, `writes=${JSON.stringify(writes)}`);

  // ── 對照組：正常操作唔可以壞 ──
  writes.length = 0;
  r = call('updateUserRole', { userId: 'u_target', role: 'admin', operatedBy: 'u_admin' });
  ok('對照：admin 可以開其他管理員帳號（「只能加」）', r.success === true, JSON.stringify(r));
  ok('  且寫入咗 admin', writes.some((w) => w.col === 'role' && w.val === 'admin'), JSON.stringify(writes));

  users.find((u) => u.userId === 'u_target').role = 'member';
  writes.length = 0;
  r = call('updateUserRole', { userId: 'u_target', role: 'branch_leader', operatedBy: 'u_admin' });
  ok('對照：admin 可以正常向下指派 branch_leader', r.success === true, JSON.stringify(r));

  writes.length = 0;
  r = call('updateUserRole', { userId: 'u_target', role: 'admin', operatedBy: 'u_tl' });
  ok('對照：旅長可以指派 admin 及以下', r.success === true, JSON.stringify(r));
}

// ==================== 10. MOCK：鏡像旅長唯一守衛 ====================
//
// §9 只驗咗 GS。MOCK 亦加咗同一套守衛（lib/mockServer.ts），呢度驗佢真係生效 ——
// 未經驗證嘅守衛唔算修好。
// ⚠️ 兩個踩過嘅陷阱：
//  ・MOCK store 係持久嘅（.mockdata），所以用基線快照，只斷言「今次自己冇新增」。
//  ・**唔好用 u_admin 還原 u_m1** —— §11 嘅 peer guard 會擋住 admin 改 admin，
//    令還原靜默失敗，u_m1 永久留喺 admin 狀態，令呢一節嘅對照組喺**第二次跑**先假失敗
//    （已實測重現：清 .mockdata 後第 1 次過、第 2 次 2 項失敗）。
//    所以重置一律用 u_tl（旅長，唔受 peer guard 限制），而且喺**開頭**先重置，
//    唔好依賴上一輪嘅還原成功。
console.log('\n【MOCK：必須鏡像旅長唯一守衛】');
{
  const { handleMockRequest } = await import('../lib/mockServer.ts');
  const j = (o) => JSON.stringify(o);
  /** 用旅長重置 u_m1 —— 旅長唔受 peer guard 限制，所以呢個還原先至可靠 */
  const reset = () => handleMockRequest('updateUserRole', { userId: 'u_m1', role: 'member', operatedBy: 'u_tl' });
  reset();

  const snap = () =>
    ((handleMockRequest('getState', { userId: 'u_admin', keys: 'users' }).state || {}).users || [])
      .filter((u) => u.role === 'troop_leader').map((u) => `${u.id}:${u.role}`);
  const base = snap();

  let r = handleMockRequest('updateUserRole', { userId: 'u_m1', role: 'troop_leader', operatedBy: 'u_admin' });
  ok('MOCK：admin 唔可以把人升做旅長', r.success === false, j(r));
  ok('  錯誤訊息同 GS 一致', /交接旅長/.test(r.error || ''), r.error);

  r = handleMockRequest('updateUserField', { userId: 'u_m1', field: 'role', value: 'troop_leader', operatedBy: 'u_admin' });
  ok('MOCK：updateUserField(field=role) 一樣擋到', r.success === false, j(r));

  r = handleMockRequest('createUser', { name: '新旅長', email: 'tl-mock@demo.scout', role: 'troop_leader', password: 'p', operatedBy: 'u_admin' });
  ok('MOCK：createUser 一樣擋到', r.success === false, j(r));

  const after = snap();
  ok('  且冇新增任何旅長帳號', after.length === base.length, `base=${j(base)} after=${j(after)}`);

  // 對照：平級／向下指派唔可以壞（每次都用 reset() 確保 u_m1 係 member 先至測得準）
  reset();
  r = handleMockRequest('updateUserRole', { userId: 'u_m1', role: 'branch_leader', operatedBy: 'u_admin' });
  ok('MOCK 對照：admin 可以正常向下指派 branch_leader', r.success === true, j(r));
  reset();
  r = handleMockRequest('updateUserRole', { userId: 'u_m1', role: 'admin', operatedBy: 'u_admin' });
  ok('MOCK 對照：admin 可以開其他管理員帳號（「只能加」）', r.success === true, j(r));
  // 還原：用旅長（唔受 peer guard 限制），避免污染後續 check 同下一次跑
  reset();
}


// ==================== 11. 「只能加不能減」＋交接旅長 ====================
//
// 用戶決定（2026-09-03）：
//  ・管理員可以有無數個，但**其他管理員只可以加，唔可以減** —— 唔可以改其他管理員
//    嘅角色、唔可以刪其他管理員嘅帳號。要改必須由旅長處理。
//  ・旅長交接係**交換職位**：對方變旅長，現任旅長接手對方原本嘅角色＋支部
//    （對象可以是支部領袖，唔一定係管理員）。
//
// 前後端都要擋：前端 lib/permissions.ts 已經擋，但 operatedBy 係前端傳上嚟嘅，
// request 可以自己砌 —— 前端守衛唔等於後端守衛（同 updateUserRole 提權洞同一個根因）。
console.log('\n【GS：「只能加不能減」＋交接旅長】');
{
  const ctx = loadGs();
  const users = [
    { userId: 'u_tl', name: '周旅長', role: 'troop_leader', branchId: '', approved: 'TRUE' },
    { userId: 'u_a1', name: '管理員甲', role: 'admin', branchId: '', approved: 'TRUE' },
    { userId: 'u_a2', name: '管理員乙', role: 'admin', branchId: '', approved: 'TRUE' },
    { userId: 'u_bl', name: '黃志遠', role: 'branch_leader', branchId: 'b3', approved: 'TRUE' },
    { userId: 'u_m', name: '成員', role: 'member', branchId: 'b3', approved: 'TRUE' },
  ];
  const writes = [];
  ctx.getSheet_ = () => null;
  ctx.readTable_ = (n) => (n === 'Users' ? users : []);
  ctx.mapUsers_ = () => users.map((u) => ({
    id: u.userId, name: u.name, role: u.role, branchId: u.branchId, email: '', approved: true,
  }));
  ctx.updateCellByName_ = (sheet, idCol, id, col, val) => {
    writes.push({ id, col, val });
    const row = users.find((x) => x[idCol] === id);
    if (row) row[col] = val;
  };
  ctx.findRowIndexById_ = (s, c, id) => users.findIndex((x) => x[c] === id);
  ctx.appendRowByHeaders_ = () => {};
  ctx.writeAudit_ = () => {};
  ctx.getUserFeatures_ = () => [];
  ctx.uid_ = (p) => `${p}_s11`;
  ctx.now_ = () => '2026-09-03';
  ctx.sendEmail_ = () => {};
  ctx.getConfigValue_ = (k) => (k === 'API_KEY_HASH' ? sha256(API_KEY) : '');
  const call = (action, params = {}) =>
    JSON.parse(ctx.doGet({ parameter: Object.assign({ apiKey: API_KEY, action }, params) }).__text);
  const byId = (id) => users.find((u) => u.userId === id);

  // ── 「只能加不能減」 ──
  writes.length = 0;
  let r = call('updateUserRole', { userId: 'u_a2', role: 'member', operatedBy: 'u_a1' });
  ok('管理員甲 唔可以改 管理員乙 嘅角色', r.success === false, JSON.stringify(r));
  ok('  且冇寫入', writes.length === 0, `writes=${JSON.stringify(writes)}`);
  ok('  錯誤訊息講明「只能加不能減」', /只能加不能減/.test(r.error || ''), r.error);

  writes.length = 0;
  r = call('deleteUser', { userId: 'u_a2', operatedBy: 'u_a1' });
  ok('管理員甲 唔可以刪 管理員乙 嘅帳號', r.success === false, JSON.stringify(r));

  writes.length = 0;
  r = call('updateUserRole', { userId: 'u_m', role: 'parent', operatedBy: 'u_a1' });
  ok('對照：管理員甲 可以改 成員 嘅角色（向下）', r.success === true, JSON.stringify(r));

  byId('u_m').role = 'member';
  writes.length = 0;
  r = call('updateUserRole', { userId: 'u_a2', role: 'group_leader', operatedBy: 'u_tl' });
  ok('對照：旅長 可以改 管理員乙 嘅角色（旅長唔受限）', r.success === true, JSON.stringify(r));
  byId('u_a2').role = 'admin';

  // ── 交接旅長（交換職位）──
  writes.length = 0;
  r = call('transferTroopLeader', { targetUserId: 'u_a1', operatedBy: 'u_a1' });
  ok('交接：唔可以交接給自己', r.success === false, JSON.stringify(r));

  writes.length = 0;
  r = call('transferTroopLeader', { targetUserId: 'u_a1', operatedBy: 'u_bl' });
  ok('交接：非現任旅長被拒', r.success === false, JSON.stringify(r));
  ok('  錯誤訊息講明只有現任旅長', /只有現任旅長/.test(r.error || ''), r.error);

  writes.length = 0;
  r = call('transferTroopLeader', { targetUserId: 'u_bl', operatedBy: 'u_tl' });
  ok('交接：現任旅長可以交接俾支部領袖', r.success === true, JSON.stringify(r));
  ok('  對方變成旅長', byId('u_bl').role === 'troop_leader', `role=${byId('u_bl').role}`);
  ok('  對方支部被清空（旅長係全旅級）', byId('u_bl').branchId === '', `branch=${byId('u_bl').branchId}`);
  ok('  舊旅長接手對方原本嘅角色 branch_leader', byId('u_tl').role === 'branch_leader', `role=${byId('u_tl').role}`);
  ok('  舊旅長接手對方原本嘅支部 b3', byId('u_tl').branchId === 'b3', `branch=${byId('u_tl').branchId}`);
  ok('  交接後全旅仍然只有一個旅長',
    users.filter((u) => u.role === 'troop_leader').length === 1,
    JSON.stringify(users.filter((u) => u.role === 'troop_leader').map((u) => u.userId)));
}

console.log('\n【MOCK：必須鏡像「只能加不能減」＋交接旅長】');
{
  const { handleMockRequest } = await import('../lib/mockServer.ts');
  const j = (o) => JSON.stringify(o);
  const users = () =>
    ((handleMockRequest('getState', { userId: 'u_admin', keys: 'users' }).state || {}).users || []);
  const roleOf = (id) => String(users().find((u) => u.id === id)?.role || '');
  // ⚠️ 同 §10 一樣：重置一律用旅長（u_tl），唔好用 u_admin —— peer guard 會擋住
  const reset = () => handleMockRequest('updateUserRole', { userId: 'u_m1', role: 'member', operatedBy: 'u_tl' });
  reset();

  let r = handleMockRequest('updateUserRole', { userId: 'u_tl', role: 'member', operatedBy: 'u_admin' });
  ok('MOCK：管理員唔可以改旅長嘅角色', r.success === false, j(r));

  r = handleMockRequest('deleteUser', { userId: 'u_tl', operatedBy: 'u_admin' });
  ok('MOCK：管理員唔可以刪旅長嘅帳號', r.success === false, j(r));
  ok('  旅長帳號仍然存在', roleOf('u_tl') === 'troop_leader', `role=${roleOf('u_tl')}`);

  r = handleMockRequest('updateUserRole', { userId: 'u_m1', role: 'parent', operatedBy: 'u_admin' });
  ok('MOCK 對照：管理員可以改成員嘅角色（向下）', r.success === true, j(r));

  r = handleMockRequest('transferTroopLeader', { targetUserId: 'u_m1', operatedBy: 'u_admin' });
  ok('MOCK：非現任旅長交接被拒', r.success === false, j(r));

  // 交接：現任旅長 ⇄ 成員，真正對調
  reset();
  r = handleMockRequest('transferTroopLeader', { targetUserId: 'u_m1', operatedBy: 'u_tl' });
  ok('MOCK：現任旅長可以交接', r.success === true, j(r));
  ok('  對方變成旅長', roleOf('u_m1') === 'troop_leader', `role=${roleOf('u_m1')}`);
  ok('  舊旅長接手對方原本嘅角色 member', roleOf('u_tl') === 'member', `role=${roleOf('u_tl')}`);
  ok('  交接後全旅仍然只有一個旅長',
    users().filter((u) => u.role === 'troop_leader').length === 1,
    j(users().filter((u) => u.role === 'troop_leader').map((u) => u.id)));

  // 還原：把旅長交返俾 u_tl（而家 u_m1 係旅長，所以由 u_m1 發起）
  handleMockRequest('transferTroopLeader', { targetUserId: 'u_tl', operatedBy: 'u_m1' });
  reset();
  ok('  已還原 seed 狀態（u_tl 係旅長、u_m1 係成員）',
    roleOf('u_tl') === 'troop_leader' && roleOf('u_m1') === 'member',
    `u_tl=${roleOf('u_tl')} u_m1=${roleOf('u_m1')}`);
}

// ==================== 結果 ====================

console.log('');
if (errors.length) {
  console.log(`❌ 保留角色檢查失敗：${errors.length} 項（通過 ${passed} 項）`);
  errors.forEach((e) => console.log(`   ・${e}`));
  process.exit(1);
}
console.log(`✅ 保留角色守衛正確（super_admin 唔可以經 API 指派／建立／申請；三條提權路全封閉；正常流程冇受影響 — ${passed} 項斷言全過）`);
