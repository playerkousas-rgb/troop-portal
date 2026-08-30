export type Role = 'super_admin' | 'troop_super' | 'admin' | 'group_leader' | 'branch_leader' | 'coach' | 'parent' | 'member' | 'guest';
export type EventKind = 'activity' | 'notice_info' | 'notice_troop_participation';
export type ReplyType = 'interested' | 'registered' | 'declined' | 'unresponded';
export type PluginTier = 2 | 3;

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: '技術測試帳號',
  troop_super: '超管（旅團最高權限）',
  admin: '管理員',
  group_leader: '團長',
  branch_leader: '支部領袖',
  coach: '教練員',
  parent: '家長',
  member: '成員',
  guest: '未登入',
};

export const ROLE_ORDER: Role[] = ['member', 'parent', 'coach', 'branch_leader', 'group_leader', 'admin', 'troop_super', 'super_admin'];
export const MANAGER_ROLES: Role[] = ['super_admin', 'troop_super', 'admin'];
export const LEADER_ROLES: Role[] = ['group_leader', 'branch_leader', 'coach'];
export const CAN_MARK_LIBRARY: Role[] = ['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader', 'coach'];

export function isAdmin(role?: Role) { return role === 'super_admin' || role === 'troop_super' || role === 'admin'; }
export function isLeaderOrAbove(role?: Role) { return !!role && ['super_admin','troop_super','admin','group_leader','branch_leader','coach'].includes(role); }
export function canSeeRole(viewer: Role, target: Role) {
  if (viewer === 'super_admin') return true;
  if (viewer === 'troop_super') return target !== 'super_admin';
  if (viewer === 'admin') return !['super_admin','troop_super'].includes(target);
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
