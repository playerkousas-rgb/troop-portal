/**
 * ★ 真正執行 GS 角色守衛 —— 旅長交接 ＋ 「只能加不能減」 ＋ 單一旅長不變量
 *
 * 點解要有呢個：呢啲係 2026-09-03 改動入面風險最高嘅守衛 ——
 * 佢哋嘅全部意義係防止**永久失去旅長**（冇旅長就冇 API 路徑可以修復，
 * 因為 transferTroopLeader 要現任旅長發起）。
 *
 * 但直到呢個 commit，佢哋只喺 **mock 側**（lib/mockServer.ts）驗證過。
 * GS 係 82 旅嘅生產路徑，之前得 node --check（淨係語法）＋ grep。
 *
 * 做法同 check-gs-public-cards.mjs 一樣：vm.runInContext 載入整份 GS，
 * stub 資料層，然後**經 doGet 驅動**（直接 call handler 會跳過
 * API Key 認證 L1980-1990 同 checkActionPermission_ L1909）。
 *
 * ★ 拒絕字串全部由 grep 從檔案核實，唔靠記憶。
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const src = fs.readFileSync(path.resolve('gs/SCOUTSYSTEM_2_SETUP.gs'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  const brief = (extra && extra.startsWith('{'))
    ? JSON.stringify((() => { try { const o = JSON.parse(extra); return { success: o.success, error: o.error || undefined }; } catch { return extra; } })())
    : extra;
  console.log(`  ${cond ? '✅' : '❌'} ${name}${brief ? `  ${brief}` : ''}`);
  cond ? pass++ : fail++;
};

// ---------- 記憶體 Users 表 ----------
const COLUMNS = {
  Users: ['userId', 'name', 'email', 'role', 'branchId', 'memberId', 'createdAt', 'approved', 'note'],
};
let USERS = [];
let AUDIT = [];
const resetUsers = () => {
  USERS = [
    { userId: 'u_tl',    name: '周旅長', role: 'troop_leader',   branchId: '',   createdAt: '2024-01-01', approved: true },
    { userId: 'u_admin', name: '陳堅強', role: 'admin',          branchId: '',   createdAt: '2024-02-01', approved: true },
    { userId: 'u_adm2',  name: '林管理', role: 'admin',          branchId: '',   createdAt: '2024-03-01', approved: true },
    { userId: 'u_gl',    name: '李偉國', role: 'group_leader',   branchId: 'b4', createdAt: '2024-04-01', approved: true },
    { userId: 'u_bl',    name: '黃志遠', role: 'branch_leader',  branchId: 'b3', createdAt: '2024-05-01', approved: true },
    { userId: 'u_m4',    name: '陳大文', role: 'member',         branchId: 'b2', createdAt: '2024-06-01', approved: true },
    { userId: 'u5',      name: '王秀蘭', role: 'parent',         branchId: '',   createdAt: '2024-07-01', approved: true },
  ];
  AUDIT = [];
};
const U = (id) => USERS.find((u) => u.userId === id) || null;
const roleOf = (id) => (U(id) ? U(id).role : '(冇呢個帳號)');
const branchOf = (id) => (U(id) ? (U(id).branchId || '') : '');

// ---------- Apps Script 全域 stub ----------
const sandbox = {
  console, Date, Math, JSON, String, Number, Boolean, Array, Object, RegExp, Error,
  parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
  SpreadsheetApp: null,
  Utilities: {
    computeDigest: (alg, s) => {
      const hex = Buffer.from(String(s)).toString('hex');
      const out = [];
      for (let i = 0; i < 32; i++) out.push(parseInt(hex.substr((i * 2) % hex.length, 2), 16));
      return out;
    },
    newBlob: () => ({ setContentType: () => ({}), getBytes: () => [] }),
    base64Encode: (s) => Buffer.from(String(s)).toString('base64'),
    formatString: (...a) => a.join(''),
  },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: (s) => ({ setMimeType: () => ({ __text: String(s) }), __text: String(s) }),
  },
  ScriptApp: { newStateToken: () => ({ withMethod: () => ({ withArgument: () => ({ withTimeout: () => ({ createToken: () => 'tok' }) }) }) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
  UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{}' }) },
};
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(src, ctx, { filename: 'SCOUTSYSTEM_2_SETUP.gs' });

// ---------- runInContext 之後先 stub 資料層 ----------
const TABLES = () => ({
  SystemConfig: [
    { key: 'API_KEY', value: 'test-key-123' },
    { key: 'TROOP_NAME', value: '測試旅團' },
  ],
  Users: USERS,
  Members: [],
  AuditLog: AUDIT,
});
let T = TABLES();

ctx.readTable_ = (name) => (T[name] || []).map((r) => ({ ...r }));
ctx.getField_ = (row, f) => (row ? row[f] : undefined);
ctx.updateCellByName_ = (sheet, keyField, keyVal, valField, newVal) => {
  const t = T[sheet];
  let row = t.find((r) => String(r[keyField]) === String(keyVal));
  if (!row) { row = { [keyField]: keyVal }; t.push(row); }
  row[valField] = newVal;
  return true;
};
ctx.writeAudit_ = (by, action, table, target, note) => AUDIT.push({ by, action, table, target, note });
ctx.appendRow_ = (sheet, row) => { (T[sheet] || (T[sheet] = [])).push(row); };
/** 俾 findRowIndexById_ ＋ handleDeleteUser_ 嘅 deleteRow 用 */
ctx.getSheet_ = (name) => {
  const t = T[name];
  if (!t) return null;
  const cols = COLUMNS[name] || Object.keys(t[0] || {});
  return {
    getLastRow: () => t.length + 1,
    getDataRange: () => ({ getValues: () => [cols, ...t.map((r) => cols.map((c) => r[c] ?? ''))] }),
    deleteRow: (i) => { t.splice(i - 1, 1); },
    getRange: () => ({ setValues: () => {}, setValue: () => {} }),
  };
};

