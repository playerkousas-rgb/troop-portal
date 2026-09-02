#!/usr/bin/env node
/**
 * 權限對照表一致性檢查（npm run check:perms）
 *
 * 防止呢幾類 bug 靜靜哋出現：
 *  1. action 對照到一個根本唔存在嘅 feature 名（例如寫咗 'payments'）
 *     → 後果：除咗 admin（有 role bypass）之外所有人被鎖死，但畫面唔會報錯
 *  2. 前端 mock 後台 同 GS 後台 兩張表唔一致
 *     → 後果：示範環境同真實環境行為唔同，測極都測唔到
 *  3. 使用者管理 UI 有個開關，但後台根本唔認嗰個 feature
 *     → 後果：管理員撳咗、以為授咗權，其實冇效果
 */
import { readFileSync } from 'node:fs';

const mock = readFileSync('lib/mockServer.ts', 'utf8');
const gs = readFileSync('gs/SCOUTSYSTEM_2_SETUP.gs', 'utf8');
const ui = readFileSync('app/admin/users/page.tsx', 'utf8');
const errorsEarly = [];

const block = (src, re) => (src.match(re) || [, ''])[1];
const pairs = (txt) => {
  const out = {};
  for (const m of txt.matchAll(/(\w+)\s*:\s*'([a-z_]+)'/g)) out[m[1]] = m[2];
  return out;
};

// 合法 feature = allFeatures 權威清單（包括 attendance_all 呢啲冇角色預設、
// 只靠個別授權開啟嘅「額外權限」，所以唔可以淨係睇 FEATURE_DEFAULTS）
const VALID = new Set(
  [...block(mock, /const allFeatures = \[([\s\S]*?)\];/).matchAll(/'([a-z_]+)'/g)].map(m => m[1])
);
const gsAll = new Set(
  [...block(gs, /var allFeatures = \[([\s\S]*?)\];/).matchAll(/'([a-z_]+)'/g)].map(m => m[1])
);
for (const f of VALID) if (!gsAll.has(f)) errorsEarly.push(`mock allFeatures 有 '${f}'，GS 冇`);
for (const f of gsAll) if (!VALID.has(f)) errorsEarly.push(`GS allFeatures 有 '${f}'，mock 冇`);

const mockMap = pairs(block(mock, /MOCK_ACTION_FEATURE[^=]*=\s*\{([\s\S]*?)\n\};/));
const gsMap = pairs(block(gs, /ACTION_REQUIRED_FEATURE_\s*=\s*\{([\s\S]*?)\n\};/));
const uiFeatures = new Set(
  [...block(ui, /FEATURE_LABELS[^=]*=\s*\{([\s\S]*?)\n\};/).matchAll(/(\w+)\s*:\s*'/g)].map(m => m[1])
);

const errors = [...errorsEarly];

for (const [action, feat] of Object.entries(mockMap))
  if (!VALID.has(feat)) errors.push(`mock：${action} 對照到唔存在嘅 feature '${feat}'`);
for (const [action, feat] of Object.entries(gsMap))
  if (!VALID.has(feat)) errors.push(`GS：${action} 對照到唔存在嘅 feature '${feat}'`);

for (const action of new Set([...Object.keys(mockMap), ...Object.keys(gsMap)])) {
  const a = mockMap[action], b = gsMap[action];
  if (a && b && a !== b) errors.push(`兩邊唔一致：${action} → mock='${a}' 但 GS='${b}'`);
}

for (const f of uiFeatures)
  if (!VALID.has(f)) errors.push(`使用者管理 UI 有開關 '${f}'，但後台唔認得（撳咗都冇用）`);

if (errors.length) {
  console.error('❌ 權限對照表有問題：\n' + errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✅ 權限對照表一致（${Object.keys(mockMap).length} 個 mock / ${Object.keys(gsMap).length} 個 GS action，${VALID.size} 個 feature）`);
