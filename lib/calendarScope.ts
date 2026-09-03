/**
 * 行事曆「支部可見範圍」規則（用戶要求 #3 #4）
 *
 * 規則：
 *   ・管理員級（管理員／旅長／超管／技術帳號）要管全旅 → 睇到所有支部
 *   ・其他所有人（家長／成員／支部領袖／團長／教練員）只睇到
 *       - 全旅項目（scope=troop 或冇支部）
 *       - 自己（家長＝子女）所屬支部嘅項目
 *   ・家長／成員唔需要「會議」（領袖會議）呢個分類
 *
 * 抽做獨立模組嘅原因：規則只寫一次，頁面（app/calendar/page.tsx）同
 * 檢查腳本（scripts/check-calendar-scope.mjs）用同一個函式，
 * 唔會出現「畫面同規則講唔同嘢」。
 */

/** 全旅級角色（唔受支部限制） */
export const CALENDAR_ADMIN_TIER = ['super_admin', 'troop_super', 'troop_leader', 'admin'];

export type CalendarScope = {
  /** 係咪管理員級（睇到全部支部） */
  adminTier: boolean;
  /** 自己（或子女）嘅支部 id 清單 */
  branchIds: string[];
  /** 家長／成員：唔顯示「會議」分類 */
  hideMeetings: boolean;
  /** 呢個支部嘅項目睇唔睇到（全旅項目一律睇到） */
  inScope: (branchId?: string) => boolean;
};

export function calendarScope(opts: {
  role?: string;
  ownBranchId?: string;
  childBranchIds?: string[];
}): CalendarScope {
  const role = opts.role || '';
  const adminTier = CALENDAR_ADMIN_TIER.includes(role);
  const branchIds = Array.from(
    new Set(
      (role === 'parent'
        ? opts.childBranchIds || []
        : [opts.ownBranchId || '']
      ).filter(Boolean)
    )
  );

  return {
    adminTier,
    branchIds,
    hideMeetings: role === 'parent' || role === 'member',
    inScope(branchId?: string) {
      if (adminTier) return true;
      const bid = branchId || 'troop';
      return bid === 'troop' || bid === '' || branchIds.includes(bid);
    },
  };
}