function call(params) {
  const out = ctx.doGet({ parameter: { apiKey: 'test-key-123', ...params } });
  const text = out && out.__text;
  if (!text) throw new Error('doGet 冇回傳內容');
  const j = JSON.parse(text);
  return j;
}
const deniedWith = (r, needle) => r.success === false && String(r.error || '').includes(needle);

// ══════════════════════════════════════════════════════════════
console.log('\n【A. 「👑 交接旅長」守衛（handleTransferTroopLeader_）】\n');

resetUsers(); T = TABLES();
let r = call({ action: 'transferTroopLeader', operatedBy: 'u_tl', targetUserId: 'u_tl' });
ok('不可以交接給自己', deniedWith(r, '不可以交接給自己'), JSON.stringify(r));

r = call({ action: 'transferTroopLeader', operatedBy: 'u_admin', targetUserId: 'u_bl' });
ok('管理員唔可以交接旅長（只有現任旅長可以）',
  deniedWith(r, '只有現任旅長可以交接旅長職位。'), JSON.stringify(r));

r = call({ action: 'transferTroopLeader', operatedBy: 'u_bl', targetUserId: 'u_gl' });
ok('支部領袖唔可以交接旅長', deniedWith(r, '只有現任旅長可以交接旅長職位。'), JSON.stringify(r));

// ★ 用戶決定 2026-09-03：後端收緊到領袖層（之前只擋 super_admin，
//   實測 transferTroopLeader targetUserId=u_m4 回 success=true）
r = call({ action: 'transferTroopLeader', operatedBy: 'u_tl', targetUserId: 'u_m4' });
ok('★ 成員唔可以成為旅長（前後端能力落差已封）',
  deniedWith(r, '只可以交接俾管理員／團長／支部領袖／教練員。') && deniedWith(r, '成員帳號唔可以成為旅長。'),
  JSON.stringify(r));
ok('  → 成員角色冇被改', roleOf('u_m4') === 'member', `實際 = ${roleOf('u_m4')}`);
ok('  → 有寫 DENIED 審計', AUDIT.some((a) => a.action === 'DENIED:transferTroopLeader'),
  `審計 = ${JSON.stringify(AUDIT.map((a) => a.action))}`);

r = call({ action: 'transferTroopLeader', operatedBy: 'u_tl', targetUserId: 'u5' });
ok('★ 家長唔可以成為旅長', deniedWith(r, '家長帳號唔可以成為旅長。'), JSON.stringify(r));

// 成功路徑：旅長 ⇄ 支部領袖 交換職位
resetUsers(); T = TABLES(); AUDIT = [];
r = call({ action: 'transferTroopLeader', operatedBy: 'u_tl', targetUserId: 'u_bl' });
ok('旅長 → 支部領袖 交接成功', r.success === true, JSON.stringify(r));
ok('  → 對方變旅長', roleOf('u_bl') === 'troop_leader', `實際 = ${roleOf('u_bl')}`);
ok('  → 對方 branchId 清空（旅長係全旅級）', branchOf('u_bl') === '', `實際 = ${JSON.stringify(branchOf('u_bl'))}`);
ok('  → 原旅長接手對方職位（交換，唔係單向）', roleOf('u_tl') === 'branch_leader', `實際 = ${roleOf('u_tl')}`);
ok('  → 原旅長接手對方支部', branchOf('u_tl') === 'b3', `實際 = ${JSON.stringify(branchOf('u_tl'))}`);
ok('  → 全旅仍然只得一個旅長',
  USERS.filter((u) => u.role === 'troop_leader').length === 1,
  `實際 = ${USERS.filter((u) => u.role === 'troop_leader').map((u) => u.userId).join(',')}`);

