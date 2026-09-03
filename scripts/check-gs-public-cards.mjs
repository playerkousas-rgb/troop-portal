/**
 * ★ 真正執行 GS handler —— 驗證「活動」公開卡嘅舊 id 歸一
 *
 * 點解要有呢個：repo 原本只有 check:gs（byte-identity 同步檢查）。
 * 即係 gs/SCOUTSYSTEM_2_SETUP.gs 入面嘅 handleSetPublicCard_ /
 * handleSetPublicScope_ **從來冇被執行過**。
 *
 * 而 `node --check` 只做語法檢查 —— 佢有 3 個未定義識別符都照樣通過
 * （呢個 session 親身中過）。所以「語法過 + grep 到定義」唔等於「執行啱」。
 *
 * 呢個 harness 用 vm.runInContext 載入整份 GS，stub 資料層，
 * 然後**經 doGet 驅動**（直接 call handler 證明唔到任何嘢 ——
 * 會跳過 API Key 認證同 checkActionPermission_）。
 *
 * ★ 測試場景刻意用 82 旅 live Sheet 嘅真實狀態：
 *     PUBLIC_CARDS         = 'calendar,notices'
 *     PUBLIC_SCOPE_NOTICES = 'troop,b2'
 *   呢個係整個歸一化嘅存在理由。
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const GS_PATH = path.resolve('gs/SCOUTSYSTEM_2_SETUP.gs');
const src = fs.readFileSync(GS_PATH, 'utf8');

// ---------- 1. 記憶體資料層（取代 Google Sheet） ----------
// 行格式：{ key: 'PUBLIC_CARDS', value: 'calendar,notices' }
const TABLES = {
  SystemConfig: [
    { key: 'API_KEY', value: 'test-key-123' },   // 令 doGet 認證通過（明文路徑）
    { key: 'TROOP_NAME', value: '測試旅團' },
    { key: 'PUBLIC_VIEW', value: 'TRUE' },
    // ★★★ 舊格式 —— 82 旅 live Sheet 嘅真實狀態 ★★★
    { key: 'PUBLIC_CARDS', value: 'calendar,notices' },
    { key: 'PUBLIC_SCOPE_CALENDAR', value: 'troop,b2,b3' },
    { key: 'PUBLIC_SCOPE_NOTICES', value: 'troop,b2' },
  ],
  Users: [
    { userId: 'u_admin', name: '陳堅強', role: 'admin', branchId: '' },
    { userId: 'u_bl', name: '黃志遠', role: 'branch_leader', branchId: 'b3' },
  ],
  AuditLog: [],
};

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  // ★ 只印 success/error：doGet 嘅回傳包含成個 state blob，
  //   直接 JSON.stringify 會令輸出幾千字完全讀唔到。
  const brief = (extra && extra.startsWith('{'))
    ? JSON.stringify((() => { try { const o = JSON.parse(extra); return { success: o.success, error: o.error || undefined }; } catch { return extra; } })())
    : extra;
  console.log(`  ${cond ? '✅' : '❌'} ${name}${brief ? `  ${brief}` : ''}`);
  cond ? pass++ : fail++;
};
const cfg = (key) => {
  const row = TABLES.SystemConfig.find((r) => r.key === key);
  return row ? row.value : '';
};

// ---------- 2. Apps Script 全域 stub ----------
const sandbox = {
  console,
  Date,
  Math,
  JSON,
  String,
  Number,
  Boolean,
  Array,
  Object,
  RegExp,
  Error,
  parseInt,
  parseFloat,
  isNaN,
  encodeURIComponent,
  decodeURIComponent,
  SpreadsheetApp: null,          // 資料層全部被 stub 接管
  Utilities: {
    // sha256_ 用；呢度行明文 API_KEY 路徑所以唔會用到，但要有定義
    computeDigest: (alg, s) => {
      const hex = Buffer.from(String(s)).toString('hex');
      const out = [];
      for (let i = 0; i < 32; i++) out.push(parseInt(hex.substr((i * 2) % hex.length, 2), 16));
      return out;
    },
    newBlob: (s) => ({ setContentType: () => ({}), getBytes: () => [] }),
    base64Encode: (s) => Buffer.from(String(s)).toString('base64'),
    formatString: (...a) => a.join(''),
  },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: (s) => ({
      setMimeType: () => ({ __text: String(s) }),
      __text: String(s),
    }),
  },
  ScriptApp: { newStateToken: () => ({ withMethod: () => ({ withArgument: () => ({ withTimeout: () => ({ createToken: () => 'tok' }) }) }) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
  UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{}' }) },
};
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
vm.runInContext(src, ctx, { filename: 'SCOUTSYSTEM_2_SETUP.gs' });

// ---------- 3. runInContext 之後先 stub 資料層 ----------
// （必須喺之後：GS 自己定義咗 readTable_ 等，要被覆蓋先至接管到）
ctx.getSheet_ = () => null;
ctx.readTable_ = (name) => (TABLES[name] || []).map((r) => ({ ...r }));
ctx.getField_ = (row, field) => (row ? row[field] : undefined);
ctx.updateCellByName_ = (sheet, keyField, keyVal, valField, newVal) => {
  const t = TABLES[sheet];
  if (!t) throw new Error(`冇呢張表：${sheet}`);
  let row = t.find((r) => String(r[keyField]) === String(keyVal));
  if (!row) { row = { [keyField]: keyVal }; t.push(row); }
  row[valField] = newVal;
  return true;
};
ctx.appendRow_ = (sheet, row) => { (TABLES[sheet] || (TABLES[sheet] = [])).push(row); };
ctx.writeAudit_ = (by, action, table, target, note) => {
  TABLES.AuditLog.push({ by, action, table, target, note });
};

/** 經 doGet 驅動（同真實部署一樣：過 API Key 認證 ＋ checkActionPermission_） */
function call(params) {
  const out = ctx.doGet({ parameter: { apiKey: 'test-key-123', ...params } });
  const text = out && out.__text;
  if (!text) throw new Error('doGet 冇回傳內容');
  return JSON.parse(text);
}

