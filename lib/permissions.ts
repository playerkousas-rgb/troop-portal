// ==================== 階級權限函式 ====================
// 上級可改下級，同級不能改，下級不能改上級

/**
 * 檢查 operator 是否可以修改 targetUser
 */
export function checkEditPermission(
  operatorRole: string,
  operatorBranchId: string,
  operatorId: string,
  targetRole: string,
  targetBranchId: string,
  targetId: string
): { canEdit: boolean; canChangeRole: boolean; reason?: string } {

  // 不能改自己
  if (operatorId === targetId) {
    return { canEdit: true, canChangeRole: false, reason: '不可改自己的角色' };
  }

  // 技術測試帳號（super_admin）→ 全部可改
  if (operatorRole === 'super_admin') {
    return { canEdit: true, canChangeRole: true };
  }

  // 超管（troop_super）→ 可改 admin 及以下
  if (operatorRole === 'troop_super') {
    if (targetRole === 'super_admin') {
      return { canEdit: false, canChangeRole: false, reason: '技術測試帳號只能在 GS 代碼修改' };
    }
    return { canEdit: true, canChangeRole: true };
  }

  // 管理員（admin）→ 可改除超管/技術測試外所有用戶
  if (operatorRole === 'admin') {
    if (targetRole === 'super_admin' || targetRole === 'troop_super') {
      return { canEdit: false, canChangeRole: false, reason: '超管/技術測試帳號只能在 Sheet 修改' };
    }
    return { canEdit: true, canChangeRole: true };
  }

  // 團長（group_leader）→ 可改所屬支部的支部領袖、教練員、家長、成員
  if (operatorRole === 'group_leader') {
    if (['super_admin', 'troop_super', 'admin', 'group_leader'].includes(targetRole)) {
      return { canEdit: false, canChangeRole: false, reason: '權限不足' };
    }
    // 支部領袖和教練員要檢查支部
    if (targetRole === 'branch_leader' || targetRole === 'coach') {
      if (targetBranchId && operatorBranchId && targetBranchId !== operatorBranchId) {
        return { canEdit: false, canChangeRole: false, reason: '只能管理自己支部' };
      }
    }
    return { canEdit: true, canChangeRole: true };
  }

  // 支部領袖（branch_leader）→ 可改所屬支部的教練員、家長、成員（含角色）
  if (operatorRole === 'branch_leader') {
    if (['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader'].includes(targetRole)) {
      return { canEdit: false, canChangeRole: false, reason: '權限不足' };
    }
    // 教練員要檢查支部
    if (targetRole === 'coach') {
      if (targetBranchId && operatorBranchId && targetBranchId !== operatorBranchId) {
        return { canEdit: false, canChangeRole: false, reason: '只能管理自己支部' };
      }
    }
    return { canEdit: true, canChangeRole: true };
  }

  // 教練員（coach）→ 不可改任何人
  if (operatorRole === 'coach') {
    return { canEdit: false, canChangeRole: false, reason: '教練員無權修改其他用戶' };
  }

  // 家長（parent）→ 只能改子女
  if (operatorRole === 'parent') {
    return { canEdit: false, canChangeRole: false, reason: '家長只能修改子女資料' };
  }

  // 成員（member）→ 只能改自己
  if (operatorRole === 'member') {
    return { canEdit: false, canChangeRole: false, reason: '成員只能修改自己的資料' };
  }

  return { canEdit: false, canChangeRole: false, reason: '權限不足' };
}

/**
 * 檢查 operator 可分配給 target 的角色範圍
 * 例如：團長可提升教練員為支部領袖
 */
export function assignableRoles(operatorRole: string): string[] {
  if (operatorRole === 'super_admin') return ['troop_super', 'admin', 'group_leader', 'branch_leader', 'coach', 'parent', 'member'];
  if (operatorRole === 'troop_super') return ['admin', 'group_leader', 'branch_leader', 'coach', 'parent', 'member'];
  if (operatorRole === 'admin') return ['group_leader', 'branch_leader', 'coach', 'parent', 'member'];
  if (operatorRole === 'group_leader') return ['branch_leader', 'coach', 'parent', 'member'];
  if (operatorRole === 'branch_leader') return ['coach', 'parent', 'member']; // 支部領袖可改教練員/家長/成員角色
  return [];
}