// ══════════════════════════════════════════════════════════════
console.log('\n【B. 「只能加不能減」peer guard（checkAdminPeerGuard_）】\n');

resetUsers(); T = TABLES(); AUDIT = [];
r = call({ action: 'updateUserRole', operatedBy: 'u_admin', userId: 'u_adm2', role: 'member' });
ok('管理員唔可以改另一個管理員嘅角色',
  deniedWith(r, '管理員之間只能加不能減') && deniedWith(r, '更改其他管理員嘅角色'), JSON.stringify(r));

r = call({ action: 'deleteUser', operatedBy: 'u_admin', userId: 'u_adm2' });
ok('管理員唔可以刪另一個管理員嘅帳號',
  deniedWith(r, '管理員之間只能加不能減') && deniedWith(r, '刪除其他管理員嘅帳號'), JSON.stringify(r));

// ★ §11 漏洞：原本只擋「目標係 admin」，漏咗旅長 → admin 可以把旅長降級／刪除，
//   而全旅就冇旅長，且冇 API 路徑可以修復
r = call({ action: 'updateUserRole', operatedBy: 'u_admin', userId: 'u_tl', role: 'member' });
ok('★ 管理員唔可以改旅長嘅角色（§11 漏洞）',
  deniedWith(r, '旅長係全旅最高權限') && deniedWith(r, '更改旅長嘅角色'), JSON.stringify(r));
ok('  → 旅長角色冇被改', roleOf('u_tl') === 'troop_leader', `實際 = ${roleOf('u_tl')}`);

r = call({ action: 'deleteUser', operatedBy: 'u_admin', userId: 'u_tl' });
ok('★ 管理員唔可以刪旅長嘅帳號', deniedWith(r, '刪除旅長嘅帳號'), JSON.stringify(r));
ok('  → 旅長帳號仲喺度', !!U('u_tl'), `實際 = ${U('u_tl') ? '存在' : '被刪咗'}`);

/**
 * ★ 可疑條件（handleUpdateUserRole_:3583）：
 *     if (String(p.field || '').toLowerCase() !== 'role') { peer guard }
 *   守衛只喺 field **唔係** 'role' 時先執行。正常 caller 唔送 field
 *   （'' !== 'role' → 守衛有行），但如果 client 送 field='role'
 *   就會跳過守衛。呢個係一個用參數就可以繞過嘅模式，
 *   而影響嘅正正係「永久失去旅長」呢條最高風險路徑。
 */
resetUsers(); T = TABLES(); AUDIT = [];
r = call({ action: 'updateUserRole', operatedBy: 'u_admin', userId: 'u_tl', role: 'member', field: 'role' });
ok('★ 送 field=role 都應該擋住旅長（唔應該用參數繞過守衛）',
  r.success === false, JSON.stringify(r));
ok('  → 旅長角色冇被改', roleOf('u_tl') === 'troop_leader', `實際 = ${roleOf('u_tl')}`);

resetUsers(); T = TABLES();
r = call({ action: 'updateUserRole', operatedBy: 'u_admin', userId: 'u_adm2', role: 'member', field: 'role' });
ok('★ 送 field=role 都應該擋住其他管理員', r.success === false, JSON.stringify(r));
ok('  → 對方角色冇被改', roleOf('u_adm2') === 'admin', `實際 = ${roleOf('u_adm2')}`);

// 旅長唔受 peer guard 限制（只有 admin 受限）
resetUsers(); T = TABLES();
r = call({ action: 'updateUserRole', operatedBy: 'u_tl', userId: 'u_adm2', role: 'coach' });
ok('旅長可以改管理員嘅角色（唔受「只能加不能減」限制）',
  r.success === true && roleOf('u_adm2') === 'coach',
  `實際 = ${roleOf('u_adm2')}｜${JSON.stringify(r)}`);

// ══════════════════════════════════════════════════════════════
console.log('\n【C. 保留角色 ＋ 不可指派角色（checkActionPermission_）】\n');

