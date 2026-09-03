/**
 * 內置 MOCK 後台（演示旅團 troop_demo / 0088）
 *
 * 用途：MOCK 已實作進 MAIN —— 演示旅團的所有請求都經真實 HTTP 路徑
 *   （前端 fetch → /api/proxy → 此後台）回傳，與真實 Google Apps Script
 *   後台走完全相同的資料格式：
 *     - 讀取：{ success: true, state: {...} }（getDashboard / getState 切片）
 *     - 寫入：{ success: true, state: {...} }（回整包 state）
 *     - 其他：{ success: true, ... } / { success: false, error }
 *   這樣「前端 ↔ 後台」的連線、角色過濾、錯誤處理全部可以實測，
 *   不用等 Google Sheet 部署好。
 *
 * 資料存在伺服器記憶體，並盡量同步到 .mockdata/mock-state.json（已 gitignore），
 *   令 dev server 重啟 / HMR 後演示資料不會消失；檔案系統唯讀（例如 Vercel）
 *   時自動退回純記憶體模式。重設資料：POST /api/proxy?troopKey=troop_demo
 *   action=resetMock，或刪除 .mockdata/mock-state.json。
 *
 * 此檔不可 import 任何 client 專用模組。
 */
import type { AppState, Equipment } from './store';
import type { Role } from './model';
import { branches as modelBranches, MANAGER_ROLES, LEADER_ROLES } from './model';
// PublicCardId 係純 type，要用 `import type`：Node 嘅 --experimental-strip-types
// （npm run check:* 用）唔會自動 elide 混喺 value import 入面嘅 type。
import { PUBLIC_CARD_IDS, scopeKey, toggleCard, toggleScope, canToggleCard, canToggleScope } from './publicScope';
import type { PublicCardId } from './publicScope';
import { DEMO_TROOP_KEY, MOCK_TROOP } from './mockConstants';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

export const MOCK_BACKEND_VERSION = 'mock-3.0';
export { DEMO_TROOP_KEY };

// ==================== 持久化（best-effort） ====================

const MOCK_DB_PATH =
  process.env.MOCK_DB_PATH || path.join(process.cwd(), '.mockdata', 'mock-state.json');

function persist(): void {
  try {
    if (!existsSync(path.dirname(MOCK_DB_PATH))) {
      mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true });
    }
    writeFileSync(MOCK_DB_PATH, JSON.stringify({ store, att, savedAt: new Date().toISOString() }));
  } catch {
    // 唯讀檔案系統（例如 Vercel）→ 純記憶體模式
  }
}

function hydrate(): void {
  try {
    if (!existsSync(MOCK_DB_PATH)) return;
    const raw = JSON.parse(readFileSync(MOCK_DB_PATH, 'utf-8'));
    if (raw && raw.store) store = { ...seed, ...raw.store };
    if (raw && Array.isArray(raw.att)) att = raw.att;
  } catch {
    // 檔案損毀 → 用種子資料重來
  }
}

// ==================== 模擬資料（演示旅團 0088） ====================

const MOCK_EQUIPMENT: Equipment[] = [
  { id: 'eq_demo1', name: '4 人營帳（示範）', category: '露營', unit: '頂', totalQty: 8, availableQty: 6, location: '旅部物資房', note: '含地布及營釘。', enabled: true },
  { id: 'eq_demo2', name: '營燈（示範）', category: '露營', unit: '盞', totalQty: 10, availableQty: 9, location: '旅部物資房', note: '需自備電池。', enabled: true },
  { id: 'eq_demo3', name: '急救包（示範）', category: '安全', unit: '套', totalQty: 3, availableQty: 3, location: '領袖室', note: '', enabled: true },
];

