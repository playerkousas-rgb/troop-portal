#!/usr/bin/env node
/**
 * 管理中心「每個角色見到邊几张管理卡」檢查（npm run check:modules）
 *
 * 點解要呢個 check：
 *   管理員／團長／支部領袖／教練員而家共用同一個管理中心版面，
 *   分別只係「顯示嘅管理項目按權限多寡不同」＋「系統管理只屬管理員」。
 *   呢啲規則寫喺兩度（lib/adminModules.ts 嘅 feature 對照 + 後台嘅 userFeatures），
 *   靜靜哋唔一致就會出現「管理員唔夠 8 個管理」或者「團長見到系統管理」。
 *
 * 做法：直接 import 前端真正用嘅清單同權限函式，再向 MOCK 後台（經 /api/proxy，
 * 同真實 GS 後台同一條路）攞每個示範角色嘅 userFeatures，計出實際會出現嘅卡。
 *
 * 用法：先起 dev server（npm run dev），再 npm run check:modules
 *      BASE_URL=http://127.0.0.1:3000 npm run check:modules
 */
import { ADMIN_MODULES, ADMIN_MODULE_TOTAL, SYSTEM_MODULE } from '../lib/adminModules.ts';
import { hasFeature } from '../lib/permissions.ts';
import { isAdmin } from '../lib/model.ts';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
/** 示範帳號（lib/mock.ts DEMO_ACCOUNTS）→ 期望嘅角色 */
const CASES = [
  { userId: 'u_admin', role: 'admin', expectSystem: true },
  { userId: 'u_gl', role: 'group_leader', expectSystem: false },
  { userId: 'u_bl', role: 'branch_leader', expectSystem: false },
  { userId: 'u_coach', role: 'coach', expectSystem: false },
];

async function featuresOf(userId) {
  const url = `${BASE}/api/proxy?action=getState&troopKey=troop_demo&keys=userFeatures&userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ← ${url}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'MOCK 後台回傳失敗');
  return data.state?.userFeatures || [];
}

/** 同 app/admin/page.tsx 完全一樣嘅計法 */
function visibleModules(userFeatures, role) {
  const cards = ADMIN_MODULES.filter(f => hasFeature(userFeatures, f.feature, role));
  if (isAdmin(role)) cards.push(SYSTEM_MODULE);
  return cards;
}

const errors = [];
try {
  for (const c of CASES) {
    const features = await featuresOf(c.userId);
    const cards = visibleModules(features, c.role);
    const ids = cards.map(x => x.id);
    console.log(`${c.userId}（${c.role}）→ ${cards.length} 張卡：${ids.join(', ') || '（冇）'}`);

    if (isAdmin(c.role) && cards.length !== ADMIN_MODULE_TOTAL) {
      errors.push(`管理員應該見到 ${ADMIN_MODULE_TOTAL} 個管理項目，實際 ${cards.length} 個（${ids.join(', ')}）`);
    }
    if (ids.includes(SYSTEM_MODULE.id) !== c.expectSystem) {
      errors.push(`${c.role} ${c.expectSystem ? '應該' : '唔應該'}見到「系統管理」`);
    }
    for (const id of ids) {
      if (!ADMIN_MODULES.some(m => m.id === id) && id !== SYSTEM_MODULE.id) {
        errors.push(`${c.role} 見到清單以外嘅管理卡「${id}」`);
      }
    }
  }
} catch (e) {
  console.error(`❌ 未能向 MOCK 後台取得權限資料：${e.message}`);
  console.error('   請先起 dev server（npm run dev）再執行 npm run check:modules');
  process.exit(1);
}

if (errors.length) {
  console.error('❌ 管理中心管理項目有問題：\n' + errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✅ 管理中心管理項目正確（管理員 ${ADMIN_MODULE_TOTAL} 個；其他領袖按權限顯示，冇系統管理）`);
