'use client';
import { Role } from './model';
export type Session = { userId: string; name: string; role: Role; troopCode: string; troopName: string; branchId?: string; memberId?: string; age?: number };
export const SESSION_KEY = 'scoutsystem2_current_user';
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function setSession(s: Session) { if (typeof window !== 'undefined') localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
export function clearSession() { if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY); }
export function demoSession(role: Role): Session {
  let selected:any=null;
  if (typeof window !== 'undefined') { try { selected = JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null'); } catch {} }
  const base = { troopCode: selected?.id || '0082', troopName: selected?.name || '第82旅' };
  const map: Record<Role, Session> = {
    super_admin: { userId:'admin', name:'管理員', role, ...base },
    troop_super: { userId:'troop_super', name:'超管', role, ...base },
    admin: { userId:'u1', name:'陳管理員', role, ...base },
    group_leader: { userId:'u2', name:'李團長', role, branchId:'b3', ...base },
    branch_leader: { userId:'u3', name:'黃支部領袖', role, branchId:'b3', ...base },
    coach: { userId:'u4', name:'何教練員', role, branchId:'b3', ...base },
    parent: { userId:'u5', name:'王家長', role, ...base },
    member: { userId:'u6', name:'王小明', role, branchId:'b3', memberId:'m1', age:13, ...base },
    guest: { userId:'guest', name:'訪客', role:'guest', ...base },
  };
  return map[role];
}
