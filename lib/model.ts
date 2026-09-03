/**
 * 角色階級（由高至低）
 *  super_admin   技術測試帳號（開發用，硬編碼，全系統只有一個）
 *  troop_leader  旅長 —— 全旅最高權限，**全旅只有一個**，＝最早建立嘅管理員
 *  admin         管理員 —— 「旅內電腦人」，可以有無數個；第一個管理員就係旅長
 *  group_leader  團長 —— 某一個團／支部嘅負責人，統管該支部所有事（只限自己支部）
 *  branch_leader 支部領袖 —— 協助團長，同樣只限自己支部
 *  coach         教練員 —— 冇固定支部，預設權限＝家長，一切要團長逐項授權
 *  parent / member
 *
 * ⚠️ 已移除 `troop_super`（超管）—— 用戶決定（2026-09-03）。
 *    原因：佢同「旅長」職能重疊，但 GS 後端 9 處 admin 級守衛有 **0 處**包含
 *    `troop_leader`（實測：旅長撳「修改功能授權」被拒，管理員通過 —— 旅長反而
 *    低過管理員，同 `lib/model.ts` 自己寫明嘅「旅長權限＝管理員」相反）。
 *    新模型：**旅長唯一＝第一個管理員，管理員無限**，唔再需要多一層超管。
 *    舊資料入面嘅 `troop_super` 由 `normalizeRole()` 喺讀入時歸一做 `troop_leader`，
 *    唔會變成失去所有權限嘅死帳號。
 */
export type Role = 'super_admin' | 'troop_leader' | 'admin' | 'group_leader' | 'branch_leader' | 'coach' | 'parent' | 'member' | 'guest';
export type EventKind = 'activity' | 'notice_info' | 'notice_troop_participation';
export type ReplyType = 'interested' | 'registered' | 'declined' | 'unresponded';
export type PluginTier = 2 | 3;

/**
 * 舊資料兼容：`troop_super` 已廢除，讀入時一律當旅長。
 *
 * 點解唔直接刪：82 旅嘅 live Sheet 可能已經有 role='troop_super' 嘅帳號。
 * 直接刪會令嗰個帳號喺所有角色清單都搵唔到自己 → 失去所有權限（變死帳號）。
 * 歸一做 troop_leader 先至安全：佢本来就係最高權限，語義上等價。
 */
export function normalizeRole(role: unknown): string {
  const r = String(role ?? '').trim().toLowerCase();
  return r === 'troop_super' ? 'troop_leader' : r;
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: '技術測試帳號',
  troop_leader: '旅長',
  admin: '管理員',
  group_leader: '團長',
  branch_leader: '支部領袖',
  coach: '教練員',
  parent: '家長',
  member: '成員',
  guest: '未登入',
};

export const ROLE_ORDER: Role[] = ['member', 'parent', 'coach', 'branch_leader', 'group_leader', 'admin', 'troop_leader', 'super_admin'];
/** 全旅級：唔受支部限制 */
export const MANAGER_ROLES: Role[] = ['super_admin', 'troop_leader', 'admin'];
/** 只限自己支部嘅領袖 */
export const BRANCH_SCOPED_ROLES: Role[] = ['group_leader', 'branch_leader'];
export const LEADER_ROLES: Role[] = ['group_leader', 'branch_leader', 'coach'];
export const CAN_MARK_LIBRARY: Role[] = ['super_admin', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach'];

/**
 * 未登入可唔可以睇公開資料 —— 由旅團管理員喺 SystemConfig 的 PUBLIC_VIEW 決定。
 * 未設定（舊 GS 冇呢個欄位）→ 維持開放；設成 FALSE / 0 / OFF → 必須登入先睇到。
 */
export function publicViewEnabled(config: any): boolean {
  const v = String(config?.PUBLIC_VIEW ?? '').trim().toLowerCase();
  if (!v) return true;
  return !['false', '0', 'off', 'no', 'n', '否', '關閉', 'disable', 'disabled'].includes(v);
}

export function isAdmin(role?: Role) { return role === 'super_admin' || role === 'troop_leader' || role === 'admin'; }

/** 點名「全旅點名權」功能 key：授予支部領袖／教練員後，可為所有支部點名（預設只有自己支部） */
export const ATTENDANCE_ALL_BRANCHES_FEATURE = 'attendance_all';
export function canMarkAllBranchesAttendance(role?: Role, features?: string[]) {
  if (!role) return false;
  if (['super_admin', 'troop_leader', 'admin'].includes(role)) return true;
  return (features || []).includes(ATTENDANCE_ALL_BRANCHES_FEATURE);
}
export function isLeaderOrAbove(role?: Role) { return !!role && ['super_admin','troop_leader', 'admin','group_leader','branch_leader','coach'].includes(role); }
export function canSeeRole(viewer: Role, target: Role) {
  if (viewer === 'super_admin') return true;
  // 旅長＝全旅最高（除硬編碼嘅技術測試帳號），睇到所有人
  if (viewer === 'troop_leader') return target !== 'super_admin';
  if (viewer === 'admin') return !['super_admin', 'troop_leader'].includes(target);
  if (viewer === 'group_leader') return ['branch_leader','coach','parent','member'].includes(target);
  if (viewer === 'branch_leader') return ['parent','member'].includes(target);
  if (viewer === 'coach') return target === 'member';
  if (viewer === 'parent') return target === 'member';
  return false;
}
export function roleCanSeePlugin(userRole: Role, minRole: Role) {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}

export const branches = [
  { id: 'b1', name: '小童軍支部', short: '小童軍' },
  { id: 'b2', name: '幼童軍支部', short: '幼童軍' },
  { id: 'b3', name: '童軍支部', short: '童軍' },
  { id: 'b4', name: '深資童軍支部', short: '深資' },
  { id: 'b5', name: '樂行童軍支部', short: '樂行' },
];

export const patrols = [
  { id: 'p1', branchId: 'b2', name: 'RED', short: 'R', leaderMemberId: '', deputyLeaderMemberId: '', memberIds: [] as string[] },
  { id: 'p2', branchId: 'b2', name: 'YELLOW', short: 'Y', leaderMemberId: '', deputyLeaderMemberId: '', memberIds: [] as string[] },
  { id: 'p3', branchId: 'b2', name: 'BLUE', short: 'B', leaderMemberId: '', deputyLeaderMemberId: '', memberIds: [] as string[] },
  { id: 'p4', branchId: 'b2', name: 'GREEN', short: 'G', leaderMemberId: '', deputyLeaderMemberId: '', memberIds: [] as string[] },
  { id: 'p5', branchId: 'b3', name: 'TIGER', short: 'T', leaderMemberId: '', deputyLeaderMemberId: '', memberIds: [] as string[] },
  { id: 'p6', branchId: 'b3', name: 'SEAGULL', short: 'S', leaderMemberId: '', deputyLeaderMemberId: '', memberIds: [] as string[] },
  { id: 'p7', branchId: 'b3', name: 'WOLF', short: 'W', leaderMemberId: '', deputyLeaderMemberId: '', memberIds: [] as string[] },
];
