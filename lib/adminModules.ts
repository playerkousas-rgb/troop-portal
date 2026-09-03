/**
 * 管理中心嘅管理項目清單（管理員／團長／支部領袖／教練員共用同一個版面）。
 *
 * 抽做獨立模組嘅原因：
 *   1. 页面（app/admin/page.tsx）只負責排版，權限對照一目了然；
 *   2. scripts/check-admin-modules.mjs 可以直接 import 呢個清單，
 *      用後台真實回傳嘅 userFeatures 驗證「每個角色會見到邊几张卡」，
 *      唔使靠人手數。
 *
 * feature：對應後台 UserPermissions 的權限鍵（同 GS FEATURE_DEFAULTS 一致）。
 * 卡片顯示與否由「使用者管理 → 授權」決定，唔再 hardcode 角色 ——
 * 例如可以單獨開「物資管理」畀某位教練員。
 */
export type AdminModule = {
  id: string;
  icon: string;
  title: string;
  text: string;
  href: string;
  tone: string;
  feature: string;
};

export const ADMIN_MODULES: AdminModule[] = [
  { id: 'branches',  icon: '🏢', title: '支部管理',     text: '管理支部、小隊及啟用狀態。', href: '/admin/branches', tone: 'from-emerald-700 to-emerald-500', feature: 'branches' },
  { id: 'users',     icon: '👥', title: '使用者管理',   text: '帳號、成員資料庫與審核申請（合併）。', href: '/admin/users', tone: 'from-brand-800 to-brand-500', feature: 'users' },
  { id: 'calendar',  icon: '📅', title: '行事曆管理',   text: '恆常集會、特別集會及取消；亦可在行事曆直接修改。', href: '/admin/calendar', tone: 'from-sky-700 to-sky-500', feature: 'calendar' },
  { id: 'attendance', icon: '📝', title: '出席管理',   text: '出席紀錄、後補點名及統計報表（點名本身用底部「📝 點名」）。', href: '/attendance?view=records', tone: 'from-teal-700 to-teal-500', feature: 'attendance' },
  { id: 'events',    icon: '🎯', title: '活動管理',     text: '旅團活動（內部）及 區地域總會活動（外部）；通告與報名統計都在這裡。', href: '/admin/events', tone: 'from-violet-700 to-violet-500', feature: 'events' },
  { id: 'equipment', icon: '📦', title: '物資管理',     text: '物資清單、庫存調整、借用批核及歸還。', href: '/admin/equipment', tone: 'from-amber-700 to-amber-500', feature: 'equipment' },
  { id: 'meetings',  icon: '🤝', title: '會議管理',     text: '會議議程、紀錄及文件連結。', href: '/admin/meetings', tone: 'from-rose-700 to-rose-500', feature: 'meetings' },
];

/**
 * 系統管理 —— 只有管理員先有（用戶要求 #6 #9）。
 * 由舊版管理中心底部嘅「📜 操作紀錄」小標籤升級而成，
 * 內容包括系統設定・操作紀錄（含審核紀錄）・擴充元件。
 */
export const SYSTEM_MODULE = {
  id: 'system',
  icon: '🛠️',
  title: '系統管理',
  text: '系統設定、操作紀錄（含審核紀錄）及擴充元件。',
  href: '/admin/system',
  tone: 'from-slate-800 to-slate-500',
};

/** 管理員見到的管理項目總數（7 個功能管理 + 系統管理） */
export const ADMIN_MODULE_TOTAL = ADMIN_MODULES.length + 1;
