import type { Role } from './model';

/**
 * 路由存取權限 —— **單一真相來源**。
 *
 * ## 點解要有呢個檔案
 *
 * 之前每頁嘅 `<Auth roles={[...]}>` 同每條 link 嘅顯示條件都各自 hardcode 角色列表，
 * 兩邊會 **drift**。實測（2026-09-03 全 repo 掃描，601 條「源頁可達 × 對外連結」組合）
 * 搵到 4 條真斷連結，全部係同一個根因：
 *
 *   1. `/admin/members`（gate 收 coach）入面條「📥 批量開戶」link **完全冇守衛**，
 *      但目標 `/admin/users` 嘅 gate 唔收 coach → 教練員撳落去撞「未獲授權」牆。
 *   2. `/equipment`（冇 gate）用 `LEADER_ROLES`（**包** coach）決定show唔show
 *      「🛠️ 物資管理」掣，但目標 `/admin/equipment` 嘅 gate 唔收 coach → 同一個牆。
 *   3./4. `/leader` 冇 gate 就直接 `redirect('/admin')`，家長／成員跟舊書籤入嚟
 *      一樣撞牆（應該 redirect 去佢哋自己嘅控制台）。
 *
 * 修法：所有 gate 同 link 守衛都讀呢度，再加 `npm run check:links` 強制校驗
 * 每頁 `<Auth>` 同 `ROUTE_ROLES` 一致 —— 冇得再 drift。
 */

/** 管理層：旅長（全旅唯一・最高人類權限）＋管理員＋技術測試帳號 */
const ADMIN_TIER: Role[] = ['super_admin', 'troop_leader', 'admin'];
/** 支部層：團長＋支部領袖（範圍鎖死喺自己支部） */
const BRANCH_LEADS: Role[] = ['group_leader', 'branch_leader'];
/** 教練員：冇固定支部，權限要靠團長逐項授權 */
const COACH: Role[] = ['coach'];
/** 家庭：家長＋成員 */
const FAMILY: Role[] = ['parent', 'member'];

/** 常見組合（語義化，避免四圍抄角色列表） */
export const ROUTE_ROLE_SETS = {
  /** 只有管理層（系統設定・操作紀錄・擴充元件） */
  ADMIN_ONLY: ADMIN_TIER,
  /** 管理層＋支部領袖（使用者管理・支部管理・物資管理・申請審核） */
  ADMIN_AND_BRANCH: [...ADMIN_TIER, ...BRANCH_LEADS],
  /** 管理層＋支部領袖＋教練員（管理中心・行事曆・活動・會議・出席・通告） */
  ADMIN_BRANCH_COACH: [...ADMIN_TIER, ...BRANCH_LEADS, ...COACH],
  /** 所有已登入角色（出席／點名：家長同成員都要睇到自己嘅紀錄） */
  ALL_LOGGED_IN: [...ADMIN_TIER, ...BRANCH_LEADS, ...COACH, ...FAMILY],
} as const;

/**
 * 每個 route 邊啲角色入到。
 *
 * ⚠️ 呢度必須同 `app/**\/page.tsx` 入面嘅 `<Auth roles={[...]}>` **完全一致**。
 *    `npm run check:links` 會逐頁比對，唔一致就 fail。
 *
 * 冇列喺呢度嘅 route ＝ 公開頁（未登入都入到，例如 `/calendar` `/albums` `/activities`）。
 */
export const ROUTE_ROLES: Record<string, Role[]> = {
  '/admin': [...ROUTE_ROLE_SETS.ADMIN_BRANCH_COACH],
  '/admin/applications': [...ROUTE_ROLE_SETS.ADMIN_AND_BRANCH],
  '/admin/audit': [...ROUTE_ROLE_SETS.ADMIN_ONLY],
  '/admin/branches': [...ROUTE_ROLE_SETS.ADMIN_AND_BRANCH],
  '/admin/calendar': [...ROUTE_ROLE_SETS.ADMIN_BRANCH_COACH],
  '/admin/equipment': [...ROUTE_ROLE_SETS.ADMIN_AND_BRANCH],
  '/admin/events': [...ROUTE_ROLE_SETS.ADMIN_BRANCH_COACH],
  '/admin/meetings': [...ROUTE_ROLE_SETS.ADMIN_BRANCH_COACH],
  '/admin/members': [...ROUTE_ROLE_SETS.ADMIN_BRANCH_COACH],
  '/admin/plugins': [...ROUTE_ROLE_SETS.ADMIN_ONLY],
  '/admin/registrations': [...ROUTE_ROLE_SETS.ADMIN_BRANCH_COACH],
  '/admin/settings': [...ROUTE_ROLE_SETS.ADMIN_ONLY],
  '/admin/system': [...ROUTE_ROLE_SETS.ADMIN_ONLY],
  '/admin/users': [...ROUTE_ROLE_SETS.ADMIN_AND_BRANCH],
  '/attendance': [...ROUTE_ROLE_SETS.ALL_LOGGED_IN],
  '/library/import': [...ROUTE_ROLE_SETS.ADMIN_BRANCH_COACH],
  '/notices/upload': [...ROUTE_ROLE_SETS.ADMIN_BRANCH_COACH],
};

/**
 * 某角色入唔入到某 route。
 *
 * 冇登記嘅 route 當作公開頁（回 true）—— 呢個係刻意嘅：
 * `/calendar` `/albums` `/activities` `/notices` `/equipment` 都係未登入可睇嘅公開頁，
 * 內容層面嘅過濾由 `lib/publicScope.ts` 同各頁自己嘅 scope 邏輯負責。
 *
 * @param path 可以帶 query／hash（會自動剝走）
 */
export function canAccessRoute(path: string, role?: Role | string | null): boolean {
  const clean = String(path || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const allowed = ROUTE_ROLES[clean];
  if (!allowed) return true;               // 公開頁
  if (!role) return false;                 // 有 gate 但未登入
  return allowed.includes(role as Role);
}