resetUsers(); T = TABLES();
r = call({ action: 'updateUserRole', operatedBy: 'u_admin', userId: 'u_gl', role: 'super_admin' });
ok('唔可以經 API 指派 super_admin',
  deniedWith(r, '系統內建帳號'), JSON.stringify(r));

r = call({ action: 'updateUserRole', operatedBy: 'u_admin', userId: 'u_gl', role: 'troop_leader' });
ok('唔可以經 API 指派旅長（要用「交接旅長」）',
  deniedWith(r, '「旅長」全旅只有一個'), JSON.stringify(r));
ok('  → 對方角色冇被改', roleOf('u_gl') === 'group_leader', `實際 = ${roleOf('u_gl')}`);

// ══════════════════════════════════════════════════════════════
console.log('\n【C2. 第二條繞過路徑：updateUserField field=role】\n');
/**
 * ★ handleUpdateUserField_（L3697-3701）係萬用寫入：
 *     updateCellByName_('Users', 'userId', p.userId, p.field, p.value || '')
 *   —— field='role' 時佢會**直接寫 role**，但個 handler 完全冇 peer guard。
 *
 *   唯一保護係 checkActionPermission_ 經 requestedRole_（L1905 讀 field='role'
 *   → 回 value），但佢只擋**保留角色**（L1914）同**不可指派角色**（L1947）。
 *   所以 value=super_admin / troop_leader 會擋，但 value=member 唔會 ——
 *   即係管理員可以用呢個 action 把旅長／其他管理員降級，
 *   繞過「只能加不能減」。同一個漏洞，另一條路。
 */
resetUsers(); T = TABLES(); AUDIT = [];
let rf = call({ action: 'updateUserField', operatedBy: 'u_admin', userId: 'u_tl', field: 'role', value: 'member' });
ok('★ 管理員唔可以用 updateUserField 把旅長降級',
  rf.success === false, JSON.stringify(rf));
ok('  → 旅長角色冇被改', roleOf('u_tl') === 'troop_leader', `實際 = ${roleOf('u_tl')}`);

resetUsers(); T = TABLES();
rf = call({ action: 'updateUserField', operatedBy: 'u_admin', userId: 'u_adm2', field: 'role', value: 'member' });
ok('★ 管理員唔可以用 updateUserField 把其他管理員降級',
  rf.success === false, JSON.stringify(rf));
ok('  → 對方角色冇被改', roleOf('u_adm2') === 'admin', `實際 = ${roleOf('u_adm2')}`);

// 保留角色／不可指派角色經呢條路都應該照擋（呢啲原本就有效）
resetUsers(); T = TABLES();
rf = call({ action: 'updateUserField', operatedBy: 'u_admin', userId: 'u_gl', field: 'role', value: 'super_admin' });
ok('updateUserField 都擋 super_admin', rf.success === false, JSON.stringify(rf));
rf = call({ action: 'updateUserField', operatedBy: 'u_admin', userId: 'u_gl', field: 'role', value: 'troop_leader' });
ok('updateUserField 都擋 troop_leader', rf.success === false, JSON.stringify(rf));

// 旅長唔受限制（佢係最高權限）
resetUsers(); T = TABLES();
rf = call({ action: 'updateUserField', operatedBy: 'u_tl', userId: 'u_adm2', field: 'role', value: 'coach' });
ok('旅長可以用 updateUserField 改管理員角色（唔受限）',
  rf.success === true && roleOf('u_adm2') === 'coach', `實際 = ${roleOf('u_adm2')}｜${JSON.stringify(rf)}`);

// 非 role 欄位唔應該被 peer guard 誤擋（例如改 branchId）
resetUsers(); T = TABLES();
rf = call({ action: 'updateUserField', operatedBy: 'u_admin', userId: 'u_adm2', field: 'branchId', value: 'b3' });
ok('改非 role 欄位唔被 peer guard 誤擋', rf.success === true, JSON.stringify(rf));

// ══════════════════════════════════════════════════════════════
console.log('\n【C3. 第三條路：toggleUser 停用帳號】\n');
/**
 * ★ handleToggleUser_（L3372-3380）把 approved 反转，但冇 peer guard。
 *
 *   checkActionPermission_（L1935-1937）會拒絕 approved=false 嘅帳號做
 *   任何需要 feature 嘅操作。所以管理員一旦停用咗旅長：
 *     ・旅長做唔到 transferTroopLeader（要現任旅長發起）
 *     ・管理員自己又唔可以升做旅長（不可指派角色）
 *   → 同一類永久癱瘓，只係今次唔係改 role 而係鎖帳號。
 *
 *   mock 側（lib/mockServer.ts:1106）同樣冇守衛。
 */
