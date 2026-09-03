'use client';
import type { Role } from './model';
export type Session = { userId: string; name: string; role: Role; troopCode: string; troopName: string; branchId?: string; memberId?: string; age?: number; dashboard?: string; iat?: number };

/** 角色 → 登入後的首頁。與 /login 原本的導向規則完全一致，只是抽出來共用，
 *  讓「已登入再開 APP」能回到同一個頁面。 */
export function dashboardFor(role: Role): string {
  switch (role) {
    case 'parent': return '/parent';
    case 'member': return '/member';
    // ★ 管理員／團長／支部領袖／教練員共用同一個「管理中心」（/admin）：
    //   版面一樣，只係顯示嘅管理項目按權限多寡不同，而「系統管理」只有管理員先有。
    case 'admin':
    case 'troop_leader':
    case 'super_admin':
    case 'group_leader':
    case 'branch_leader':
    case 'coach': return '/admin';
    default: return '/';
  }
}
export const SESSION_KEY = 'scoutsystem2_current_user';
/**
 * 登入狀態：**永久有效**（用戶要求登入一次之後唔使再登入）。
 * 所以呢度唔設 exp、唔做過期檢查 —— 只有用戶自己按「登出」先會清除。
 * iat 只係記錄登入時間，方便日後除錯／審計，唔會用來踢人。
 */
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return (s && typeof s === 'object') ? s : null;
  } catch { return null; }
}
export function setSession(s: Session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, iat: s.iat || Date.now() }));
}
export function clearSession() { if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY); }
export function demoSession(role: Role): Session {
  let selected:any=null;
  if (typeof window !== 'undefined') { try { selected = JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null'); } catch {} }
  const base = { troopCode: selected?.id || '0082', troopName: selected?.name || '第82旅' };
  const map: Record<Role, Session> = {
    super_admin: { userId:'admin', name:'管理員', role, ...base },
    troop_leader: { userId:'u_tl', name:'周旅長', role, ...base },
    admin: { userId:'u1', name:'陳管理員', role, ...base },
    group_leader: { userId:'u2', name:'李團長', role, branchId:'b3', ...base },
    branch_leader: { userId:'u3', name:'黃支部領袖', role, branchId:'b3', ...base },
    coach: { userId:'u4', name:'何教練員', role, ...base }, // 教練員冇固定支部
    parent: { userId:'u5', name:'王家長', role, ...base },
    member: { userId:'u6', name:'王小明', role, branchId:'b3', memberId:'m1', age:13, ...base },
    guest: { userId:'guest', name:'訪客', role:'guest', ...base },
  };
  return map[role];
}