// ══════════════════════════════════════════════════════════════
console.log('\n【真正執行 GS：/setPublicCard（起點＝82 旅 live 狀態）】\n');
console.log(`  起點  PUBLIC_CARDS = ${JSON.stringify(cfg('PUBLIC_CARDS'))}`);
console.log(`        PUBLIC_SCOPE_NOTICES = ${JSON.stringify(cfg('PUBLIC_SCOPE_NOTICES'))}`);
console.log(`        PUBLIC_SCOPE_ACTIVITIES = ${JSON.stringify(cfg('PUBLIC_SCOPE_ACTIVITIES') || '(未寫過)')}`);
console.log('');

ok('起點確實係舊格式（否則呢個測試冇意義）',
  cfg('PUBLIC_CARDS') === 'calendar,notices' && !cfg('PUBLIC_SCOPE_ACTIVITIES'));

// ── A. 舊 client 送舊 id `notices` 都要接受（先歸一再驗證） ──
const rLegacy = call({ action: 'setPublicCard', card: 'notices', enabled: 'false', operatedBy: 'u_admin' });
ok('舊 client 送 card=notices 唔會回「未知的卡片」',
  rLegacy.success === true, JSON.stringify(rLegacy));
ok('  → 寫入後 PUBLIC_CARDS 已歸一（notices 被刪走）',
  cfg('PUBLIC_CARDS') === 'calendar', `實際 = ${JSON.stringify(cfg('PUBLIC_CARDS'))}`);
ok('  → scope 由舊 key fallback 讀到並寫去新 key',
  cfg('PUBLIC_SCOPE_ACTIVITIES') === 'troop,b2',
  `實際 = ${JSON.stringify(cfg('PUBLIC_SCOPE_ACTIVITIES'))}`);

// ── B. 還原舊格式，再用新 id 關閉 —— 呢個係靜默失敗風險嘅直接証明 ──
TABLES.SystemConfig.find((r) => r.key === 'PUBLIC_CARDS').value = 'calendar,notices';
const off = call({ action: 'setPublicCard', card: 'activities', enabled: 'false', operatedBy: 'u_admin' });
ok('管理員用新 id 關閉「活動」卡成功', off.success === true, JSON.stringify(off));
ok('  → ★ 舊 id notices 真係被刪走（唔係寫返 calendar,notices）',
  cfg('PUBLIC_CARDS') === 'calendar', `實際 = ${JSON.stringify(cfg('PUBLIC_CARDS'))}`);