/**
 * ★ updateCellByName_ 寫入嘅係**字串**（'false'），而 JS 入面 `!!'false'` 係 true。
 *   第一版用 `!!u.approved` 令「已停用」睇落似「啟用」—— 產生咗一個假 ✅
 *   同兩個假 ❌。必须用同 GS parseBool_ 一致嘅語意。
 */
const approvedOf = (id) => {
  const u = U(id);
  if (!u) return null;
  const v = u.approved;
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
};

resetUsers(); T = TABLES(); AUDIT = [];
let rt = call({ action: 'toggleUser', operatedBy: 'u_admin', userId: 'u_tl' });
ok('★ 管理員唔可以停用旅長嘅帳號', rt.success === false, JSON.stringify(rt));
ok('  → 旅長仍然係啟用狀態', approvedOf('u_tl') === true, `實際 = ${approvedOf('u_tl')}`);

resetUsers(); T = TABLES();
rt = call({ action: 'toggleUser', operatedBy: 'u_admin', userId: 'u_adm2' });
ok('★ 管理員唔可以停用其他管理員嘅帳號', rt.success === false, JSON.stringify(rt));
ok('  → 對方仍然係啟用狀態', approvedOf('u_adm2') === true, `實際 = ${approvedOf('u_adm2')}`);

// 對照：停用團長／成員應該照舊可以
resetUsers(); T = TABLES();
rt = call({ action: 'toggleUser', operatedBy: 'u_admin', userId: 'u_gl' });
ok('對照：管理員可以停用團長（peer guard 只擋管理層）',
  rt.success === true && approvedOf('u_gl') === false,
  `approved=${approvedOf('u_gl')}｜${JSON.stringify(rt)}`);
call({ action: 'toggleUser', operatedBy: 'u_admin', userId: 'u_gl' });  // 還原
ok('  已還原 u_gl', approvedOf('u_gl') === true, `approved=${approvedOf('u_gl')}`);

// 旅長唔受限
resetUsers(); T = TABLES();
rt = call({ action: 'toggleUser', operatedBy: 'u_tl', userId: 'u_adm2' });
ok('旅長可以停用管理員（唔受「只能加不能減」限制）',
  rt.success === true && approvedOf('u_adm2') === false,
  `approved=${approvedOf('u_adm2')}｜${JSON.stringify(rt)}`);

// ══════════════════════════════════════════════════════════════
console.log('\n【D. 「全旅只有一個旅長」不變量（enforceSingleTroopLeader_）】\n');
/**
 * 多個 legacy troop_super 行會被 normalizeRole_ 全部歸一成 troop_leader
 * → 直接違反不變量。enforceSingleTroopLeader_ 保留最早 createdAt 嗰個，
 * 平手用 userId，其餘降做 admin。
 */
USERS = [
  { userId: 'u_x', name: '舊超管X', role: 'troop_super', branchId: '', createdAt: '2024-03-01', approved: true },
  { userId: 'u_a', name: '舊超管A', role: 'troop_super', branchId: '', createdAt: '2024-01-01', approved: true },
  { userId: 'u_b', name: '舊超管B', role: 'troop_super', branchId: '', createdAt: '2024-05-01', approved: true },
];
T = TABLES();
// ★ getState 讀 p.userId（L2034），唔係 p.operatedBy —— 第一版傳錯咗，
//   buildDashboardCore_('') 搵唔到 user 就回空 users，令 D 節三個斷言空轉。
const st = call({ action: 'getState', userId: 'u_a', operatedBy: 'u_a', keys: 'users' });
const users = (st.state && st.state.users) || [];
const tls = users.filter((u) => u.role === 'troop_leader');
ok('3 個 legacy troop_super 只歸一出 1 個旅長', tls.length === 1,
  `實際 = ${tls.length}（${tls.map((u) => u.id).join(',')}）`);
ok('  → 保留最早 createdAt 嗰個（u_a, 2024-01-01）',
  tls.length === 1 && tls[0].id === 'u_a', `實際 = ${tls.map((u) => u.id).join(',')}`);
ok('  → 其餘降做 admin',
  users.filter((u) => u.id === 'u_x' || u.id === 'u_b').every((u) => u.role === 'admin'),
  `實際 = ${users.filter((u) => u.id === 'u_x' || u.id === 'u_b').map((u) => `${u.id}=${u.role}`).join(', ')}`);

console.log(`\n=== ${fail === 0 ? '✅ 全部通過' : '❌ 有失敗'}：${pass} 通過 / ${fail} 失敗 ===`);
process.exit(fail === 0 ? 0 : 1);