const seed: AppState = {
  config: {
    TROOP_CODE: '0088',
    TROOP_NAME: '演示旅團',
    ADMIN_EMAIL: 'admin@demo.scout',
    REGISTRY_URL: 'https://troop-router.vercel.app/api/registry.json',
    ANNOUNCEMENT_FOLDER_ID: '',
    MEETINGS_FOLDER_ID: '',
    // ★ 公開資料三層模型（lib/publicScope.ts）
    //   第 1 層：管理員開咗邊幾張卡（demo：行事曆＋通告開，相簿未開）
    //   第 2 層：每張卡嘅內容 scope（troop＝全旅由管理員決定；b*＝各支部由團長決定）
    PUBLIC_CARDS: 'calendar,notices',
    PUBLIC_SCOPE_CALENDAR: 'troop,b2,b3',
    PUBLIC_SCOPE_ALBUMS: 'troop',
    PUBLIC_SCOPE_NOTICES: 'troop,b2',
  },
  patrols: [
    { id: 'p01', branchId: 'b1', name: 'BEE', short: 'B', memberIds: [], enabled: true, order: 1 },
    { id: 'p02', branchId: 'b1', name: 'ANT', short: 'A', memberIds: [], enabled: true, order: 2 },
    { id: 'p1', branchId: 'b2', name: '紅', short: 'R', memberIds: [], enabled: true, order: 1 },
    { id: 'p2', branchId: 'b2', name: '黃', short: 'Y', memberIds: [], enabled: true, order: 2 },
    { id: 'p3', branchId: 'b2', name: '藍', short: 'B', memberIds: [], enabled: true, order: 3 },
    { id: 'p10', branchId: 'b3', name: 'TIGER', short: 'T', memberIds: [], enabled: true, order: 1 },
    { id: 'p11', branchId: 'b3', name: 'SEAGULL', short: 'S', memberIds: [], enabled: true, order: 2 },
    { id: 'p12', branchId: 'b3', name: 'WOLF', short: 'W', memberIds: [], enabled: true, order: 3 },
    { id: 'p20', branchId: 'b4', name: 'EAGLE', short: 'E', memberIds: [], enabled: true, order: 1 },
    { id: 'p21', branchId: 'b4', name: 'FALCON', short: 'F', memberIds: [], enabled: true, order: 2 },
    { id: 'p30', branchId: 'b5', name: 'ROVER', short: 'RV', memberIds: [], enabled: true, order: 1 },
  ],
  members: [
    { id: 'm01', ymNumber: '3000000001', name: '陳大文', branchId: 'b3', patrolId: 'p12', patrolRole: 'leader', age: 16, dateOfBirth: '2010-06-12', parentUserId: 'u5', active: true, wantedBadges: 'scout_int_campfire_host|scout_pur_pioneer|scout_srv_first_aider', wantedBadgesAt: '2026-08-28T10:12:00.000Z' },
    { id: 'm02', ymNumber: '3000000002', name: '王小名', branchId: 'b3', patrolId: 'p11', patrolRole: 'member', age: 13, dateOfBirth: '2013-03-01', active: true },
    { id: 'm03', ymNumber: '3000000003', name: '李浩浩', branchId: 'b3', patrolId: 'p10', patrolRole: 'member', age: 15, dateOfBirth: '2011-01-20', active: true },
    { id: 'm04', ymNumber: '3000000004', name: '張磊磊', branchId: 'b3', patrolId: 'p10', patrolRole: 'member', age: 18, dateOfBirth: '2008-11-05', active: true },
    { id: 'm05', ymNumber: '3000000005', name: '林小雨', branchId: 'b2', patrolId: 'p1', patrolRole: 'member', age: 8, dateOfBirth: '2018-05-15', parentUserId: 'u9', active: true },
    { id: 'm06', ymNumber: '3000000006', name: '黃芷晴', branchId: 'b2', patrolId: 'p2', patrolRole: 'member', age: 9, dateOfBirth: '2017-02-10', active: true },
    { id: 'm07', ymNumber: '3000000007', name: '劉琪琪', branchId: 'b2', patrolId: 'p3', patrolRole: 'member', age: 10, dateOfBirth: '2016-08-25', active: true },
    { id: 'm08', ymNumber: '3000000008', name: '周嘉欣', branchId: 'b4', patrolId: 'p20', patrolRole: 'leader', age: 19, dateOfBirth: '2007-04-30', active: true },
    { id: 'm09', ymNumber: '3000000009', name: '吳兆康', branchId: 'b5', patrolId: 'p30', patrolRole: 'leader', age: 21, dateOfBirth: '2005-01-15', active: true },
    { id: 'm10', ymNumber: '3000000010', name: '鄭蓓蓓', branchId: 'b1', patrolId: 'p01', patrolRole: 'member', age: 6, dateOfBirth: '2020-03-03', parentUserId: 'u9', active: true },
    { id: 'm11', ymNumber: '3000000011', name: '黃嘉怡', branchId: 'b4', patrolId: 'p21', patrolRole: 'member', age: 19, dateOfBirth: '2007-09-18', active: true },
    { id: 'm12', ymNumber: '3000000012', name: '陳俊傑', branchId: 'b5', patrolId: 'p30', patrolRole: 'member', age: 20, dateOfBirth: '2006-07-22', active: true },
    { id: 'm13', ymNumber: '3000000013', name: '蔡可可', branchId: 'b1', patrolId: 'p02', patrolRole: 'member', age: 7, dateOfBirth: '2019-04-08', parentUserId: 'u9', active: true },
    // ★ 演示用：同一位家長（u5 王秀蘭）有兩名子女喺**不同支部** ——
    //   陳大文（b3 童軍・16 歲・可自行報名）＋ 陳小美（b2 幼童軍・9 歲・要家長代報）。
    //   用嚟示範「家長行事曆只睇到全旅＋子女支部」同「子女表達 ❤️ 有興趣」。
    { id: 'm14', ymNumber: '3000000014', name: '陳小美', branchId: 'b2', patrolId: 'p2', patrolRole: 'member', age: 9, dateOfBirth: '2017-07-19', parentUserId: 'u5', active: true, wantedBadges: 'cub_astronomer|cub_swimmer|cub_artist', wantedBadgesAt: '2026-08-30T09:05:00.000Z' },
  ],
  users: [
    // ★ 演示旅團刻意唔設 super_admin 帳戶：超管係系統層級嘅隱藏帳號（真實旅團 GS 先有），
    //   demo 最高只到「管理員」。避免任何人對住 troop_demo 就攞到 super_admin session。
    { id: 'u_admin', name: '陳堅強', email: 'admin@demo.scout', role: 'admin', approved: true },
    { id: 'u_tl', name: '周旅長', email: 'tl@demo.scout', role: 'troop_leader', approved: true },
    // 團長 = 某一個團／支部嘅負責人（李偉國 = 深資團 b4 團長）
    { id: 'u_gl', name: '李偉國', email: 'gl@demo.scout', role: 'group_leader', branchId: 'b4', approved: true },
    // 童軍團（b3）團長：佢邀請咗深資團團長 u_gl 幫手點名
    { id: 'u_gl3', name: '陳志明', email: 'gl3@demo.scout', role: 'group_leader', branchId: 'b3', approved: true },
    { id: 'u_bl', name: '黃志遠', email: 'bl@demo.scout', role: 'branch_leader', branchId: 'b3', approved: true },
    { id: 'u_coach', name: '何健', email: 'coach@demo.scout', role: 'coach', approved: true }, // 教練員冇固定支部
    { id: 'u5', name: '王秀蘭', email: 'parent1@demo.scout', role: 'parent', childMemberIds: ['m01', 'm14'], approved: true },
    { id: 'u9', name: '林國雄', email: 'parent2@demo.scout', role: 'parent', childMemberIds: ['m05', 'm10', 'm13'], approved: true },
    { id: 'u_m1', name: '陳大文', email: 'm01@demo.scout', role: 'member', branchId: 'b3', memberId: 'm01', approved: true },
    { id: 'u_m2', name: '王小名', email: 'm02@demo.scout', role: 'member', branchId: 'b3', memberId: 'm02', approved: true },
    { id: 'u_m4', name: '張磊磊', email: 'm04@demo.scout', role: 'member', branchId: 'b3', memberId: 'm04', approved: true },
    // 未成年成員（幼童軍）：同一位家長 u5 嘅第二名子女，支部同哥哥唔同（b2 vs b3）
    { id: 'u_m14', name: '陳小美', email: 'm14@demo.scout', role: 'member', branchId: 'b2', memberId: 'm14', approved: true },
    { id: 'u_m8', name: '周嘉欣', email: 'm08@demo.scout', role: 'member', branchId: 'b4', memberId: 'm08', approved: true },
  ],
  events: [
    { id: 'e00', title: '八月童軍技能日', date: '2026-08-16', location: '旅團部', scope: 'branch', branchId: 'b3', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m01', 'm02', 'm03', 'm04'], fee: '0' , albumUrl: 'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs' },
    { id: 'e01', title: '九月山徑健行', date: '2026-09-12', location: '大帽山', scope: 'branch', branchId: 'b3', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m01', 'm02', 'm03', 'm04'], fee: '50', paymentUrl: 'https://pay.example.com/e01' },
    { id: 'e02', title: '童軍週末營(兩日一夜)', date: '2026-10-03', location: '青年會營地', scope: 'troop', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m01', 'm02', 'm03', 'm04', 'm08', 'm09', 'm11', 'm12'], fee: '300', paymentUrl: 'https://pay.example.com/e02' },
    { id: 'e03', title: '十一區運動會', date: '2026-10-01', location: '東區公園', scope: 'branch', branchId: 'b2', kind: 'activity', status: 'published', source: '圖書館轉入', targetMemberIds: [], fee: '80', noticeUrl: 'https://example.org/circular/district-sports-day.pdf' },
    { id: 'e04', title: '新領袖訓練班', date: '2026-11-08', location: '旅團會議室', scope: 'troop', kind: 'activity', status: 'draft', source: '手動新增', targetMemberIds: ['m04', 'm08', 'm09', 'm11', 'm12'] },
    { id: 'e05', title: '樂行社區服務日', date: '2026-09-20', location: '觀塘邨', scope: 'branch', branchId: 'b5', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m09', 'm12'], fee: '0' },
    { id: 'e06', title: '深資遠征(兩日一夜)', date: '2026-10-10', location: '西貢麥理浩徑', scope: 'branch', branchId: 'b4', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m08', 'm11'], fee: '250', paymentUrl: 'https://pay.example.com/e06' },
    { id: 'e07', title: '小童軍親子日', date: '2026-09-13', location: '本中心園地', scope: 'branch', branchId: 'b1', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m10', 'm13'], fee: '0' },
    // ★ 全旅活動：同時涵蓋 u5 兩名子女（b3 陳大文 ＋ b2 陳小美），
    //   示範「一名子女已報名、另一名子女只表達 ❤️ 有興趣」嘅家長視角。
    { id: 'e08', title: '全旅親子遠足日', date: '2026-09-27', location: '城門水塘（主壩集合）', scope: 'troop', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m01', 'm14'], fee: '20', noticeUrl: 'https://example.org/circular/troop-family-hike.pdf', noticeFileName: '全旅親子遠足日通告.docx', calendarTag: '遠足' },
  ],
  replies: [
    { id: 'e01_m01', eventId: 'e01', memberId: 'm01', memberName: '陳大文', branchId: 'b3', parentUserId: 'u5', type: 'registered', operatedBy: 'parent', paid: true, updatedAt: '2026-08-20' },
    { id: 'e01_m03', eventId: 'e01', memberId: 'm03', memberName: '李浩浩', branchId: 'b3', type: 'registered', operatedBy: 'parent', paid: false, updatedAt: '2026-08-21' },
    { id: 'e01_m04', eventId: 'e01', memberId: 'm04', memberName: '張磊磊', branchId: 'b3', type: 'declined', operatedBy: 'member', updatedAt: '2026-08-21' },
    { id: 'e01_m02', eventId: 'e01', memberId: 'm02', memberName: '王小名', branchId: 'b3', type: 'interested', operatedBy: 'member', updatedAt: '2026-08-22' },
    { id: 'e02_m01', eventId: 'e02', memberId: 'm01', memberName: '陳大文', branchId: 'b3', parentUserId: 'u5', type: 'registered', operatedBy: 'parent', paid: false, updatedAt: '2026-08-23' },
    { id: 'e02_m08', eventId: 'e02', memberId: 'm08', memberName: '周嘉欣', branchId: 'b4', type: 'interested', operatedBy: 'member', updatedAt: '2026-08-24' },
    { id: 'e06_m08', eventId: 'e06', memberId: 'm08', memberName: '周嘉欣', branchId: 'b4', type: 'registered', operatedBy: 'member', paid: false, updatedAt: '2026-08-26' },
    { id: 'e06_m11', eventId: 'e06', memberId: 'm11', memberName: '黃嘉怡', branchId: 'b4', type: 'interested', operatedBy: 'member', updatedAt: '2026-08-26' },
    { id: 'e07_m10', eventId: 'e07', memberId: 'm10', memberName: '鄭蓓蓓', branchId: 'b1', parentUserId: 'u9', type: 'registered', operatedBy: 'parent', updatedAt: '2026-08-27' },
    { id: 'e07_m13', eventId: 'e07', memberId: 'm13', memberName: '蔡可可', branchId: 'b1', parentUserId: 'u9', type: 'registered', operatedBy: 'parent', paid: true, updatedAt: '2026-08-27' },
    // ★ 子女表達「❤️ 有興趣」（非報名）：家長端會見到呢個狀態，但回覆 ✅／❌ 仍然係家長嘅決定
    { id: 'e08_m14', eventId: 'e08', memberId: 'm14', memberName: '陳小美', branchId: 'b2', parentUserId: 'u5', type: 'interested', operatedBy: 'member', updatedAt: '2026-09-01' },
    { id: 'e03_m14', eventId: 'e03', memberId: 'm14', memberName: '陳小美', branchId: 'b2', parentUserId: 'u5', type: 'interested', operatedBy: 'member', updatedAt: '2026-09-01' },
    { id: 'e08_m01', eventId: 'e08', memberId: 'm01', memberName: '陳大文', branchId: 'b3', parentUserId: 'u5', type: 'registered', operatedBy: 'member', paid: false, updatedAt: '2026-09-01' },
  ],
  bookmarks: [
    { id: 'bm01', title: '第 118 周年童軍週', source: '香港童軍', mode: 'informational', branchTags: ['全旅'], audienceTags: ['全旅'], status: 'published', officialDeadline: '2026-09-01', targetText: '周年紀念活動,各旅自行報名。' },
    { id: 'bm02', title: '秋季跨旅遠足', source: '十一區', mode: 'troop_participation', branchTags: ['童軍', '幼童軍'], audienceTags: ['深齡以上'], status: 'published', fee: '120', paymentUrl: 'https://pay.example.com/bm02', officialDeadline: '2026-09-15', internalDeadline: '2026-09-10', activityType: '遠足' },
  ],
  announcements: [
    { announcementId: 'an01', title: '九月總務通告', message: '請各支部於 9 月 5 日前交回支部人數表及出席紀錄。', scope: 'troop', branchId: '', status: 'published', createdAt: '2026-08-28' },
    { announcementId: 'an02', title: '9月20日旅團露營因天氣不穩定取消', message: '天文台預報週末有雷暴，露營順延至 10 月 18-19 日（地點不變）。已繳費用自動轉到新日期。', scope: 'troop', branchId: '', status: 'published', createdAt: '2026-09-01' },
    { announcementId: 'an03', title: '請家長於 9 月 15 日前交 9 月團費', message: '9 月團費 $80，可轉數快或集會時交現金。', scope: 'branch', branchId: 'b3', status: 'published', createdAt: '2026-08-30' },
  ],
  announcementPdfs: [
    { id: 'pdf01', name: '2026-09 總務通告.pdf', url: '#', visible: true, branchTags: ['全旅'], updatedAt: '2026-08-28' },
    { id: 'pdf02', name: '營地安全指引.pdf', url: '#', visible: true, branchTags: ['童軍'], updatedAt: '2026-08-20' },
  ],
  regularMeetings: [
    { id: 'rm3', branchId: 'b1', title: '小童軍恆常集會', weekday: 5, startTime: '19:00', endTime: '20:00', location: '本中心', enabled: true },
    { id: 'rm2', branchId: 'b2', title: '幼童軍恆常集會', weekday: 6, startTime: '14:00', endTime: '15:30', location: '本中心', enabled: true },
    { id: 'rm1', branchId: 'b3', title: '童軍恆常集會', weekday: 6, startTime: '14:00', endTime: '16:00', location: '本中心', enabled: true },
    { id: 'rm4', branchId: 'b4', title: '深資恆常集會', weekday: 5, startTime: '19:00', endTime: '21:00', location: '本中心', enabled: true },
    { id: 'rm5', branchId: 'b5', title: '樂行恆常集會', weekday: 6, startTime: '10:00', endTime: '12:00', location: '社區會堂', enabled: true },
  ],
  cancelledMeetings: [
    { id: 'cm1', branchId: 'b3', date: '2026-09-05', reason: '下雨改期', markedBy: 'u_bl', markedAt: '2026-09-01' },
    { id: 'cm2', branchId: 'b4', date: '2026-09-18', reason: '場地衝突', markedBy: 'u_gl', markedAt: '2026-09-02' },
  ],
  meetings: [
    { id: 'mt1', title: '九月領袖會議(議程)', type: 'agenda', date: '2026-09-02', startTime: '20:00', endTime: '21:30', location: '本中心', status: 'published', targetRoles: ['leader'] },
    { id: 'mt2', title: '八月領袖會議(記錄)', type: 'minutes', date: '2026-08-04', status: 'published' },
  ],
  latestNews: [
    { id: 'news1', text: '9 月 20 日旅團露營因天氣不穩定順延至 10 月 18-19 日，地點不變。', authorUserId: 'u_gl', authorName: '李偉國', createdAt: '2026-09-01' },
    { id: 'news2', text: '9 月團費 $80，請於 15 日前經轉數快或集會時繳交。', authorUserId: 'u_gl', authorName: '李偉國', createdAt: '2026-08-30' },
    { id: 'news3', text: '深資支部 10 月遠征現正招募隊員，有興趣請向支部領袖報名。', authorUserId: 'u_bl', authorName: '黃志遠', createdAt: '2026-08-28' },
  ],
  plugins: [
    { id: 'troop_lib', title: '旅團圖書館', icon: '📚', tier: 2, url: 'https://scout-circulars.vercel.app/', embed: true, minRole: 'member', enabled: true, order: 1 },
  ],
  pluginSettings: [
    { pluginId: 'troop_lib', frontendUrl: 'https://scout-circulars.vercel.app/' },
  ],
  applications: [
    { id: 'ap01', type: 'parent', name: '趙淑芬', email: 'zhao@example.com', role: 'parent', branchId: 'b3', ymNumbers: '3000000001', status: 'pending', createdAt: '2026-08-27' },
  ],
  equipment: MOCK_EQUIPMENT,
  equipmentLoans: [],
  audits: [
    { id: 'log01', userId: 'u_admin', action: 'createEvent', entity: 'Events', entityId: 'e01', createdAt: '2026-08-15', detail: '九月山徑健行' },
    { id: 'log02', userId: 'u5', action: 'setReply', entity: 'EventReplies', entityId: 'e01', createdAt: '2026-08-20', detail: 'm01 → registered' },
    { id: 'log03', userId: 'u_bl', action: 'toggleMeetingCancel', entity: 'MeetingDates', entityId: 'b3/2026-09-05', createdAt: '2026-09-01', detail: '下雨改期' },
  ],
};

// 點名紀錄(獨立存,不屬於 AppState)
type AttRec = { id: string; memberId: string; ymNumber: string; name: string; branchId: string; patrolId?: string; date: string; status: 'P' | 'A' | 'L' | 'E' | 'S' | ''; note?: string; sessionType: 'meeting' | 'activity'; eventId?: string; markedBy?: string; markedAt?: string };

const mockAttendanceSeed: AttRec[] = [
  { id: 'a1', memberId: 'm01', ymNumber: '3000000001', name: '陳大文', branchId: 'b3', patrolId: 'p12', date: '2026-08-29', status: 'P', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-29' },
  { id: 'a2', memberId: 'm02', ymNumber: '3000000002', name: '王小名', branchId: 'b3', patrolId: 'p11', date: '2026-08-29', status: 'A', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-29' },
  { id: 'a3', memberId: 'm03', ymNumber: '3000000003', name: '李浩浩', branchId: 'b3', patrolId: 'p10', date: '2026-08-29', status: 'P', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-29' },
  { id: 'a4', memberId: 'm04', ymNumber: '3000000004', name: '張磊磊', branchId: 'b3', patrolId: 'p10', date: '2026-08-29', status: 'L', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-29' },
  { id: 'a5', memberId: 'm01', ymNumber: '3000000001', name: '陳大文', branchId: 'b3', patrolId: 'p12', date: '2026-08-22', status: 'P', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-22' },
  { id: 'a6', memberId: 'm02', ymNumber: '3000000002', name: '王小名', branchId: 'b3', patrolId: 'p11', date: '2026-08-22', status: 'P', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-22' },
  { id: 'a7', memberId: 'm03', ymNumber: '3000000003', name: '李浩浩', branchId: 'b3', patrolId: 'p10', date: '2026-08-22', status: 'E', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-22' },
  { id: 'a8', memberId: 'm04', ymNumber: '3000000004', name: '張磊磊', branchId: 'b3', patrolId: 'p10', date: '2026-08-22', status: 'P', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-22' },
  { id: 'a9', memberId: 'm01', ymNumber: '3000000001', name: '陳大文', branchId: 'b3', patrolId: 'p12', date: '2026-08-15', status: 'P', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-15' },
  { id: 'a10', memberId: 'm02', ymNumber: '3000000002', name: '王小名', branchId: 'b3', patrolId: 'p11', date: '2026-08-15', status: 'S', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-15' },
  { id: 'a11', memberId: 'm03', ymNumber: '3000000003', name: '李浩浩', branchId: 'b3', patrolId: 'p10', date: '2026-08-15', status: 'P', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-15' },
  { id: 'a12', memberId: 'm04', ymNumber: '3000000004', name: '張磊磊', branchId: 'b3', patrolId: 'p10', date: '2026-08-15', status: 'A', sessionType: 'meeting', markedBy: 'u_bl', markedAt: '2026-08-15' },
  { id: 'a20', memberId: 'm01', ymNumber: '3000000001', name: '陳大文', branchId: 'b3', patrolId: 'p12', date: '2026-08-16', status: 'P', sessionType: 'activity', eventId: 'e00', markedBy: 'u_bl', markedAt: '2026-08-16' },
  { id: 'a21', memberId: 'm02', ymNumber: '3000000002', name: '王小名', branchId: 'b3', patrolId: 'p11', date: '2026-08-16', status: 'P', sessionType: 'activity', eventId: 'e00', markedBy: 'u_bl', markedAt: '2026-08-16' },
  { id: 'a22', memberId: 'm03', ymNumber: '3000000003', name: '李浩浩', branchId: 'b3', patrolId: 'p10', date: '2026-08-16', status: 'E', sessionType: 'activity', eventId: 'e00', markedBy: 'u_bl', markedAt: '2026-08-16' },
  { id: 'a30', memberId: 'm05', ymNumber: '3000000005', name: '林小雨', branchId: 'b2', patrolId: 'p1', date: '2026-08-29', status: 'P', sessionType: 'meeting', markedBy: 'u_gl', markedAt: '2026-08-29' },
  { id: 'a31', memberId: 'm06', ymNumber: '3000000006', name: '黃芷晴', branchId: 'b2', patrolId: 'p2', date: '2026-08-29', status: 'P', sessionType: 'meeting', markedBy: 'u_gl', markedAt: '2026-08-29' },
  { id: 'a32', memberId: 'm07', ymNumber: '3000000007', name: '劉琪琪', branchId: 'b2', patrolId: 'p3', date: '2026-08-29', status: 'A', sessionType: 'meeting', markedBy: 'u_gl', markedAt: '2026-08-29' },
];

let store: AppState = JSON.parse(JSON.stringify(seed));
let att: AttRec[] = JSON.parse(JSON.stringify(mockAttendanceSeed));
hydrate();

let seq = 0;
const uid = (p: string) => `${p}_mock_${Date.now().toString(36)}_${++seq}`;

function calcAge(dob: string): number {
  const d = new Date(String(dob || ''));
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age > 0 && age < 120 ? age : 0;
}

/** 家長開戶連結子女:按 SCOUT ID 或姓名找;找不到就建成員紀錄(不建登入帳號) */
function mockLinkChildren(parent: any, children: any): { linked: string[]; created: string[] } {
  const linked: string[] = [];
  const created: string[] = [];
  const list: any[] = [];
  if (Array.isArray(children)) children.forEach((c: any) => { if (typeof c === 'string') c.split(/[;；,，\n|]+/).forEach((s: string) => { if (s.trim()) list.push(s); }); else if (c) list.push(c); });
  else if (children) String(children).split(/[;；,，\n|]+/).forEach((s: string) => { if (s.trim()) list.push(s); });
  list.forEach(c => {
    const cObj: any = (typeof c === 'object' && c) ? c : {};
    let ym = String(cObj.ymNumber || cObj.ymis || '').trim();
    let nm = String(cObj.name || '').trim();
    if (!nm && typeof c === 'string') nm = c.trim();
    if (!ym && /^\d{7,12}$/.test(nm)) { ym = nm; nm = ''; }
    if (!ym && !nm) return;
    let m = store.members.find(x => (ym ? x.ymNumber === ym : false)) || (nm ? store.members.find(x => x.name === nm) : undefined);
    if (!m) {
      m = { id: uid('m'), ymNumber: ym, name: nm || ('成員 ' + ym), branchId: String(cObj.branchId || 'b1'), patrolId: '', patrolRole: '', age: calcAge(String(cObj.dateOfBirth || '')), dateOfBirth: String(cObj.dateOfBirth || '') || undefined, parentUserId: parent.id, active: true };
      store.members.push(m);
      created.push(nm || ym);
    } else {
      m.parentUserId = parent.id;
      if (!m.dateOfBirth && cObj.dateOfBirth) { m.dateOfBirth = String(cObj.dateOfBirth); m.age = calcAge(String(cObj.dateOfBirth)); }
      linked.push(m.name || ym);
    }
    if (!parent.childMemberIds) parent.childMemberIds = [];
    if (parent.childMemberIds.indexOf(m.id) < 0) parent.childMemberIds.push(m.id);
  });
  return { linked, created };
}

// ==================== 角色過濾(與真後台 buildDashboardCore_ 同向) ====================

const FEATURES: Record<string, string[]> = {
  super_admin: ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'users', 'permissions', 'settings', 'plugins', 'audit', 'calendar', 'equipment'],
  troop_super: ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'users', 'permissions', 'settings', 'plugins', 'audit', 'calendar', 'equipment'],
  admin: ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'users', 'permissions', 'settings', 'plugins', 'audit', 'calendar', 'equipment'],
  // 旅長：實際職級最高，權限同管理員（管理員 = 代旅長操作嘅「旅內電腦人」）
  troop_leader: ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'users', 'permissions', 'settings', 'plugins', 'audit', 'calendar', 'equipment'],
  // 團長：自己支部嘅事一手包辦 —— 包括支部管理（小隊）同使用者管理（帳號／成員／申請），
  // 但範圍鎖死喺自己支部（見 buildMockState 嘅 leaderBranch 過濾）。
  group_leader: ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'users', 'calendar', 'equipment', 'permissions'],
  branch_leader: ['members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'calendar', 'equipment'],
  // 教練員：冇固定支部，預設權限＝家長（即冇任何管理功能）。
  // 想佢幫手就要團長逐項＋逐支部授權（見 USER_SCOPED_GRANTS）。
  coach: [],
  parent: [],
  member: [],
};

/**
 * 個別授權（模擬 GS UserPermissions 表）—— 每條 = 某人 + 某支部 + 某功能。
 * 例：童軍團（b3）團長邀請深資團團長 u_gl 去幫手點名 → 佢喺 b3 淨係點到名。
 * branchId '*' = 全旅通行。
 */
const USER_SCOPED_GRANTS: Record<string, { feature: string; branchId: string }[]> = {
  // 教練員何健：獲童軍團（b3）團長授權，喺 b3 幫手點名（淨係點名）
  u_coach: [{ feature: 'attendance', branchId: 'b3' }],
  // 示範：童軍團（b3）已開通「活動相簿」，所以 b3 嘅人先睇到 e00 個相簿
  u_gl3: [{ feature: 'photos', branchId: 'b3' }],
  u_bl: [{ feature: 'photos', branchId: 'b3' }],
  u_m1: [{ feature: 'photos', branchId: 'b3' }],
  u5: [{ feature: 'photos', branchId: 'b3' }],
  // 深資團團長李偉國：被童軍團團長邀請去幫手點名 → 喺 b3 淨係點到名，
  // 佢喺自己嘅深資團（b4）先有齊團長權限。
  u_gl: [{ feature: 'attendance', branchId: 'b3' }],
};

/** 攤平做「功能」清單（唔理支部）—— 淨係用嚟決定卡片顯示 */
function featuresFor(userId: string, role: string) {
  const base = FEATURES[role] || [];
  const extra = (USER_SCOPED_GRANTS[userId] || []).map(g => g.feature);
  return Array.from(new Set([...base, ...extra]));
}

function grantsFor(userId: string) {
  return USER_SCOPED_GRANTS[userId] || [];
}

const TROOP_WIDE = ['super_admin', 'troop_super', 'troop_leader', 'admin'];

/**
 * 「旅團自選功能」：預設關閉，由團長自己決定開唔開，唔屬階級權限。
 * 團長可以為自己支部開通（即使佢自己未有），否則冇人開得到。
 */
const OPT_IN_FEATURES = ['photos'];

/** 某人喺某支部有冇某功能（支部範圍檢查） */
function hasFeatureInBranch(userId: string, role: string, feature: string, branchId: string) {
  if (TROOP_WIDE.includes(role)) return true;
  const u = store.users.find(x => x.id === userId);
  const own = (u as any)?.branchId || '';
  // 教練員冇固定支部，唔會自動擁有任何支部嘅預設權限
  if (role !== 'coach' && own && branchId === own && (FEATURES[role] || []).includes(feature)) return true;
  return grantsFor(userId).some(g => g.feature === feature && (g.branchId === '*' || g.branchId === branchId));
}

function findUser(userId: string) {
  return store.users.find(u => u.id === userId) || null;
}

export function buildMockState(userId: string): AppState {
  const user = findUser(userId);
  const role: Role = (user?.role as Role) || 'guest';
  const branchId = user?.branchId || '';
  const admin = ['super_admin', 'troop_super', 'troop_leader', 'admin'].includes(role);
  // ★ 可見範圍必須同寫入權限一致：
  //   團長／支部領袖只管自己支部 → 亦只應該睇到自己支部嘅資料
  //   （之前團長 leaderAll=true，寫唔到別團但睇得曬別團成員同家長電話）。
  //   教練員冇固定支部 → 睇到嘅係「獲授權嘅支部」。
  const leaderAll = false;
  const leaderBranch = ['group_leader', 'branch_leader', 'coach'].includes(role);
  // 教練員冇 branchId，用授權嚟決定佢睇到邊個支部
  const grantedBranchIds = Array.from(new Set(
    grantsFor(userId).map(g => g.branchId).filter(b => b && b !== '*')
  ));
  const wildcard = grantsFor(userId).some(g => g.branchId === '*');
  const visibleBranches = wildcard
    ? store.patrols.map(p => p.branchId)
    : Array.from(new Set([...(branchId ? [branchId] : []), ...grantedBranchIds]));
  const inScope = (b?: string) => !b || visibleBranches.includes(b);
  const isMember = role === 'member';
  const isParent = role === 'parent';
  const guest = !user;

  const out: AppState = {
    patrols: [], users: [], members: [], applications: [],
    events: [], replies: [], bookmarks: [],
    announcements: [], announcementPdfs: [],
    regularMeetings: [], cancelledMeetings: [],
    meetings: [], plugins: [], pluginSettings: [],
    equipment: [], equipmentLoans: [], latestNews: [],
    audits: [], config: { ...store.config }, userFeatures: featuresFor(userId, role),
  };

  const memberBranch = isMember ? (store.members.find(m => m.id === user!.memberId)?.branchId || '') : '';

  // 成員
  if (admin || leaderAll) out.members = [...store.members];
  else if (leaderBranch) out.members = store.members.filter(m => inScope(m.branchId));
  else if (isMember) out.members = store.members.filter(m => m.id === user!.memberId);
  else if (isParent) out.members = store.members.filter(m => (user!.childMemberIds || []).includes(m.id));

  // 物資
  if (user) out.equipment = store.equipment;
  if (admin || leaderAll) out.equipmentLoans = [...store.equipmentLoans];
  else if (leaderBranch) out.equipmentLoans = store.equipmentLoans.filter(l => inScope(l.branchId) || l.memberId === userId);
  else if (isMember) out.equipmentLoans = store.equipmentLoans.filter(l => l.memberId === userId || l.memberId === (user!.memberId || ''));
  else if (isParent) out.equipmentLoans = store.equipmentLoans.filter(l => (user!.childMemberIds || []).includes(l.memberId));

  // 使用者
  if (admin || leaderAll) out.users = [...store.users];
  else if (leaderBranch) out.users = store.users.filter(u => inScope(u.branchId));
  // ★ 成員：除咗自己，亦回傳「已連結嘅家長」帳戶 —— 緊急聯絡資料要直接用家長資料
  //   （同 GS buildDashboardCore_ 嘅 member 分支一致）。
  else if (isMember) out.users = store.users.filter(u =>
    u.id === user!.id ||
    (u.role === 'parent' && (
      (u.childMemberIds || []).includes(user!.memberId || '') ||
      store.members.some(m => m.id === user!.memberId && m.parentUserId === u.id)
    ))
  );
  else if (isParent) out.users = store.users.filter(u => u.id === user!.id);

  // 活動
  const visibleEvents = (e: typeof store.events[number]) =>
    guest ? e.status === 'published'
      : admin || leaderAll ? true
      : leaderBranch ? (e.status !== 'archived' && (e.scope === 'branch' ? inScope(e.branchId) : e.status === 'published'))
      // 成員／家長：睇到已發布活動；另外「已封存但自己曾經報過名」嘅活動亦要睇到，
      // 否則佢哋會突然搵唔返自己報咗名／畀咗錢嗰個活動。
      : isMember ? (e.status === 'published' && (e.scope === 'troop' || e.branchId === memberBranch))
          || (e.status === 'archived' && store.replies.some(r => r.eventId === e.id && (r.memberId === user!.memberId || r.memberId === user!.id)))
      : isParent ? (e.status === 'published' && (e.scope === 'troop' || (user!.childMemberIds || []).some(id => { const m = store.members.find(mm => mm.id === id); return m && m.branchId === e.branchId; })))
          || (e.status === 'archived' && store.replies.some(r => r.eventId === e.id && (user!.childMemberIds || []).includes(r.memberId)))
      : false;
  out.events = store.events.filter(visibleEvents);

  // 報名回覆
  const eventIds = new Set(out.events.map(e => e.id));
  if (admin || leaderAll) out.replies = store.replies.filter(r => eventIds.has(r.eventId));
  else if (leaderBranch) out.replies = store.replies.filter(r => eventIds.has(r.eventId) && (out.members.find(m => m.id === r.memberId) != null));
  else if (isMember) out.replies = store.replies.filter(r => r.memberId === user!.memberId || r.memberId === user!.id);
  else if (isParent) out.replies = store.replies.filter(r => (user!.childMemberIds || []).includes(r.memberId));

  // 分隊
  if (admin || leaderAll || leaderBranch) out.patrols = leaderBranch ? store.patrols.filter(p => inScope(p.branchId)) : [...store.patrols];
  else if (isMember) out.patrols = [...store.patrols];

  // 申請：團長／支部領袖睇自己支部嘅（教練員要有授權先）
  if (admin || leaderAll) out.applications = [...store.applications];
  else if (leaderBranch) out.applications = store.applications.filter(a => inScope(a.branchId));

  // 通告 / PDF（領袖睇曬，包括未發布嘅草稿）
  if (admin || leaderAll || leaderBranch) {
    out.bookmarks = [...store.bookmarks];
    out.announcementPdfs = [...store.announcementPdfs];
    out.announcements = [...store.announcements];
  } else if (!guest) {
    out.bookmarks = store.bookmarks.filter(b => b.status === 'published');
    out.announcementPdfs = store.announcementPdfs.filter(p => p.visible !== false);
    out.announcements = [...store.announcements];
  } else {
    out.bookmarks = store.bookmarks.filter(b => b.status === 'published');
    out.announcementPdfs = store.announcementPdfs.filter(p => p.visible !== false);
  }

  // 集會
  if (guest) {
    out.regularMeetings = [...store.regularMeetings];
  } else if (admin || leaderAll) {
    out.regularMeetings = [...store.regularMeetings];
    out.cancelledMeetings = [...store.cancelledMeetings];
  } else if (leaderBranch) {
    out.regularMeetings = store.regularMeetings.filter(r => inScope(r.branchId));
    out.cancelledMeetings = store.cancelledMeetings.filter(c => inScope(c.branchId));
  } else {
    const bs = isMember ? [memberBranch] : isParent ? (user!.childMemberIds || []).map(id => store.members.find(m => m.id === id)?.branchId || '').filter(Boolean) : [];
    out.regularMeetings = store.regularMeetings.filter(r => bs.includes(r.branchId));
    out.cancelledMeetings = store.cancelledMeetings.filter(c => bs.includes(c.branchId));
  }

  // 領袖會議 / 元件
  if (admin || leaderAll || leaderBranch) out.meetings = [...store.meetings];
  if (!guest) {
    out.plugins = store.plugins.filter(p => p.enabled);
    out.pluginSettings = [...store.pluginSettings];
  }

  // 審計
  if (['super_admin', 'troop_super', 'troop_leader', 'admin'].includes(role)) out.audits = [...store.audits];

  // 最新消息：登入後所有人都見到（最多 3 條）
  if (!guest) out.latestNews = [...store.latestNews];

  return out;
}

// ==================== 切片（與真後台 buildStateSlice_ 相同） ====================

function sliceState(full: AppState, keys: string): AppState {
  const keyList = String(keys || 'users,config').split(',').map(k => k.trim()).filter(Boolean);
  const out: AppState = {
    patrols: [], users: [], members: [], applications: [],
    events: [], replies: [], bookmarks: [],
    announcements: [], announcementPdfs: [],
    regularMeetings: [], cancelledMeetings: [],
    meetings: [], plugins: [], pluginSettings: [],
    equipment: [], equipmentLoans: [], latestNews: [],
    audits: [], config: full.config || {}, userFeatures: full.userFeatures || [],
  };
  keyList.forEach(k => {
    const v = (full as any)[k];
    if (v !== undefined) (out as any)[k] = v;
  });
  return out;
}

// ==================== 登入 ====================

function handleMockLogin(p: Record<string, any>) {
  const identifier = String(p.identifier || p.userId || '').trim();
  const loginType = String(p.loginType || 'account');

  // 按 email / userId 找（帳號登入）
  let u = store.users.find(x => x.email.toLowerCase() === identifier.toLowerCase() || x.id === identifier) || null;
  // 按 YMIS 找（成員登入）
  if (!u && (loginType === 'member' || identifier.length === 10)) {
    const m = store.members.find(x => x.ymNumber === identifier);
    u = m ? store.users.find(x => x.memberId === m.id) || null : null;
    if (!u && m) u = { id: m.id, name: m.name, email: '', role: 'member', branchId: m.branchId, memberId: m.id, approved: true };
  }
  if (!u) return { success: false, error: '找不到此帳號(演示資料只有預設帳號)' };
  const member = store.members.find(m => m.id === u!.memberId);
  return {
    success: true,
    user: {
      userId: u.id, name: u.name, role: u.role,
      branchId: u.branchId || '', memberId: u.memberId || (u.role === 'member' && member ? member.id : ''),
      age: member ? member.age : 0, dashboard: '',
    },
  };
}

// ==================== 點名 ====================

function attFor(date: string, sessionType: string, branchId: string, eventId: string) {
  return att.filter(r =>
    r.date === date && r.sessionType === (sessionType === 'activity' ? 'activity' : 'meeting') &&
    r.branchId === branchId && (!eventId || !r.eventId || r.eventId === eventId)
  );
}

function attendanceBranchScope(p: Record<string, any>, requestedBranch: string): { branchId?: string; error?: string } {
  const user = findUser(String(p.userId || p.operatedBy || ''));
  const role = user?.role || 'guest';
  // 旅長／管理員／超管：全旅通行
  if (TROOP_WIDE.includes(role)) return { branchId: requestedBranch || user?.branchId || '' };
  // 團長／支部領袖／教練員：只限自己支部，或獲該支部授權（scoped grant）
  if (['group_leader', 'branch_leader', 'coach'].includes(role)) {
    const own = user?.branchId || '';
    const target = requestedBranch || own;
    if (!target) return { error: '未設定支部，請聯絡管理員。' };
    if (hasFeatureInBranch(user!.id, role, 'attendance', target)) return { branchId: target };
    if (featuresFor(user!.id, role).includes('attendance_all')) return { branchId: target };
    return { error: `你未獲授權為該支部點名，請由該支部團長授權。` };
  }
  if (role === 'member') return { branchId: store.members.find(m => m.id === user?.memberId)?.branchId || '' };
  if (role === 'parent') {
    const kids = store.members.filter(m => (user!.childMemberIds || []).includes(m.id));
    const ids = Array.from(new Set(kids.map(k => k.branchId)));
    if (ids.length === 1) return { branchId: ids[0] };
    return { branchId: requestedBranch && ids.includes(requestedBranch) ? requestedBranch : (ids[0] || '') };
  }
  return { error: '只有領袖可以點名' };
}

function handleGetAttendance(p: Record<string, any>) {
  const date = String(p.date || '');
  const sessionType = p.sessionType === 'activity' ? 'activity' : 'meeting';
  const eventId = String(p.eventId || '');
  const user = findUser(String(p.userId || ''));
  const role = user?.role || 'guest';
  const scope = attendanceBranchScope(p, String(p.branchId || ''));
  if (scope.error) return { success: false, error: scope.error };
  const branchId = scope.branchId;

  let members = store.members.filter(m => m.active && m.branchId === branchId);
  if (role === 'member') members = members.filter(m => m.id === user!.memberId);
  if (role === 'parent') members = members.filter(m => (user!.childMemberIds || []).includes(m.id));
  if (sessionType === 'activity' && eventId) {
    const ev = store.events.find(e => e.id === eventId);
    if (ev && ev.targetMemberIds.length) members = members.filter(m => ev.targetMemberIds.includes(m.id));
  }
  const records = attFor(date, sessionType, branchId, eventId);
  const roster = members.map(m => {
    const r = records.find(x => x.memberId === m.id);
    const patrol = store.patrols.find(p => p.id === m.patrolId);
    return {
      memberId: m.id, ymNumber: m.ymNumber, name: m.name, branchId: m.branchId,
      patrolId: m.patrolId || '', patrolName: patrol ? patrol.name : '',
      status: r ? r.status : '', note: r?.note || '', recordId: r?.id || '',
    };
  });
  return { success: true, roster, saved: records.length, branchId, date, sessionType, eventId };
}

function handleSaveAttendance(p: Record<string, any>) {
  const date = String(p.date || '');
  const sessionType = p.sessionType === 'activity' ? 'activity' : 'meeting';
  const eventId = String(p.eventId || '');
  // ★ 寫入（點名）同讀取（查自己出席紀錄）唔可以共用同一個 scope 檢查：
  //   家長／成員讀得自己嗰支部嘅紀錄，但絕對唔可以寫。
  const writer = findUser(String(p.operatedBy || p.userId || ''));
  const wRole = String((writer as any)?.role || '');
  if (!['super_admin', 'troop_super', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach'].includes(wRole)) {
    return { success: false, error: '只有領袖可以點名。' };
  }
  const scope = attendanceBranchScope(p, String(p.branchId || ''));
  if (scope.error) return { success: false, error: scope.error };
  const branchId = scope.branchId;
  const records: any[] = Array.isArray(p.records) ? p.records : [];
  let saved = 0;
  records.forEach(r => {
    const existing = att.find(x => x.memberId === r.memberId && x.date === date && x.sessionType === sessionType && (x.eventId || '') === eventId);
    if (existing) { existing.status = r.status; existing.note = r.note || ''; existing.markedBy = String(p.operatedBy || ''); }
    else att.push({ id: uid('a'), memberId: r.memberId, ymNumber: r.ymNumber || '', name: r.name || '', branchId, patrolId: r.patrolId || '', date, status: r.status, note: r.note || '', sessionType, eventId: eventId || undefined, markedBy: String(p.operatedBy || '') });
    saved++;
  });
  persist();
  return { success: true, saved, state: buildMockState(String(p.operatedBy || '')) };
}

function handleGetMatrix(p: Record<string, any>) {
  const days = Math.min(parseInt(String(p.days || '30'), 10) || 30, 90);
  const sessionType = p.sessionType === 'activity' ? 'activity' : p.sessionType === 'all' ? 'all' : 'meeting';
  const patrolId = String(p.patrolId || '');
  const from = String(p.from || '');
  const to = String(p.to || '');
  const scope = attendanceBranchScope(p, String(p.branchId || ''));
  if (scope.error) return { success: false, error: scope.error };
  const branchId = scope.branchId;

  const members = store.members.filter(m => m.active && m.branchId === branchId && (!patrolId || m.patrolId === patrolId));

  let records = att.filter(r => r.branchId === branchId);
  if (sessionType !== 'all') records = records.filter(r => r.sessionType === sessionType);
  if (from) records = records.filter(r => r.date >= from);
  if (to) records = records.filter(r => r.date <= to);

  const colMap = new Map<string, { key: string; date: string; sessionType: string; eventId: string; label: string }>();
  records.forEach(r => {
    const key = `${r.date}|${r.sessionType}|${r.eventId || ''}`;
    if (colMap.has(key)) return;
    colMap.set(key, {
      key, date: r.date, sessionType: r.sessionType, eventId: r.eventId || '',
      label: r.date.slice(5) + (sessionType === 'all' ? (r.sessionType === 'activity' ? ' 活' : ' 集') : ''),
    });
  });
  let columns = Array.from(colMap.values()).sort((a, b) => (a.date === b.date ? a.sessionType.localeCompare(b.sessionType) : a.date.localeCompare(b.date)));
  if (!from && !to && columns.length > days) columns = columns.slice(columns.length - days);

  const recMap = new Map<string, string>();
  records.forEach(r => { recMap.set(`${r.memberId}|${r.date}|${r.sessionType}|${r.eventId || ''}`, r.status); });

  const headers = ['YMIS號', '姓名', '支部', '小隊', ...columns.map(c => c.label)];
  const rows = members.map(m => {
    const patrol = store.patrols.find(p => p.id === m.patrolId);
    const row: Record<string, string> = {
      'YMIS號': m.ymNumber || '', '姓名': m.name, '支部': m.branchId, '小隊': patrol ? patrol.name : '',
    };
    columns.forEach(c => {
      row[c.key] = recMap.get(`${m.id}|${c.date}|${c.sessionType}|${c.eventId}`) || '';
    });
    return row;
  });
  return { success: true, headers, columns, rows, branchId, days, sessionType };
}

function handleGetSessions(p: Record<string, any>) {
  const scope = attendanceBranchScope(p, String(p.branchId || ''));
  if (scope.error) return { success: false, error: scope.error };
  const branchId = scope.branchId;
  if (!branchId) return { success: false, error: '請選擇支部' };

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekdayOf = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };

  const seen = new Set<string>();
  const meetings: any[] = [];
  store.regularMeetings.filter(r => r.enabled && r.branchId === branchId).forEach(rule => {
    for (let i = 0; i < 120; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      if (d.getDay() !== rule.weekday) continue;
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const cancelled = store.cancelledMeetings.some(c => c.branchId === branchId && c.date === iso);
      if (cancelled) continue;
      const key = `meeting|${branchId}|${iso}`;
      if (seen.has(key)) continue;
      seen.add(key);
      meetings.push({ id: key, date: iso, label: rule.title, time: `${rule.startTime}-${rule.endTime}`, location: rule.location, weekday: rule.weekday });
    }
  });
  att.filter(r => r.sessionType === 'meeting' && r.branchId === branchId).forEach(r => {
    const key = `meeting|${branchId}|${r.date}`;
    if (seen.has(key)) return;
    seen.add(key);
    meetings.push({ id: key, date: r.date, label: '已點名集會', time: '', location: '', weekday: weekdayOf(r.date) });
  });
  meetings.sort((a, b) => b.date.localeCompare(a.date));
  meetings.forEach(m => { m.hasRecords = att.some(r => r.sessionType === 'meeting' && r.branchId === branchId && r.date === m.date); });

  const activities = store.events
    .filter(e => e.kind === 'activity' && e.status === 'published' && (e.scope === 'troop' || e.branchId === branchId))
    .map(e => ({ id: e.id, date: e.date, label: e.title, location: e.location, branchId: e.branchId, scope: e.scope, hasRecords: att.some(r => r.sessionType === 'activity' && r.eventId === e.id) }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return { success: true, branchId, today, meetings, activities };
}

function handleMemberAttendance(p: Record<string, any>) {
  let target = store.members.find(m => m.id === p.memberId) || store.members.find(m => m.ymNumber === p.ymNumber) || store.members.find(m => m.name === p.name) || null;
  const user = findUser(String(p.userId || ''));
  if (!target && user?.role === 'member') target = store.members.find(m => m.id === user.memberId) || null;
  if (!target) return { success: false, error: '找不到該成員' };
  const records = att.filter(r => r.memberId === target!.id).sort((a, b) => b.date.localeCompare(a.date));
  const dates: Record<string, { status: string; note: string; sessionType: string; eventId?: string }> = {};
  const stats = { P: 0, A: 0, L: 0, E: 0, S: 0, blank: 0, total: 0 };
  records.forEach(r => {
    dates[r.date] = { status: r.status, note: r.note || '', sessionType: r.sessionType, eventId: r.eventId || '' };
    if (r.status === 'P' || r.status === 'A' || r.status === 'L' || r.status === 'E' || r.status === 'S') stats[r.status]++;
    else stats.blank++;
    stats.total++;
  });
  const patrol = store.patrols.find(p => p.id === target!.patrolId);
  return {
    success: true,
    record: {
      memberId: target!.id, ymNumber: target!.ymNumber || '', name: target!.name,
      branchId: target!.branchId, patrolId: target!.patrolId || '',
      patrolName: patrol ? patrol.name : '', dates, stats,
    },
  };
}

// ==================== 報名統計 ====================

function handleRegistrationSummary(p: Record<string, any>) {
  const eventId = String(p.eventId || '');
  const event = store.events.find(e => e.id === eventId);
  if (!event) return { success: false, error: '活動不存在' };
  const targets = event.targetMemberIds.map(id => store.members.find(m => m.id === id)).filter(Boolean) as typeof store.members;
  const replies = store.replies.filter(r => r.eventId === eventId);
  const cls = (type: string) => targets.filter(m => replies.find(r => r.memberId === m.id)?.type === type);
  return {
    success: true,
    data: {
      event: { eventId, title: event.title, date: event.date, scope: event.scope, branchId: event.branchId, fee: event.fee },
      registered: cls('registered'), interested: cls('interested'), declined: cls('declined'),
      unresponded: targets.filter(m => !replies.find(r => r.memberId === m.id)),
      summary: {
        totalTarget: targets.length,
        registeredCount: cls('registered').length,
        interestedCount: cls('interested').length,
        declinedCount: cls('declined').length,
        unrespondedCount: targets.filter(m => !replies.find(r => r.memberId === m.id)).length,
        paidCount: cls('registered').filter(m => replies.find(r => r.memberId === m.id)?.paid).length,
      },
    },
  };
}

// ==================== 寫入（改 mock store，回整包 state） ====================

const S = (operatedBy: string) => ({ success: true, state: buildMockState(String(operatedBy || '')) });

/** 寫入操作紀錄（審核紀錄與操作紀錄合併在同一份，前端再分類） */
function logAudit(userId: string, action: string, entity: string, entityId: string, detail: string) {
  store.audits.unshift({
    id: uid('log'),
    userId: String(userId || 'system'),
    action,
    entity,
    entityId: String(entityId || ''),
    createdAt: new Date().toISOString().slice(0, 10),
    detail: String(detail || ''),
  });
  if (store.audits.length > 300) store.audits = store.audits.slice(0, 300);
}


/**
 * 判斷活動係咪「區地域總會活動」。
 * 必須同 lib/store.ts 的 eventCategory 邏輯一致：
 * 新資料睇 category；舊資料要按 kind / source 推斷（例如 source='圖書館轉入'）。
 */
function isDistrictEvent(e: { kind?: string; source?: string; category?: string } | null | undefined): boolean {
  if (!e) return false;
  if (e.category === 'district') return true;
  if (e.category === 'self') return false;
  if (e.kind === 'notice_troop_participation') return true;
  return /圖書館|地域|區會|區地域|總會/.test(e.source || '');
}


/**
 * ★ 伺服器端角色驗證（同 GS 端 ACTION_REQUIRED_FEATURE_ 一致）
 *
 * 點解要有：前端隱藏咗個掣，只係「唔畀你撩到」，但攻擊者可以直接用
 * curl / F12 重放個 request，完全繞過 UI。所以高危動作必須喺後台再驗一次身份。
 */
const MOCK_ACTION_FEATURE: Record<string, string> = {
  createUser: 'users', deleteUser: 'users', toggleUser: 'users',
  updateUserRole: 'users', updateUserField: 'users',
  batchCreateUsers: 'users', batchCreateMembers: 'members',
  // 授權：團長喺自己支部就可以授權（唔需要 users＝帳號管理權），
  // 但 handleGrantFeature 會再檢查「只可授自己支部」同「唔可以授出自己都冇嘅功能」。
  grantFeature: 'permissions', revokeFeature: 'permissions', updateUserPermissions: 'permissions',
  createMember: 'members', updateMember: 'members', deleteMember: 'members', linkParent: 'members',
  decideApplication: 'applications',
  createPatrol: 'branches', togglePatrol: 'branches', deletePatrol: 'branches',
  createEvent: 'events', updateEvent: 'events', deleteEvent: 'events',
  archiveEvent: 'events', reopenEvent: 'events',
  togglePaid: 'registrations', confirmPayment: 'registrations',
  updateConfig: 'settings', updateSettings: 'settings',
  saveConfig: 'settings', savePluginSetting: 'plugins', togglePluginStatus: 'plugins',
  publishEvent: 'events', restoreEvent: 'events',
  createMeeting: 'meetings', updateMeeting: 'meetings', deleteMeeting: 'meetings', publishMeeting: 'meetings',
  createRegularMeeting: 'calendar', updateRegularMeeting: 'calendar',
  deleteRegularMeeting: 'calendar', toggleRegularMeeting: 'calendar', toggleMeetingCancel: 'calendar',
  createEquipment: 'equipment', updateEquipment: 'equipment', deleteEquipment: 'equipment',
  adjustEquipmentQty: 'equipment', decideEquipmentLoan: 'equipment', returnEquipmentLoan: 'equipment',
};

function checkMockPermission(action: string, p: Record<string, any>): { success: false; error: string } | null {
  const needed = MOCK_ACTION_FEATURE[action];
  if (!needed) return null;
  const operator = store.users.find(u => u.id === String(p.operatedBy || ''));
  if (!operator) {
    return { success: false, error: '未能確認操作者身份，請重新登入。' };
  }
  const role = String((operator as any).role || '');
  if (TROOP_WIDE.includes(role)) return null;

  // ★ 支部範圍檢查：唔單止睇「有冇呢個功能」，仲要睇「喺邊個支部有」。
  //   深資團團長就算喺自己團有 members 權限，都唔可以攞去改童軍團嘅成員，
  //   除非童軍團團長specifically授咗權。
  const target = resolveTargetBranch(action, p) || String((operator as any).branchId || '');
  if (!hasFeatureInBranch(operator.id, role, needed, target)) {
    const own = String((operator as any).branchId || '');
    if (target && own && target !== own) {
      return { success: false, error: `權限不足：你未獲授權管理該支部的「${needed}」。請由該支部團長授權。` };
    }
    return { success: false, error: `權限不足：此操作需要「${needed}」權限。` };
  }
  return null;
}

/** 由 request 參數推斷今次操作嘅目標支部（用嚟做跨支部檢查） */
function resolveTargetBranch(action: string, p: Record<string, any>): string {
  if (p.branchId) return String(p.branchId);
  const mem = store.members.find(m => m.id === String(p.memberId || ''));
  if (mem) return String(mem.branchId || '');
  const usr = store.users.find(u => u.id === String(p.userId || ''));
  if (usr) return String((usr as any).branchId || '');
  const ev = store.events.find(e => e.id === String(p.eventId || ''));
  if (ev) return String((ev as any).branchId || '');
  const pt = store.patrols.find(x => x.id === String(p.patrolId || ''));
  if (pt) return String((pt as any).branchId || '');
  return '';
}


/**
 * 相簿功能預設關閉（相片涉及小朋友私隱）。
 * 前端會鎖住個欄位，但 request 可以繞過 UI，所以後台要再驗一次。
 */
function albumAllowed(operatedBy: string, url: string): string {
  if (!url) return '';
  const u = store.users.find(x => x.id === operatedBy);
  const role = String((u as any)?.role || '');
  if (!featuresFor(operatedBy, role).includes('photos')) return '';
  return url;
}

function handleMutate(action: string, p: Record<string, any>) {
  const ob = String(p.operatedBy || '');
  const findIdx = (arr: any[], idField: string, id: string) => arr.findIndex(x => x[idField] === id);

  switch (action) {
    // 成員
    case 'createMember':
      store.members.push({ id: uid('m'), ymNumber: String(p.ymNumber || ''), name: String(p.name || ''), email: String(p.email || ''), branchId: String(p.branchId || ''), patrolId: String(p.patrolId || ''), age: 0, dateOfBirth: String(p.dateOfBirth || ''), parentUserId: String(p.parentUserId || ''), active: true });
      logAudit(ob, 'createMember', '成員', '', String(p.name || ''));
      return S(ob);
    case 'updateMember': {
      const i = findIdx(store.members, 'id', String(p.memberId || ''));
      if (i >= 0) Object.assign(store.members[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'memberId'].includes(k))));
      return S(ob);
    }
    case 'setWantedBadges': {
      // 成員自助：只容許本人／其家長／有 members 權限嘅領袖（checkMockPermission 唔管呢個 action）
      const i = findIdx(store.members, 'id', String(p.memberId || ''));
      if (i < 0) return { success: false, error: '找不到成員' };
      const me = store.members[i];
      const opUser = store.users.find(u => u.id === String(p.operatedBy || ''));
      const opRole = String(opUser?.role || '');
      // ★ 用共用常數：MANAGER_ROLES（管理層）＋ LEADER_ROLES（團長／支部領袖／教練員）。
      //   唔好手寫角色清單 —— 之前寫漏 group_leader／branch_leader 令支部領袖都登記唔到。
      const isLeader = (MANAGER_ROLES as string[]).includes(opRole) || (LEADER_ROLES as string[]).includes(opRole);
      const isSelf = String(opUser?.memberId || '') === me.id;
      const isParent = String(me.parentUserId || '') === String(p.operatedBy || '');
      if (!isLeader && !isSelf && !isParent) return { success: false, error: '只可以登記自己（或自己子女）想考的章。' };
      if (me.branchId !== 'b2' && me.branchId !== 'b3' && !isLeader) {
        return { success: false, error: '你嘅支部冇「想考的章」選單，請直接同領袖講。' };
      }
      me.wantedBadges = String(p.wantedBadges || '').slice(0, 2000);
      me.wantedBadgesAt = new Date().toISOString();
      logAudit(ob, 'setWantedBadges', '成員', me.id, me.wantedBadges ? (me.wantedBadges.split(/[|,;]/).filter(Boolean).length + ' 個章') : '（清空）');
      return S(ob);
    }
    /* ═══ 公開資料：第 1 層（管理員開／關卡片）═══ */
    case 'setPublicCard': {
      const card = String(p.card || '');
      if (!PUBLIC_CARD_IDS.includes(card as PublicCardId)) return { success: false, error: '未知的卡片' };
      const opUser = store.users.find(u => u.id === String(p.operatedBy || ''));
      if (!opUser) return { success: false, error: '未能確認操作者身份，請重新登入。' };
      if (!canToggleCard(String(opUser.role || ''))) return { success: false, error: '只有管理層可以開放公開資料卡片。' };
      const on = ['true', 'TRUE', '1', 'yes'].includes(String(p.enabled));
      const key = scopeKey(card as PublicCardId) as keyof typeof store.config;
      const r = toggleCard(store.config.PUBLIC_CARDS, String(store.config[key] || ''), card as PublicCardId, on);
      store.config.PUBLIC_CARDS = r.cards;
      (store.config as any)[key] = r.scopes;
      logAudit(ob, 'setPublicCard', 'SystemConfig', card, on ? '開放卡片' : '關閉卡片');
      return S(ob);
    }
    /* ═══ 公開資料：第 2 層（內容 scope：troop 由管理員，支部由該支部團長）═══ */
    case 'setPublicScope': {
      const card = String(p.card || '');
      const scope = String(p.scope || '');
      if (!PUBLIC_CARD_IDS.includes(card as PublicCardId)) return { success: false, error: '未知的卡片' };
      if (!scope) return { success: false, error: '缺少範圍' };
      const opUser = store.users.find(u => u.id === String(p.operatedBy || ''));
      if (!opUser) return { success: false, error: '未能確認操作者身份，請重新登入。' };
      if (!canToggleScope(String(opUser.role || ''), opUser.branchId, scope)) {
        return { success: false, error: scope === 'troop' ? '全旅內容只可以由管理層決定公唔公開。' : '只可以開放自己支部嘅內容。' };
      }
      const key = scopeKey(card as PublicCardId);
      const on = ['true', 'TRUE', '1', 'yes'].includes(String(p.enabled));
      (store.config as any)[key] = toggleScope(String((store.config as any)[key] || ''), scope, on);
      logAudit(ob, 'setPublicScope', 'SystemConfig', card + '/' + scope, on ? '公開' : '取消公開');
      return S(ob);
    }
    case 'deleteMember': store.members = store.members.filter(m => m.id !== p.memberId); return S(ob);
    case 'linkParent': {
      const i = findIdx(store.members, 'id', String(p.memberId || ''));
      if (i >= 0) store.members[i].parentUserId = String(p.parentUserId || '');
      return S(ob);
    }
    // 使用者
    case 'createUser': {
      const nu: any = { id: uid('u'), name: String(p.name || ''), email: String(p.email || ''), role: (p.role || 'member') as Role, branchId: String(p.branchId || ''), approved: true };
      store.users.push(nu);
      mockLinkChildren(nu, p.children);
      return S(ob);
    }
    case 'batchCreateUsers': {
      const rows: any[] = Array.isArray(p.rows) ? p.rows : [];
      rows.forEach(r => {
        const nu: any = { id: uid('u'), name: String(r.name || ''), email: String(r.email || ''), role: (r.role || 'member') as Role, branchId: String(r.branchId || ''), approved: true };
        store.users.push(nu);
        if (String(r.role || '').toLowerCase() === 'parent' && r.children) mockLinkChildren(nu, r.children);
      });
      return S(ob);
    }
    case 'batchCreateMembers': {
      const rows: any[] = Array.isArray(p.rows) ? p.rows : [];
      rows.forEach(r => {
        const ym = String(r.ymNumber || '');
        if (ym && store.members.some(m => m.ymNumber === ym)) return; // 跳過重複
        const id = uid('m');
        const dob = String(r.dateOfBirth || '');
        const name = String(r.name || '');
        const branchId = String(r.branchId || '');
        const patrolRole = ['leader', 'deputy', 'member'].includes(String(r.patrolRole || '')) ? String(r.patrolRole) as 'leader' | 'deputy' | 'member' : '';
        store.members.push({ id, ymNumber: ym, name, branchId, patrolId: String(r.patrolId || ''), patrolRole, age: calcAge(dob), dateOfBirth: dob || undefined, parentUserId: String(r.parentUserId || ''), active: true });
        store.users.push({ id: uid('u'), name, email: String(r.email || ''), role: 'member', branchId, memberId: id, approved: true });
      });
      return S(ob);
    }
    case 'deleteUser': store.users = store.users.filter(u => u.id !== p.userId); return S(ob);
    case 'toggleUser': { const i = findIdx(store.users, 'id', String(p.userId || '')); if (i >= 0) store.users[i].approved = !store.users[i].approved; return S(ob); }
    case 'updateUserRole': { const i = findIdx(store.users, 'id', String(p.userId || '')); if (i >= 0) store.users[i].role = p.role as Role; return S(ob); }
    case 'updateUserField': {
      const i = findIdx(store.users, 'id', String(p.userId || ''));
      if (i >= 0 && p.field) (store.users[i] as any)[p.field] = String(p.value ?? '');
      return S(ob);
    }
    // 物資清單
    case 'createEquipment':
      store.equipment.push({
        id: uid('eq'), name: String(p.name || ''), category: String(p.category || '其他'),
        unit: String(p.unit || '件'), totalQty: Number(p.totalQty) || 0, availableQty: Number(p.totalQty) || 0,
        location: String(p.location || ''), note: String(p.note || ''), enabled: p.enabled !== false,
      });
      return S(ob);
    case 'updateEquipment': {
      const i = findIdx(store.equipment, 'id', String(p.equipmentId || ''));
      if (i >= 0) {
        const eq = store.equipment[i];
        const loaned = Math.max(0, eq.totalQty - eq.availableQty);
        ['name', 'category', 'unit', 'location', 'note'].forEach(k => { if (p[k] !== undefined) (eq as any)[k] = String(p[k]); });
        if (p.totalQty !== undefined && String(p.totalQty) !== '') {
          eq.totalQty = Number(p.totalQty) || 0;
          eq.availableQty = eq.totalQty - loaned;
        }
        if (p.enabled !== undefined) eq.enabled = p.enabled === true || p.enabled === 'true';
      }
      return S(ob);
    }
    case 'adjustEquipmentQty': {
      const i = findIdx(store.equipment, 'id', String(p.equipmentId || ''));
      if (i >= 0) {
        const eq = store.equipment[i];
        const loaned = Math.max(0, eq.totalQty - eq.availableQty);
        eq.totalQty = Math.max(loaned, eq.totalQty + (Number(p.delta) || 0));
        eq.availableQty = eq.totalQty - loaned;
      }
      return S(ob);
    }
    case 'deleteEquipment': store.equipment = store.equipment.filter(e => e.id !== p.equipmentId); return S(ob);
    // 借用申請
    case 'requestEquipmentLoan': {
      let items: any[] = [];
      try { items = JSON.parse(String(p.items || '[]')); } catch { items = []; }
      const me = findUser(ob);
      const borrower = me || { id: ob, name: '演示用家', branchId: 'b3', memberId: ob };
      const batchRef = uid('BR');
      items.forEach((it: any) => {
        const eq = store.equipment.find(e => e.id === String(it.equipmentId || ''));
        const qty = Math.floor(Number(it.qty) || 0);
        if (!eq || !(qty > 0) || qty > eq.availableQty) return;
        store.equipmentLoans.push({
          id: uid('ln'), batchRef, equipmentId: eq.id, equipmentName: eq.name, unit: eq.unit, qty,
          memberId: String(borrower.memberId || borrower.id), memberName: String(borrower.name || ''),
          branchId: String(borrower.branchId || ''), purpose: String(p.purpose || ''),
          borrowDate: String(p.borrowDate || ''), returnDueDate: String(p.returnDueDate || ''),
          status: 'pending', requestedAt: new Date().toISOString(), note: String(p.note || ''),
        });
      });
      return S(ob);
    }
    case 'updateEquipmentLoan': {
      const i = findIdx(store.equipmentLoans, 'id', String(p.loanId || ''));
      if (i >= 0 && store.equipmentLoans[i].status === 'pending') {
        const l = store.equipmentLoans[i];
        if (p.qty !== undefined && String(p.qty) !== '') l.qty = Math.floor(Number(p.qty) || l.qty);
        ['purpose', 'borrowDate', 'returnDueDate', 'note'].forEach(k => { if (p[k] !== undefined) (l as any)[k] = String(p[k]); });
      }
      return S(ob);
    }
    case 'cancelEquipmentLoan': {
      const i = findIdx(store.equipmentLoans, 'id', String(p.loanId || ''));
      if (i >= 0 && store.equipmentLoans[i].status === 'pending') store.equipmentLoans[i].status = 'cancelled';
      return S(ob);
    }
    case 'decideEquipmentLoan': {
      const i = findIdx(store.equipmentLoans, 'id', String(p.loanId || ''));
      if (i >= 0 && store.equipmentLoans[i].status === 'pending') {
        const l = store.equipmentLoans[i];
        const eq = store.equipment.find(e => e.id === l.equipmentId);
        if (String(p.decision) === 'approved' && eq && l.qty <= eq.availableQty) {
          eq.availableQty -= l.qty;
          l.status = 'approved';
        } else {
          l.status = 'rejected';
        }
        l.decidedBy = String(ob || '演示領袖');
        l.decidedAt = new Date().toISOString();
        l.decisionNote = String(p.note || '');
      }
      return S(ob);
    }
    case 'returnEquipmentLoan': {
      const i = findIdx(store.equipmentLoans, 'id', String(p.loanId || ''));
      if (i >= 0 && store.equipmentLoans[i].status === 'approved') {
        const l = store.equipmentLoans[i];
        const eq = store.equipment.find(e => e.id === l.equipmentId);
        if (eq) eq.availableQty += l.qty;
        l.status = 'returned';
        l.returnedAt = new Date().toISOString();
        l.returnedBy = String(ob || '演示領袖');
      }
      return S(ob);
    }
    case 'updatePassword': return S(ob);
    case 'updateUserPermissions':
    case 'grantFeature':
    case 'revokeFeature': {
      // ★ 授權只可以開自己支部 —— 童軍團團長邀請人幫手，只可以邀請入童軍團，
      //   唔可以順手幫深資團開權限。
      const actor = findUser(ob);
      const actorRole = String((actor as any)?.role || '');
      const actorBranch = String((actor as any)?.branchId || '');
      let scope = String(p.branchId || '');
      if (!TROOP_WIDE.includes(actorRole)) {
        if (!scope) scope = actorBranch;
        if (scope !== actorBranch) {
          return { success: false, error: '你只可以授權自己支部的權限，其他支部須由該支部團長授權。' };
        }
        // 唔可以授出自己都冇嘅功能。
        // 例外：OPT_IN_FEATURES 屬「旅團自選功能」（唔係階級權限），
        // 團長可以為自己支部開通，否則會出現「冇人開得到」嘅死結。
        const feat = String(p.feature || '');
        if (feat && !OPT_IN_FEATURES.includes(feat) && !hasFeatureInBranch(ob, actorRole, feat, actorBranch)) {
          return { success: false, error: '你沒有權限授權此功能給他人。' };
        }
        if (OPT_IN_FEATURES.includes(feat) && !['group_leader', 'branch_leader'].includes(actorRole)) {
          return { success: false, error: '只有團長／支部領袖或管理員可以開通此功能。' };
        }
      } else if (!scope) {
        scope = '*';
      }
      const tid = String(p.targetUserId || p.userId || '');
      if (tid && p.feature) {
        const list = USER_SCOPED_GRANTS[tid] || (USER_SCOPED_GRANTS[tid] = []);
        const feat = String(p.feature);
        const idx = list.findIndex(g => g.feature === feat && g.branchId === scope);
        if (action === 'revokeFeature' || p.granted === false) {
          if (idx >= 0) list.splice(idx, 1);
        } else if (idx < 0) {
          list.push({ feature: feat, branchId: scope });
        }
      }
      return S(ob);
    }
    case 'getUserFeatures': {
      const tu = findUser(String(p.targetUserId || ''));
      const role = tu?.role || 'member';
      const defaults = FEATURES[role] || [];
      const overrides: Record<string, boolean> = {};
      grantsFor(tu?.id || '').forEach(g => { overrides[g.feature] = true; });
      const allFeatures = ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'attendance_all', 'library_import', 'notices', 'users', 'permissions', 'settings', 'meetings', 'equipment', 'plugins', 'audit', 'calendar', 'photos'];
      return {
        success: true,
        role,
        features: allFeatures.map(f => {
          const isDefault = defaults.includes(f);
          const overridden = overrides[f] !== undefined;
          return { feature: f, enabled: overridden ? overrides[f] : isDefault, isDefault, overridden };
        }),
      };
    }
    // 小隊
    case 'createPatrol':
      store.patrols.push({ id: uid('p'), branchId: String(p.branchId || ''), name: String(p.name || ''), short: String(p.short || ''), memberIds: [], enabled: true, order: store.patrols.length + 1 });
      return S(ob);
    case 'togglePatrol': { const i = findIdx(store.patrols, 'id', String(p.patrolId || '')); if (i >= 0) store.patrols[i].enabled = !store.patrols[i].enabled; return S(ob); }
    case 'deletePatrol': store.patrols = store.patrols.filter(x => x.id !== p.patrolId); return S(ob);
    // 活動
    case 'createEvent': {
      const id = uid('e');
      const category = p.category === 'district' ? 'district' : 'self';
      const source = category === 'district'
        ? (String(p.source || '區地域總會活動'))
        : (String(p.source || '旅團活動'));
      store.events.push({
        id, title: String(p.title || ''), date: String(p.date || ''), location: String(p.location || ''),
        scope: (p.scope || 'troop') as any, branchId: String(p.branchId || ''),
        kind: category === 'district' ? 'notice_troop_participation' : 'activity',
        category, status: p.status || 'draft', source,
        targetMemberIds: [], fee: String(p.fee || ''), paymentUrl: String(p.paymentUrl || ''),
        dutyPatrol: String(p.dutyPatrol || ''), calendarTag: String(p.calendarTag || ''),
        noticeUrl: String(p.noticeUrl || ''), noticeFileName: String(p.noticeFileName || ''),
        albumUrl: albumAllowed(ob, String(p.albumUrl || '')),
        inputMode: (p.inputMode || 'form') as any,
      });
      logAudit(ob, 'createEvent', '活動', id, String(p.title || ''));
      return S(ob);
    }
    case 'updateEvent': {
      const i = findIdx(store.events, 'id', String(p.eventId || ''));
      if (i >= 0) {
        const patch = Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'eventId'].includes(k)));
        // 相簿功能未開通就唔准寫入 albumUrl（繞過 UI 都唔得）
        if ('albumUrl' in patch) patch.albumUrl = albumAllowed(ob, String(patch.albumUrl || ''));
        Object.assign(store.events[i], patch);
        if (p.category === 'district') store.events[i].kind = 'notice_troop_participation';
        if (p.category === 'self') store.events[i].kind = 'activity';
        logAudit(ob, 'updateEvent', '活動', String(p.eventId || ''), String(p.title || store.events[i].title || ''));
      }
      return S(ob);
    }
    case 'publishEvent': { const i = findIdx(store.events, 'id', String(p.eventId || '')); if (i >= 0) { store.events[i].status = 'published'; logAudit(ob, 'publishEvent', '活動', String(p.eventId || ''), store.events[i].title || ''); } return S(ob); }
    case 'deleteEvent': store.events = store.events.filter(e => e.id !== p.eventId); store.replies = store.replies.filter(r => r.eventId !== p.eventId); logAudit(ob, 'deleteEvent', '活動', String(p.eventId || ''), String(p.title || '')); return S(ob);
    /** 過期處理：旅團活動 → 封存成「過期通告」；區地域總會（外部）→ 直接刪除 */
    case 'archiveEvent': {
      const i = findIdx(store.events, 'id', String(p.eventId || ''));
      if (i >= 0) {
        const ev = store.events[i];
        const isDistrict = isDistrictEvent(ev);
        const replyCount = store.replies.filter(r => r.eventId === ev.id).length;
        if (isDistrict) {
          store.events = store.events.filter(e => e.id !== ev.id);
          store.replies = store.replies.filter(r => r.eventId !== ev.id);
          logAudit(ob, 'deleteExpiredEvent', '活動', ev.id, `${ev.title}（外部通告，過期直接刪除，連帶 ${replyCount} 筆回覆）`);
        } else {
          // ★ 只改狀態，報名／付款紀錄一律保留（家長／成員仍可查返自己嗰筆）
          ev.status = 'archived' as any;
          logAudit(ob, 'archiveEvent', '活動', ev.id, `${ev.title}（放入過期通告，保留 ${replyCount} 筆報名紀錄）`);
        }
      }
      return S(ob);
    }
    /** 重開報名：過期／已封存嘅活動重新開放（遲咗報但領袖想畀佢報） */
    case 'reopenEvent': {
      const i = findIdx(store.events, 'id', String(p.eventId || ''));
      if (i >= 0) {
        store.events[i].status = 'published';
        store.events[i].lateRegistration = true as any;
        logAudit(ob, 'reopenEvent', '活動', store.events[i].id, `${store.events[i].title}（重開報名／容許遲交）`);
      }
      return S(ob);
    }
    case 'restoreEvent': {
      const i = findIdx(store.events, 'id', String(p.eventId || ''));
      if (i >= 0) { store.events[i].status = 'published'; logAudit(ob, 'restoreEvent', '活動', store.events[i].id, store.events[i].title || ''); }
      return S(ob);
    }
    // 報名
    case 'setReply': {
      // 區地域總會活動＝純通告，旅團唔代收報名（想報自己去報）→ 唔接受回覆
      const tgtEv = store.events.find(e => e.id === p.eventId);
      if (tgtEv && isDistrictEvent(tgtEv)) {
        return { success: false, error: '區地域總會活動為通告性質，旅團不代收報名，請按通告連結自行報名。' };
      }
      // ★ 18 歲以下：參加／不參加必須由家長代做（同 GS handleSetReply_ 一致）
      //   前端個掣鎖咗，但後台一樣要擋，因為個 request 可以繞過 UI 直接發。
      if (p.type === 'registered' || p.type === 'declined') {
        const tgtMem = store.members.find(m => m.id === p.memberId);
        const age = Number(tgtMem?.age);
        if (tgtMem && Number.isFinite(age) && age < 18) {
          const op = store.users.find(u => u.id === String(p.operatedBy || ''));
          const opRole = String((op as any)?.role || '');
          const isParentOrLeader = opRole === 'parent' || opRole === 'admin' || opRole === 'super_admin'
            || opRole === 'group_leader' || opRole === 'branch_leader' || opRole === 'coach';
          if (!isParentOrLeader) {
            return { success: false, error: '18歲以下成員需由家長代為操作參加 / 不參加' };
          }
        }
      }
      const replyId = `${p.eventId}_${p.memberId}`;
      const m = store.members.find(x => x.id === p.memberId);
      const i = findIdx(store.replies, 'id', replyId);
      if (i >= 0) { store.replies[i].type = p.type as any; store.replies[i].operatedBy = (p.operatedByRole || 'member') as any; store.replies[i].parentUserId = String(p.parentUserId || store.replies[i].parentUserId || ''); store.replies[i].cancelled = false; store.replies[i].updatedAt = new Date().toISOString().slice(0, 10); }
      else store.replies.push({ id: replyId, eventId: String(p.eventId), memberId: String(p.memberId), memberName: m?.name || '', branchId: m?.branchId || '', parentUserId: String(p.parentUserId || ''), type: p.type as any, operatedBy: (p.operatedByRole || 'member') as any, paid: false, cancelled: false, updatedAt: new Date().toISOString().slice(0, 10) });
      return S(ob);
    }
    case 'cancelReply': { const i = findIdx(store.replies, 'id', `${p.eventId}_${p.memberId}`); if (i >= 0) store.replies[i].cancelled = !store.replies[i].cancelled; return S(ob); }
    case 'togglePaid': {
      const payEv = store.events.find(e => e.id === p.eventId);
      if (payEv && isDistrictEvent(payEv)) {
        return { success: false, error: '區地域總會活動不經旅團收費，無法標記付款。' };
      }
      const i = findIdx(store.replies, 'id', `${p.eventId}_${p.memberId}`);
      if (i >= 0) {
        store.replies[i].paid = !store.replies[i].paid;
        // 家長取消「已付款」→ 領袖核實同時失效
        if (!store.replies[i].paid) { store.replies[i].paymentConfirmed = false; store.replies[i].paymentConfirmedBy = ''; store.replies[i].paymentConfirmedAt = ''; }
      }
      return S(ob);
    }
    /** 領袖核實收款（家長端會睇到「領袖已確認收款」） */
    case 'confirmPayment': {
      const i = findIdx(store.replies, 'id', `${p.eventId}_${p.memberId}`);
      if (i >= 0) {
        const on = String(p.confirmed) !== 'false';
        store.replies[i].paymentConfirmed = on;
        store.replies[i].paymentConfirmedBy = on ? ob : '';
        store.replies[i].paymentConfirmedAt = on ? new Date().toISOString().slice(0, 10) : '';
        if (on) store.replies[i].paid = true;
        logAudit(ob, 'confirmPayment', '報名', String(p.eventId || ''), `${p.memberId} confirmed=${on}`);
      }
      return S(ob);
    }
    // 申請
    case 'decideApplication': {
      const i = findIdx(store.applications, 'id', String(p.applicationId || ''));
      if (i >= 0) {
        store.applications[i].status = p.status as any;
        store.applications[i].decidedAt = new Date().toISOString().slice(0, 10);
        logAudit(ob, 'decideApplication', '申請審核', String(p.applicationId || ''), `${store.applications[i].name} → ${p.status === 'approved' ? '批核' : '拒絕'}`);
      }
      return S(ob);
    }
    case 'applyJoin': {
      // ★ 保留角色守衛（同 GS handleApplyJoin_ 一致）：公開表單唔准存入 super_admin
      let applyRole = String(p.role || 'parent');
      if (isReservedRole(applyRole)) {
        logAudit('anonymous', 'SANITIZE:applyJoin', 'Security', '', `公開申請要求保留角色 ${applyRole}，已降級為 parent`);
        applyRole = 'parent';
      }
      store.applications.unshift({ id: uid('ap'), type: (p.type || 'parent') as any, name: String(p.name || ''), email: String(p.email || ''), role: applyRole as Role, branchId: String(p.branchId || ''), ymNumbers: String(p.ymNumbers || ''), status: 'pending', createdAt: new Date().toISOString().slice(0, 10) });
      return { success: true, message: '(演示) 申請已收到,管理員會在演示後台看到。' };
    }
    // 圖書館
    case 'importBookmark':
      store.bookmarks.push({ id: uid('bm'), title: String(p.title || ''), source: String(p.source || ''), mode: (p.mode || 'informational') as any, status: 'published', branchTags: String(p.branchTags || '全旅').split(','), audienceTags: String(p.audienceTags || '全旅').split(','), fee: String(p.fee || ''), paymentUrl: String(p.paymentUrl || ''), officialDeadline: String(p.officialDeadline || ''), internalDeadline: String(p.internalDeadline || ''), activityType: String(p.activityType || ''), targetText: String(p.note || '') });
      return S(ob);
    // 內部公告
    case 'addAnnouncement': {
      store.announcements.unshift({
        announcementId: uid('an'), title: String(p.title || ''), message: String(p.message || ''),
        scope: String(p.scope || 'troop'), branchId: String(p.branchId || ''), status: 'published',
        createdAt: new Date().toISOString().slice(0, 10),
      });
      logAudit(ob, 'addAnnouncement', '公告', '', String(p.title || ''));
      return S(ob);
    }
    case 'updateAnnouncement': {
      const i = findIdx(store.announcements, 'announcementId', String(p.announcementId || ''));
      if (i >= 0) Object.assign(store.announcements[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'announcementId'].includes(k))));
      return S(ob);
    }
    case 'deleteAnnouncement':
      store.announcements = store.announcements.filter(a => a.announcementId !== p.announcementId);
      logAudit(ob, 'deleteAnnouncement', '公告', String(p.announcementId || ''), '');
      return S(ob);
    // 最新消息（最多 3 條）
    case 'addLatestNews': {
      const text = String(p.text || '').trim();
      if (!text) return { success: false, error: '請填寫最新消息內容。', state: buildMockState(ob) };
      if (store.latestNews.length >= 3) return { success: false, error: '最新消息最多 3 條，請先刪除一條再新增。', state: buildMockState(ob) };
      const me = findUser(ob);
      store.latestNews.unshift({
        id: uid('news'), text,
        authorUserId: ob, authorName: me?.name || '',
        createdAt: new Date().toISOString().slice(0, 10),
      });
      logAudit(ob, 'addLatestNews', '最新消息', store.latestNews[0].id, text);
      return S(ob);
    }
    case 'deleteLatestNews':
      store.latestNews = store.latestNews.filter(n => n.id !== p.id);
      logAudit(ob, 'deleteLatestNews', '最新消息', String(p.id || ''), '');
      return S(ob);
    case 'updateBookmark': { const i = findIdx(store.bookmarks, 'id', String(p.bookmarkId || '')); if (i >= 0) Object.assign(store.bookmarks[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'bookmarkId'].includes(k)))); return S(ob); }
    case 'deleteBookmark': store.bookmarks = store.bookmarks.filter(b => b.id !== p.bookmarkId); return S(ob);
    // 集會
    case 'createRegularMeeting':
      store.regularMeetings.push({ id: uid('rm'), branchId: String(p.branchId || ''), title: String(p.title || ''), weekday: (parseInt(String(p.weekday), 10) || 6) as any, startTime: String(p.startTime || ''), endTime: String(p.endTime || ''), location: String(p.location || ''), enabled: true });
      return S(ob);
    case 'updateRegularMeeting': { const i = findIdx(store.regularMeetings, 'id', String(p.meetingId || '')); if (i >= 0) Object.assign(store.regularMeetings[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'meetingId'].includes(k)))); return S(ob); }
    case 'toggleRegularMeeting': { const i = findIdx(store.regularMeetings, 'id', String(p.meetingId || '')); if (i >= 0) store.regularMeetings[i].enabled = !store.regularMeetings[i].enabled; return S(ob); }
    case 'deleteRegularMeeting': store.regularMeetings = store.regularMeetings.filter(r => r.id !== p.meetingId); return S(ob);
    case 'toggleMeetingCancel': {
      const i = findIdx(store.cancelledMeetings, 'date', String(p.date || ''));
      if (i >= 0) store.cancelledMeetings.splice(i, 1);
      else store.cancelledMeetings.push({ id: uid('cm'), branchId: String(p.branchId || ''), date: String(p.date || ''), reason: String(p.reason || ''), markedBy: ob, markedAt: new Date().toISOString().slice(0, 10) });
      logAudit(ob, 'toggleMeetingCancel', '集會', `${p.branchId}/${p.date}`, String(p.reason || ''));
      return S(ob);
    }
    // 領袖會議
    case 'createMeeting':
      store.meetings.push({ id: uid('mt'), title: String(p.title || ''), type: (p.type || 'agenda') as any, date: String(p.date || ''), startTime: String(p.startTime || ''), endTime: String(p.endTime || ''), location: String(p.location || ''), status: 'draft', branchId: String(p.branchId || ''), calendarTag: String(p.calendarTag || '') });
      logAudit(ob, 'createMeeting', '會議', '', String(p.title || ''));
      return S(ob);
    case 'updateMeeting': { const i = findIdx(store.meetings, 'id', String(p.meetingId || '')); if (i >= 0) Object.assign(store.meetings[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'meetingId'].includes(k)))); return S(ob); }
    case 'deleteMeeting': store.meetings = store.meetings.filter(m => m.id !== p.meetingId); return S(ob);
    case 'publishMeeting': { const i = findIdx(store.meetings, 'id', String(p.meetingId || '')); if (i >= 0) store.meetings[i].status = 'published'; return S(ob); }
    // 設定
    case 'saveConfig': (store.config as any)[String(p.key || '')] = String(p.value ?? ''); logAudit(ob, 'saveConfig', '系統設定', String(p.key || ''), String(p.value ?? '')); return S(ob);
    case 'savePluginSetting': {
      const i = findIdx(store.pluginSettings, 'pluginId', String(p.pluginId || ''));
      if (i >= 0) Object.assign(store.pluginSettings[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'pluginId'].includes(k))));
      else store.pluginSettings.push(Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy'].includes(k))) as any);
      return S(ob);
    }
    case 'togglePluginStatus': { const i = findIdx(store.plugins, 'id', String(p.pluginId || '')); if (i >= 0) store.plugins[i].enabled = !store.plugins[i].enabled; return S(ob); }
    case 'toggleSystemLock': { (store.config as any).system_locked = (store.config as any).system_locked === 'true' ? '' : 'true'; return S(ob); }
    // 其他（不模擬副作用）
    case 'autoRepairParentLinks':
    case 'reseedAdmin':
    case 'fixParentChildLinks':
      return S(ob);
    default:
      return S(ob);
  }
}

// ==================== 統一入口 ====================

const READ_SLICES: Record<string, string> = {
  getBootstrap: 'users,config,userFeatures',
  getCalendar: 'regularMeetings,cancelledMeetings,events,meetings',
  getActivities: 'events,replies,users,members,bookmarks',
  getMembers: 'members,patrols,users',
  getEvents: 'events,replies,members,users',
  getNotices: 'bookmarks,announcements,announcementPdfs',
  getUsers: 'users,members',
  getSettings: 'config,plugins,pluginSettings',
  getAuditLogs: 'audits',
  getMeetings: 'meetings',
  getEquipment: 'equipment,equipmentLoans,members',
  getLatestNews: 'latestNews',
};

// ==================== 保留角色（防提權） ====================
//
// 同 GS 後端一致：super_admin 係系統內建嘅隱藏帳號，全系統只應該有一個，
// 唔可以經 API 指派／建立／申請。前端 assignableRoles() 唔會提供呢個選項，
// 但 request 可以自己砌，所以後端要再擋一次。MOCK 亦要跟，先至 mirror 到現實。
const RESERVED_ROLES = ['super_admin'];

function isReservedRole(role: unknown): boolean {
  return RESERVED_ROLES.includes(String(role ?? '').trim().toLowerCase());
}

// ★ 高過管理員嘅角色（同 GS ABOVE_ADMIN_ROLES_ 一致）：admin 或以下唔可以指派。
//   實測確認過漏洞：有「使用者管理」權限嘅 admin 可以自己砌 request，把別人升做
//   troop_super / troop_leader —— 即係造出比自己更高權限嘅帳號。
const ABOVE_ADMIN_ROLES = ['troop_super', 'troop_leader'];

function isAboveAdminRole(role: unknown): boolean {
  return ABOVE_ADMIN_ROLES.includes(String(role ?? '').trim().toLowerCase());
}

/** 由 request 抽出「準備指派嘅角色」—— 唔同 action 放喺唔同參數 */
function requestedRole(p: Record<string, any>): string {
  const r = p.role;
  if (r !== undefined && r !== null && String(r).trim() !== '') return String(r).trim().toLowerCase();
  // updateUserField 係萬用寫入：field='role' 時角色喺 value
  if (String(p.field || '').trim().toLowerCase() === 'role') return String(p.value || '').trim().toLowerCase();
  return '';
}

export function handleMockRequest(action: string, params: Record<string, any> = {}): any {
  const p = { ...params };
  const userId = String(p.userId || '');
  let isWrite = false;

  // ★ 保留角色守衛（同 GS checkActionPermission_ 同一位置：所有 action 之前）
  //   applyJoin 除外：公開表單由自己嘅 sanitizer 靜默降級，唔好對匿名訪客洩露內部角色名。
  if (action !== 'applyJoin' && isReservedRole(requestedRole(p))) {
    logAudit(String(p.operatedBy || p.userId || 'anonymous'), 'DENIED:' + action, 'Security', '', '試圖指派保留角色 super_admin');
    return { success: false, error: '「超級管理員」係系統內建帳號，不能經介面指派或建立。' };
  }

  // ★ 角色階梯守衛（同 GS checkActionPermission_ 一致）：admin 或以下唔可以指派
  //   高過自己嘅角色（troop_super / troop_leader），否則可以造出比自己更高權限嘅帳號。
  //   applyJoin 除外：公開表單由自己嘅 sanitizer 靜默降級。
  //   注意：admin → admin 刻意唔擋，管理員本来就可以開其他管理員帳號。
  {
    const wanted = requestedRole(p);
    if (action !== 'applyJoin' && wanted && isAboveAdminRole(wanted)) {
      const opId = String(p.operatedBy || p.userId || '');
      const opRole = String(store.users.find(u => u.id === opId)?.role || '').toLowerCase();
      if (opRole !== 'troop_super') {
        logAudit(opId || 'anonymous', 'DENIED:' + action, 'Security', '', `role=${opRole} 試圖指派高過自己嘅角色 ${wanted}`);
        return { success: false, error: '權限不足：只有超管可以指派「超管」或「旅長」。' };
      }
    }
  }

  if (action === 'health') return { success: true, version: MOCK_BACKEND_VERSION, action: 'health', ready: true };
  if (action === 'login') return handleMockLogin(p);
  if (action === 'getDashboard') return { success: true, state: buildMockState(userId) };
  if (READ_SLICES[action]) return { success: true, state: sliceState(buildMockState(userId), READ_SLICES[action]) };
  // ★ 未登入即訪客視圖（修正舊 client mock 預設 admin 的問題）
  if (action === 'getState') return { success: true, state: sliceState(buildMockState(userId), String(p.keys || 'users,config')) };
  if (action === 'getApplications') return { success: true, applications: buildMockState(userId).applications };
  if (action === 'getEventRegistrationSummary') return handleRegistrationSummary(p);
  if (action === 'getPublicBootstrap') return { success: true, data: { config: { TROOP_CODE: store.config.TROOP_CODE, TROOP_NAME: store.config.TROOP_NAME, REGISTRY_URL: store.config.REGISTRY_URL }, branches: modelBranches.map(b => ({ id: b.id, name: b.name })) } };
  if (action === 'getPublicCalendarItems') return { success: true, data: buildMockState('').regularMeetings };
  if (action === 'getPublicLibraryBookmarks') return { success: true, data: buildMockState('').bookmarks };
  if (action === 'listAnnouncementPdfs') return { success: true, files: store.announcementPdfs };
  if (action === 'getAnnouncements') return { success: true, data: store.announcements.map(a => ({ ...a })), count: store.announcements.length };
  if (action === 'updatePdfTags') { isWrite = true; return { success: true, state: buildMockState(String(p.operatedBy || '')) }; }
  if (action === 'getAttendance') return handleGetAttendance(p);
  if (action === 'saveAttendance') return handleSaveAttendance(p);
  if (action === 'getAttendanceMatrix') return handleGetMatrix(p);
  if (action === 'getAttendanceSessions') return handleGetSessions(p);
  if (action === 'getMemberAttendance') return handleMemberAttendance(p);
  if (action === 'forgotPassword') return { success: true, message: '(演示) 密碼重設信已寄出(模擬)。' };
  if (action === 'getSystemStatus') return { success: true, status: 'ok (mock)' };
  if (action === 'resetMock') {
    store = JSON.parse(JSON.stringify(seed));
    att = JSON.parse(JSON.stringify(mockAttendanceSeed));
    persist();
    return { success: true, message: '演示資料已重設。', state: buildMockState('') };
  }

  // ★ 寫入之前先驗身份（UI 隱藏唔等於安全）
  const denied = checkMockPermission(action, p);
  if (denied) return denied;

  // 其餘一律視為寫入
  isWrite = true;
  const result = handleMutate(action, p);
  if (isWrite) persist();
  return result;
}

// 匯出演示旅團常數供 proxy 使用
export const DEMO_TROOP = MOCK_TROOP;
