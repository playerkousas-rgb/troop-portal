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

  // 旅長（troop_leader）→ 全旅最高，可改除技術測試帳號外所有人
  // ★ 旅長全旅只有一個 ＝ 最早建立嘅管理員（用戶決定 2026-09-03）。
  //   交接唔係經呢度，而係「交換職位」按鈕（自己變成對方原本嘅角色）。
  if (operatorRole === 'troop_leader') {
    if (targetRole === 'super_admin') {
      return { canEdit: false, canChangeRole: false, reason: '技術測試帳號只能在 GS 代碼修改' };
    }
    return { canEdit: true, canChangeRole: true };
  }

  // 管理員（admin）→ 可改除技術測試帳號／旅長外所有用戶
  // ★ 用戶決定：**其他管理員只能加不能減** —— 可以開新管理員帳號，
  //   但唔可以把另一個管理員降級或者改佢角色（要改必須用後台／旅長）。
  if (operatorRole === 'admin') {
    if (targetRole === 'super_admin') {
      return { canEdit: false, canChangeRole: false, reason: '技術測試帳號只能在 GS 代碼修改' };
    }
    if (targetRole === 'troop_leader') {
      return { canEdit: false, canChangeRole: false, reason: '旅長帳號只有旅長本人可以處理（用「交接旅長」交換職位）' };
    }
    if (targetRole === 'admin') {
      // 其他資料可以改（電話／email／支部…），但角色唔可以動
      return { canEdit: true, canChangeRole: false, reason: '管理員之間只能加不能減：不可以更改其他管理員的角色' };
    }
    return { canEdit: true, canChangeRole: true };
  }

  // 團長（group_leader）→ 可改所屬支部的支部領袖、教練員、家長、成員
  if (operatorRole === 'group_leader') {
    if (['super_admin', 'troop_leader', 'admin', 'group_leader'].includes(targetRole)) {
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
    if (['super_admin', 'troop_leader', 'admin', 'group_leader', 'branch_leader'].includes(targetRole)) {
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
  // ★ troop_leader 刻意**唔喺任何清單入面**：旅長全旅只有一個，
  //   只能由 bootstrap（第一個管理員自動成為旅長）或者「交接旅長」交換按鈕產生，
  //   唔可以經角色下拉直接指派 —— 否則又開返一條提權路。
  // ★ admin 而家**可以**指派 admin（用戶決定：管理員「只能加不能減」——
  //   可以開新管理員帳號，但唔可以改／刪其他管理員）。
  //   呢個同時解決咗之前嘅前後端矛盾：assignableRoles 唔包 admin，
  //   但 GS batchCreateUsers 嘅 allowedRoles 包 admin。
  if (operatorRole === 'super_admin') return ['admin', 'group_leader', 'branch_leader', 'coach', 'parent', 'member'];
  if (operatorRole === 'troop_leader') return ['admin', 'group_leader', 'branch_leader', 'coach', 'parent', 'member'];
  if (operatorRole === 'admin') return ['admin', 'group_leader', 'branch_leader', 'coach', 'parent', 'member'];
  if (operatorRole === 'group_leader') return ['branch_leader', 'coach', 'parent', 'member'];
  if (operatorRole === 'branch_leader') return ['parent', 'member']; // 教練員任命／授權屬團長權責
  return [];
}


// ==================== 功能卡顯示權限（由管理員／團長喺「使用者管理」開關） ====================

/**
 * 每張管理卡對應嘅 feature key（同 GS 的 FEATURE_DEFAULTS／UserPermissions 一致）。
 * 顯示與否 **唔再** hardcode 角色，而係跟後台計好嘅 userFeatures，
 * 咁管理員／團長就可以喺「使用者管理 → 授權」逐個開關（例如畀某個教練員睇物資管理）。
 */
export function hasFeature(userFeatures: string[] | undefined, feature: string, role?: string): boolean {
  // 技術測試／超管／管理員一律全開（同 GS FEATURE_DEFAULTS 一致）
  if (role && ['super_admin', 'troop_leader', 'admin'].includes(role)) return true;
  if (!userFeatures) return false;
  return userFeatures.includes(feature);
}

// ==================== 支部範圍授權（scoped grant）====================

/**
 * 一條授權 = 某人 + 某支部 + 某功能。
 *
 * 由來：深資團團長被童軍團團長邀請去幫手點名 —— 佢喺童軍團應該淨係點到名，
 * 唔會連帶擁有自己團嘅其他權限。所以授權必須綁定支部，唔可以一開就全部通行。
 *
 * branchId = '*' 代表全旅通行（只有旅長／管理員／超管會有）。
 */
export type ScopedGrant = { feature: string; branchId: string };

/** 全旅級角色：唔受支部限制，亦唔需要逐個支部授權 */
const TROOP_WIDE_ROLES = ['super_admin', 'troop_leader', 'admin'];

/**
 * 檢查某人喺某支部有冇某項功能權限。
 *
 * @param grants 該用戶嘅 scoped 授權清單（來自 UserPermissions 表）
 * @param branchId 想操作邊個支部（空 = 自己支部）
 */
export function hasFeatureInBranch(
  opts: {
    role?: string;
    ownBranchId?: string;
    baseFeatures?: string[];   // 角色預設功能（只適用於自己支部）
    grants?: ScopedGrant[];    // 額外嘅跨支部／逐項授權
  },
  feature: string,
  branchId?: string
): boolean {
  const { role = '', ownBranchId = '', baseFeatures = [], grants = [] } = opts;

  // 旅長／管理員／超管：全旅通行
  if (TROOP_WIDE_ROLES.includes(role)) return true;

  const target = branchId || ownBranchId;

  // 自己支部：用角色預設權限
  // （教練員預設冇管理權限，所以呢度自然唔會通過，要靠下面嘅 grants）
  if (target && ownBranchId && target === ownBranchId && baseFeatures.includes(feature)) {
    return true;
  }

  // 逐項授權：要 feature 同 branchId 都夾（'*' = 全旅）
  return grants.some(g =>
    g.feature === feature && (g.branchId === '*' || g.branchId === target)
  );
}

/**
 * 教練員預設權限 = 家長（即冇任何管理功能）。
 * 佢會見到管理卡片，但撳入去要有授權先入到 —— 目的係佢知道有呢啲功能存在，
 * 而唔係對住一個空白畫面唔知自己係咪壞咗。
 */
export function isUnscopedRole(role?: string) {
  return role === 'coach';
}

/** 攞某人實際可以操作嘅支部清單（畀 UI 做支部選擇器用） */
export function grantedBranches(
  role: string | undefined,
  ownBranchId: string | undefined,
  grants: ScopedGrant[] | undefined,
  feature: string,
  allBranchIds: string[]
): string[] {
  if (TROOP_WIDE_ROLES.includes(role || '')) return allBranchIds;
  const out = new Set<string>();
  // 教練員冇固定支部，所以唔會自動有自己支部
  if (ownBranchId && !isUnscopedRole(role)) out.add(ownBranchId);
  for (const g of grants || []) {
    if (g.feature !== feature) continue;
    if (g.branchId === '*') return allBranchIds;
    if (g.branchId) out.add(g.branchId);
  }
  return Array.from(out);
}