ok('  → 張卡真係關咗（唔會靜默失敗）',
  !/(^|,)activities(,|$)/.test(cfg('PUBLIC_CARDS')));

// ── C. 重開：舊格式入面冇 activities，應該加得入 ──
TABLES.SystemConfig.find((r) => r.key === 'PUBLIC_CARDS').value = 'calendar,notices';
const on = call({ action: 'setPublicCard', card: 'activities', enabled: 'true', operatedBy: 'u_admin' });
ok('喺舊格式入面重開「活動」卡成功', on.success === true, JSON.stringify(on));
/**
 * ★ 呢個斷言第一次寫錯咗（我以為舊 id 會保留）。
 *
 * 實際追蹤：normalizeCards_('calendar,notices') 把 notices 映射做 activities
 * → ['calendar','activities'] → setInList_ 加入 activities（已存在）
 * → 寫回 'activities,calendar'。
 *
 * 產品係啱嘅，而且比我預期更好：寫入時**順手清走舊 id**，
 * 唔係留低 notices 呢啲垃圾喺 Sheet 度。
 */
ok('  → 重開後 activities 喺列表入面',
  /(^|,)activities(,|$)/.test(cfg('PUBLIC_CARDS')), `實際 = ${JSON.stringify(cfg('PUBLIC_CARDS'))}`);
ok('  → calendar 冇被誤刪', /(^|,)calendar(,|$)/.test(cfg('PUBLIC_CARDS')),
  `實際 = ${JSON.stringify(cfg('PUBLIC_CARDS'))}`);
ok('  → ★ 舊 id notices 已被清走（寫入時自動遷移，唔留垃圾）',
  !/(^|,)notices(,|$)/.test(cfg('PUBLIC_CARDS')), `實際 = ${JSON.stringify(cfg('PUBLIC_CARDS'))}`);
ok('  → 冇重複 id', new Set(cfg('PUBLIC_CARDS').split(',')).size
  === cfg('PUBLIC_CARDS').split(',').filter(Boolean).length,
  `實際 = ${JSON.stringify(cfg('PUBLIC_CARDS'))}`);

// ── D. 未知卡片仍然要拒 ──
const bad = call({ action: 'setPublicCard', card: 'nonsense', enabled: 'true', operatedBy: 'u_admin' });
ok('未知卡片仍然被拒', bad.success === false && /未知的卡片/.test(bad.error || ''),
  JSON.stringify(bad));

// ── E. 權限：支部領袖唔可以改卡（只能改自己支部 scope） ──
const denied = call({ action: 'setPublicCard', card: 'activities', enabled: 'true', operatedBy: 'u_bl' });
ok('支部領袖改卡被拒', denied.success === false && /只有管理層/.test(denied.error || ''),
  JSON.stringify(denied));

// ══════════════════════════════════════════════════════════════
console.log('\n【真正執行 GS：/setPublicScope（支部內容公開範圍）】\n');

// 重置做舊格式
TABLES.SystemConfig.find((r) => r.key === 'PUBLIC_CARDS').value = 'calendar,notices';
const sRow = TABLES.SystemConfig.find((r) => r.key === 'PUBLIC_SCOPE_ACTIVITIES');
if (sRow) sRow.value = '';

const sc = call({ action: 'setPublicScope', card: 'notices', scope: 'b2', enabled: 'true', operatedBy: 'u_admin' });
ok('舊 client 送 card=notices 設定 scope 唔會回「未知的卡片」',
  sc.success === true, JSON.stringify(sc));
ok('  → scope 寫入新 key PUBLIC_SCOPE_ACTIVITIES',
  /(^|,)b2(,|$)/.test(cfg('PUBLIC_SCOPE_ACTIVITIES')),
  `實際 = ${JSON.stringify(cfg('PUBLIC_SCOPE_ACTIVITIES'))}`);

const scBad = call({ action: 'setPublicScope', card: 'nonsense', scope: 'b2', enabled: 'true', operatedBy: 'u_admin' });
ok('未知卡片設定 scope 仍然被拒', scBad.success === false, JSON.stringify(scBad));

console.log(`\n=== ${fail === 0 ? '✅ 全部通過' : '❌ 有失敗'}：${pass} 通過 / ${fail} 失敗 ===`);
process.exit(fail === 0 ? 0 : 1);
