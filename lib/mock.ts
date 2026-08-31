'use client';
/**
 * 全模擬 Demo 模式
 *
 * 用途:
 *  1. 開發者逐角色測試流程(不需真後台/真資料)
 *  2. 給旅團體驗 APP 功能(公開演示,純前端,不碰任何真實系統)
 *
 * 原理:api.ts 在 mock 模式下不發網路請求,改由本檔回傳模擬資料。
 * 資料存在記憶體(重新整理會重設),任何「寫入」只改 mock store,
 * 不會 touches 任何真實 Google Sheet / Vercel 環境。
 */
import type { AppState, Equipment } from './store';
import type { Role } from './model';
import { branches as modelBranches } from './model';

// ==================== 模式開關 ====================

const MOCK_KEY = 'scoutsystem2_mock_mode';

export const MOCK_TROOP = { key: 'troop_demo', id: '0088', name: '演示旅團(Mock)' };

export function isMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // MOCK 只屬於演示旅團。即使瀏覽器殘留了開關，只要目前選的是 0082，
    // API 仍然必須走真實旅團後台，避免把 82 誤當成 MOCK。
    const selected = JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null');
    return localStorage.getItem(MOCK_KEY) === '1' && selected?.key === MOCK_TROOP.key;
  } catch { return false; }
}
export function setMockMode(on: boolean) {
  if (typeof window === 'undefined') return;
  try { if (on) localStorage.setItem(MOCK_KEY, '1'); else localStorage.removeItem(MOCK_KEY); } catch {}
}

// ==================== 模擬資料(演示旅團 0088) ====================

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
    { id: 'm01', ymNumber: '3000000001', name: '陳大文', branchId: 'b3', patrolId: 'p12', patrolRole: 'leader', age: 16, dateOfBirth: '2010-06-12', parentUserId: 'u5', active: true },
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
  ],
  users: [
    { id: 'u_admin', name: '陳堅強', email: 'admin@demo.scout', role: 'admin', approved: true },
    { id: 'u_super', name: '超級管理員', email: 'sheep@demo.scout', role: 'super_admin', approved: true },
    { id: 'u_gl', name: '李偉國', email: 'gl@demo.scout', role: 'group_leader', approved: true },
    { id: 'u_bl', name: '黃志遠', email: 'bl@demo.scout', role: 'branch_leader', branchId: 'b3', approved: true },
    { id: 'u_coach', name: '何健', email: 'coach@demo.scout', role: 'coach', branchId: 'b3', approved: true },
    { id: 'u5', name: '王秀蘭', email: 'parent1@demo.scout', role: 'parent', childMemberIds: ['m01'], approved: true },
    { id: 'u9', name: '林國雄', email: 'parent2@demo.scout', role: 'parent', childMemberIds: ['m05', 'm10', 'm13'], approved: true },
    { id: 'u_m1', name: '陳大文', email: 'm01@demo.scout', role: 'member', branchId: 'b3', memberId: 'm01', approved: true },
    { id: 'u_m2', name: '王小名', email: 'm02@demo.scout', role: 'member', branchId: 'b3', memberId: 'm02', approved: true },
    { id: 'u_m4', name: '張磊磊', email: 'm04@demo.scout', role: 'member', branchId: 'b3', memberId: 'm04', approved: true },
    { id: 'u_m8', name: '周嘉欣', email: 'm08@demo.scout', role: 'member', branchId: 'b4', memberId: 'm08', approved: true },
  ],
  events: [
    { id: 'e00', title: '八月童軍技能日', date: '2026-08-16', location: '旅團部', scope: 'branch', branchId: 'b3', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m01', 'm02', 'm03', 'm04'], fee: '0' },
    { id: 'e01', title: '九月山徑健行', date: '2026-09-12', location: '大帽山', scope: 'branch', branchId: 'b3', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m01', 'm02', 'm03', 'm04'], fee: '50', paymentUrl: 'https://pay.example.com/e01' },
    { id: 'e02', title: '童軍週末營(兩日一夜)', date: '2026-10-03', location: '青年會營地', scope: 'troop', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m01', 'm02', 'm03', 'm04', 'm08', 'm09', 'm11', 'm12'], fee: '300', paymentUrl: 'https://pay.example.com/e02' },
    { id: 'e03', title: '十一區運動會', date: '2026-10-01', location: '東區公園', scope: 'branch', branchId: 'b2', kind: 'activity', status: 'published', source: '圖書館轉入', targetMemberIds: ['m05', 'm06', 'm07'], fee: '80' },
    { id: 'e04', title: '新領袖訓練班', date: '2026-11-08', location: '旅團會議室', scope: 'troop', kind: 'activity', status: 'draft', source: '手動新增', targetMemberIds: ['m04', 'm08', 'm09', 'm11', 'm12'] },
    { id: 'e05', title: '樂行社區服務日', date: '2026-09-20', location: '觀塘邨', scope: 'branch', branchId: 'b5', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m09', 'm12'], fee: '0' },
    { id: 'e06', title: '深資遠征(兩日一夜)', date: '2026-10-10', location: '西貢麥理浩徑', scope: 'branch', branchId: 'b4', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m08', 'm11'], fee: '250', paymentUrl: 'https://pay.example.com/e06' },
    { id: 'e07', title: '小童軍親子日', date: '2026-09-13', location: '本中心園地', scope: 'branch', branchId: 'b1', kind: 'activity', status: 'published', source: '手動新增', targetMemberIds: ['m10', 'm13'], fee: '0' },
  ],
  replies: [
    { id: 'e01_m01', eventId: 'e01', memberId: 'm01', memberName: '陳大文', branchId: 'b3', parentUserId: 'u5', type: 'registered', operatedBy: 'parent', paid: true, updatedAt: '2026-08-20' },
    { id: 'e01_m03', eventId: 'e01', memberId: 'm03', memberName: '李浩浩', branchId: 'b3', type: 'registered', operatedBy: 'parent', paid: false, updatedAt: '2026-08-21' },
    { id: 'e01_m04', eventId: 'e01', memberId: 'm04', memberName: '張磊磊', branchId: 'b3', type: 'declined', operatedBy: 'member', updatedAt: '2026-08-21' },
    { id: 'e01_m02', eventId: 'e01', memberId: 'm02', memberName: '王小名', branchId: 'b3', type: 'interested', operatedBy: 'member', updatedAt: '2026-08-22' },
    { id: 'e02_m01', eventId: 'e02', memberId: 'm01', memberName: '陳大文', branchId: 'b3', parentUserId: 'u5', type: 'registered', operatedBy: 'parent', paid: false, updatedAt: '2026-08-23' },
    { id: 'e02_m08', eventId: 'e02', memberId: 'm08', memberName: '周嘉欣', branchId: 'b4', type: 'interested', operatedBy: 'member', updatedAt: '2026-08-24' },
    { id: 'e03_m05', eventId: 'e03', memberId: 'm05', memberName: '林小雨', branchId: 'b2', parentUserId: 'u9', type: 'registered', operatedBy: 'parent', paid: true, updatedAt: '2026-08-25' },
    { id: 'e03_m06', eventId: 'e03', memberId: 'm06', memberName: '黃芷晴', branchId: 'b2', type: 'interested', operatedBy: 'parent', updatedAt: '2026-08-25' },
    { id: 'e06_m08', eventId: 'e06', memberId: 'm08', memberName: '周嘉欣', branchId: 'b4', type: 'registered', operatedBy: 'member', paid: false, updatedAt: '2026-08-26' },
    { id: 'e06_m11', eventId: 'e06', memberId: 'm11', memberName: '黃嘉怡', branchId: 'b4', type: 'interested', operatedBy: 'member', updatedAt: '2026-08-26' },
    { id: 'e07_m10', eventId: 'e07', memberId: 'm10', memberName: '鄭蓓蓓', branchId: 'b1', parentUserId: 'u9', type: 'registered', operatedBy: 'parent', updatedAt: '2026-08-27' },
    { id: 'e07_m13', eventId: 'e07', memberId: 'm13', memberName: '蔡可可', branchId: 'b1', parentUserId: 'u9', type: 'registered', operatedBy: 'parent', paid: true, updatedAt: '2026-08-27' },
  ],
  bookmarks: [
    { id: 'bm01', title: '第 118 周年童軍週', source: '香港童軍', mode: 'informational', branchTags: ['全旅'], audienceTags: ['全旅'], status: 'published', officialDeadline: '2026-09-01', targetText: '周年紀念活動,各旅自行報名。' },
    { id: 'bm02', title: '秋季跨旅遠足', source: '十一區', mode: 'troop_participation', branchTags: ['童軍', '幼童軍'], audienceTags: ['深齡以上'], status: 'published', fee: '120', paymentUrl: 'https://pay.example.com/bm02', officialDeadline: '2026-09-15', internalDeadline: '2026-09-10', activityType: '遠足' },
  ],
  announcements: [
    { id: 'an01', title: '九月總務通告', month: '2026-09', publishDate: '2026-08-28', branchTags: ['全旅'], status: 'published', createdAt: '2026-08-28' },
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
let mockAttendance: AttRec[] = [
  // 童軍（b3）恆常集會（星期六）—— 多星期，方便展示後補／期間統計
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
  // 童軍（b3）自辦活動：八月童軍技能日（已過期，供補改示範）
  { id: 'a20', memberId: 'm01', ymNumber: '3000000001', name: '陳大文', branchId: 'b3', patrolId: 'p12', date: '2026-08-16', status: 'P', sessionType: 'activity', eventId: 'e00', markedBy: 'u_bl', markedAt: '2026-08-16' },
  { id: 'a21', memberId: 'm02', ymNumber: '3000000002', name: '王小名', branchId: 'b3', patrolId: 'p11', date: '2026-08-16', status: 'P', sessionType: 'activity', eventId: 'e00', markedBy: 'u_bl', markedAt: '2026-08-16' },
  { id: 'a22', memberId: 'm03', ymNumber: '3000000003', name: '李浩浩', branchId: 'b3', patrolId: 'p10', date: '2026-08-16', status: 'E', sessionType: 'activity', eventId: 'e00', markedBy: 'u_bl', markedAt: '2026-08-16' },
  // 幼童軍（b2）恆常集會（星期六）
  { id: 'a30', memberId: 'm05', ymNumber: '3000000005', name: '林小雨', branchId: 'b2', patrolId: 'p1', date: '2026-08-29', status: 'P', sessionType: 'meeting', markedBy: 'u_gl', markedAt: '2026-08-29' },
  { id: 'a31', memberId: 'm06', ymNumber: '3000000006', name: '黃芷晴', branchId: 'b2', patrolId: 'p2', date: '2026-08-29', status: 'P', sessionType: 'meeting', markedBy: 'u_gl', markedAt: '2026-08-29' },
  { id: 'a32', memberId: 'm07', ymNumber: '3000000007', name: '劉琪琪', branchId: 'b2', patrolId: 'p3', date: '2026-08-29', status: 'A', sessionType: 'meeting', markedBy: 'u_gl', markedAt: '2026-08-29' },
];

let store: AppState = JSON.parse(JSON.stringify(seed));
let att: AttRec[] = JSON.parse(JSON.stringify(mockAttendance));
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

// ==================== 角色過濾(演示用,邏輯與真後台同向) ====================

// 與 GS 端 FEATURE_DEFAULTS 保持一致（漏了 equipment 會讓演示模式看不到物資借用管理卡）
const FEATURES: Record<string, string[]> = {
  super_admin: ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'users', 'permissions', 'settings', 'plugins', 'audit', 'calendar', 'equipment'],
  troop_super: ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'users', 'permissions', 'settings', 'plugins', 'audit', 'calendar', 'equipment'],
  admin: ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'users', 'permissions', 'settings', 'plugins', 'audit', 'calendar', 'equipment'],
  group_leader: ['members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'calendar', 'equipment'],
  branch_leader: ['members', 'applications', 'events', 'registrations', 'attendance', 'meetings', 'library_import', 'notices', 'calendar', 'equipment'],
  coach: ['events', 'registrations', 'attendance', 'library_import', 'notices'],
  parent: [],
  member: [],
};

// 個別授權（模擬 GS UserPermissions 表）：教練員何健獲授「全旅點名」，
// 展示「即使是教練員，只要有權限就可以為所有支部點名」。
const USER_FEATURE_OVERRIDES: Record<string, string[]> = {
  u_coach: ['attendance_all'],
};

function featuresFor(userId: string, role: string) {
  const base = FEATURES[role] || [];
  const extra = USER_FEATURE_OVERRIDES[userId] || [];
  return Array.from(new Set([...base, ...extra]));
}

function findUser(userId: string) {
  return store.users.find(u => u.id === userId) || null;
}

export function buildMockState(userId: string): AppState {
  const user = findUser(userId);
  const role: Role = (user?.role as Role) || 'guest';
  const branchId = user?.branchId || '';
  const admin = ['super_admin', 'troop_super', 'admin'].includes(role);
  const leaderAll = role === 'group_leader'; // 演示:團長看全旅
  const leaderBranch = role === 'branch_leader' || role === 'coach';
  const isMember = role === 'member';
  const isParent = role === 'parent';
  const guest = !user;

  const out: AppState = {
    patrols: [], users: [], members: [], applications: [],
    events: [], replies: [], bookmarks: [],
    announcements: [], announcementPdfs: [],
    regularMeetings: [], cancelledMeetings: [],
    meetings: [], plugins: [], pluginSettings: [],
    equipment: [], equipmentLoans: [],
    audits: [], config: { ...store.config }, userFeatures: featuresFor(userId, role),
  };

  const memberBranch = isMember ? (store.members.find(m => m.id === user!.memberId)?.branchId || '') : '';

  // 成員
  if (admin || leaderAll) out.members = [...store.members];
  else if (leaderBranch) out.members = store.members.filter(m => m.branchId === branchId);
  else if (isMember) out.members = store.members.filter(m => m.id === user!.memberId);
  else if (isParent) out.members = store.members.filter(m => (user!.childMemberIds || []).includes(m.id));

  // 物資（任何已登入角色都可看總覽）
  if (user) out.equipment = store.equipment;
  // 借用紀錄：管理／領袖看全部，成員／家長只看自己（或子女）
  if (admin || leaderAll) out.equipmentLoans = [...store.equipmentLoans];
  else if (leaderBranch) out.equipmentLoans = store.equipmentLoans.filter(l => !l.branchId || l.branchId === branchId || l.memberId === userId);
  else if (isMember) out.equipmentLoans = store.equipmentLoans.filter(l => l.memberId === userId || l.memberId === (user!.memberId || ''));
  else if (isParent) out.equipmentLoans = store.equipmentLoans.filter(l => (user!.childMemberIds || []).includes(l.memberId));

  // 使用者
  if (admin || leaderAll) out.users = [...store.users];
  else if (leaderBranch) out.users = store.users.filter(u => u.branchId === branchId || !u.branchId);
  else if (isMember || isParent) out.users = store.users.filter(u => u.id === user!.id);

  // 活動(公開角色只看 published;領袖以上看 draft)
  const visibleEvents = (e: typeof store.events[number]) =>
    guest ? e.status === 'published'
      : admin || leaderAll ? true
      : leaderBranch ? (e.scope === 'branch' ? e.branchId === branchId : e.status === 'published')
      : isMember ? e.status === 'published' && (e.scope === 'troop' || e.branchId === memberBranch)
      : isParent ? e.status === 'published' && (e.scope === 'troop' || (user!.childMemberIds || []).some(id => { const m = store.members.find(mm => mm.id === id); return m && m.branchId === e.branchId; }))
      : false;
  out.events = store.events.filter(visibleEvents);

  // 報名回覆
  const eventIds = new Set(out.events.map(e => e.id));
  if (admin || leaderAll) out.replies = store.replies.filter(r => eventIds.has(r.eventId));
  else if (leaderBranch) out.replies = store.replies.filter(r => eventIds.has(r.eventId) && (out.members.find(m => m.id === r.memberId) != null));
  else if (isMember) out.replies = store.replies.filter(r => r.memberId === user!.memberId || r.memberId === user!.id);
  else if (isParent) out.replies = store.replies.filter(r => (user!.childMemberIds || []).includes(r.memberId));

  // 分隊
  if (admin || leaderAll || leaderBranch) out.patrols = leaderBranch ? store.patrols.filter(p => p.branchId === branchId) : [...store.patrols];
  else if (isMember) out.patrols = [...store.patrols];

  // 申請
  if (admin || leaderAll) out.applications = [...store.applications];

  // 通告 / PDF
  if (admin || leaderAll) {
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
    out.regularMeetings = store.regularMeetings.filter(r => r.branchId === branchId);
    out.cancelledMeetings = store.cancelledMeetings.filter(c => c.branchId === branchId);
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

  // 審計(只有管理員層)
  if (['super_admin', 'troop_super', 'admin'].includes(role)) out.audits = [...store.audits];

  return out;
}

// ==================== 切片(與真後台 getState 相同:未請求欄位清空) ====================

function sliceState(full: AppState, keys: string): AppState {
  const keyList = String(keys || 'users,config').split(',').map(k => k.trim()).filter(Boolean);
  const out: AppState = {
    patrols: [], users: [], members: [], applications: [],
    events: [], replies: [], bookmarks: [],
    announcements: [], announcementPdfs: [],
    regularMeetings: [], cancelledMeetings: [],
    meetings: [], plugins: [], pluginSettings: [],
    equipment: [], equipmentLoans: [],
    audits: [], config: full.config || {}, userFeatures: full.userFeatures || [],
  };
  keyList.forEach(k => {
    const v = (full as any)[k];
    if (v !== undefined) (out as any)[k] = v;
  });
  return out;
}

// ==================== 登入 ====================

/** 演示帳號:一鍵登入用(login 頁) */
// 注意：超級管理員（系統製作者 debug 用）唔會喺任何演示／介面出現，所以呢度冇佢
export const DEMO_ACCOUNTS: { userId: string; label: string; desc: string; dashboard: string }[] = [
  { userId: 'u_m1', label: '🧒 成員(小童)', desc: '陳大文 16 歲 · 體驗報名需家長代操作', dashboard: '/member' },
  { userId: 'u_m4', label: '🧑 成員(成年)', desc: '張磊磊 18 歲 · 可自行報名', dashboard: '/member' },
  { userId: 'u5', label: '👩 家長', desc: '王秀蘭 · 代子女報名 / 查看', dashboard: '/parent' },
  { userId: 'u_bl', label: '🏹 支部領袖', desc: '黃志遠 · 本支部活動 / 成員 / 點名', dashboard: '/leader' },
  { userId: 'u_coach', label: '🧑‍🏫 教練員(獲授全旅點名)', desc: '何健 · 即使教練員，有權限亦可點全旅', dashboard: '/leader' },
  { userId: 'u_gl', label: '📋 團長', desc: '李偉國 · 全旅活動 / 集會 / 會議', dashboard: '/leader' },
  { userId: 'u_admin', label: '🛠️ 管理員', desc: '陳堅強 · 全部管理功能', dashboard: '/admin' },
];

function handleMockLogin(p: Record<string, any>) {
  const identifier = String(p.identifier || p.userId || '').trim();
  const loginType = String(p.loginType || 'account');

  // 按 email / userId 找(帳號登入)
  let u = store.users.find(x => x.email.toLowerCase() === identifier.toLowerCase() || x.id === identifier) || null;
  // 按 YMIS 找(成員登入)
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
  if (['super_admin', 'troop_super', 'admin', 'group_leader'].includes(role)) return { branchId: requestedBranch || user?.branchId || '' };
  if (['branch_leader', 'coach'].includes(role)) {
    if (featuresFor(user!.id, role).includes('attendance_all')) return { branchId: requestedBranch || user?.branchId || '' };
    return { branchId: user?.branchId || '' };
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

  // 場次欄（date|type|eventId），去重 + 排序（日期昇序，同日先集會後活動）
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

/** 後補／補改：列出可點名場次（過期／即將的恆常集會日 + 旅團自辦活動），由新至舊 */
function handleGetSessions(p: Record<string, any>) {
  const scope = attendanceBranchScope(p, String(p.branchId || ''));
  if (scope.error) return { success: false, error: scope.error };
  const branchId = scope.branchId;
  if (!branchId) return { success: false, error: '請選擇支部' };

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekdayOf = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };

  // 恆常集會日：按 RegularMeetings 每星期回推 120 日，扣除取消日，再併入已點名但非規律的日期
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

  // 旅團自辦活動（含已過期，供補改）
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

// ==================== 寫入(改 mock store,回整包 state) ====================

const S = (operatedBy: string) => ({ success: true, state: buildMockState(String(operatedBy || '')) });

function handleMutate(action: string, p: Record<string, any>) {
  const ob = String(p.operatedBy || '');
  const findIdx = (arr: any[], idField: string, id: string) => arr.findIndex(x => x[idField] === id);

  switch (action) {
    // 成員
    case 'createMember':
      store.members.push({ id: uid('m'), ymNumber: String(p.ymNumber || ''), name: String(p.name || ''), email: String(p.email || ''), branchId: String(p.branchId || ''), patrolId: String(p.patrolId || ''), age: 0, dateOfBirth: String(p.dateOfBirth || ''), parentUserId: String(p.parentUserId || ''), active: true });
      return S(ob);
    case 'updateMember': {
      const i = findIdx(store.members, 'id', String(p.memberId || ''));
      if (i >= 0) Object.assign(store.members[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'memberId'].includes(k))));
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
    case 'revokeFeature': return S(ob);
    case 'getUserFeatures': {
      const tu = findUser(String(p.targetUserId || ''));
      const role = tu?.role || 'member';
      const defaults = FEATURES[role] || [];
      const overrides: Record<string, boolean> = {};
      (USER_FEATURE_OVERRIDES[tu?.id || ''] || []).forEach(f => { overrides[f] = true; });
      const allFeatures = ['branches', 'members', 'applications', 'events', 'registrations', 'attendance', 'attendance_all', 'library_import', 'notices', 'users', 'settings', 'audit', 'calendar'];
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
      store.events.push({ id, title: String(p.title || ''), date: String(p.date || ''), location: String(p.location || ''), scope: (p.scope || 'troop') as any, branchId: String(p.branchId || ''), kind: 'activity', status: p.status || 'draft', source: '手動新增', targetMemberIds: [], fee: String(p.fee || ''), paymentUrl: String(p.paymentUrl || '') });
      return S(ob);
    }
    case 'updateEvent': {
      const i = findIdx(store.events, 'id', String(p.eventId || ''));
      if (i >= 0) Object.assign(store.events[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'eventId'].includes(k))));
      return S(ob);
    }
    case 'publishEvent': { const i = findIdx(store.events, 'id', String(p.eventId || '')); if (i >= 0) store.events[i].status = 'published'; return S(ob); }
    case 'deleteEvent': store.events = store.events.filter(e => e.id !== p.eventId); store.replies = store.replies.filter(r => r.eventId !== p.eventId); return S(ob);
    // 報名
    case 'setReply': {
      const replyId = `${p.eventId}_${p.memberId}`;
      const m = store.members.find(x => x.id === p.memberId);
      const i = findIdx(store.replies, 'id', replyId);
      if (i >= 0) { store.replies[i].type = p.type as any; store.replies[i].operatedBy = (p.operatedByRole || 'member') as any; store.replies[i].parentUserId = String(p.parentUserId || store.replies[i].parentUserId || ''); store.replies[i].cancelled = false; store.replies[i].updatedAt = new Date().toISOString().slice(0, 10); }
      else store.replies.push({ id: replyId, eventId: String(p.eventId), memberId: String(p.memberId), memberName: m?.name || '', branchId: m?.branchId || '', parentUserId: String(p.parentUserId || ''), type: p.type as any, operatedBy: (p.operatedByRole || 'member') as any, paid: false, cancelled: false, updatedAt: new Date().toISOString().slice(0, 10) });
      return S(ob);
    }
    case 'cancelReply': { const i = findIdx(store.replies, 'id', `${p.eventId}_${p.memberId}`); if (i >= 0) store.replies[i].cancelled = !store.replies[i].cancelled; return S(ob); }
    case 'togglePaid': { const i = findIdx(store.replies, 'id', `${p.eventId}_${p.memberId}`); if (i >= 0) store.replies[i].paid = !store.replies[i].paid; return S(ob); }
    // 申請
    case 'decideApplication': {
      const i = findIdx(store.applications, 'id', String(p.applicationId || ''));
      if (i >= 0) store.applications[i].status = p.status as any;
      return S(ob);
    }
    case 'applyJoin':
      store.applications.unshift({ id: uid('ap'), type: (p.type || 'parent') as any, name: String(p.name || ''), email: String(p.email || ''), role: (p.role || 'parent') as Role, branchId: String(p.branchId || ''), ymNumbers: String(p.ymNumbers || ''), status: 'pending', createdAt: new Date().toISOString().slice(0, 10) });
      return { success: true, message: '(演示) 申請已收到,管理員會在演示後台看到。' };
    // 圖書館
    case 'importBookmark':
      store.bookmarks.push({ id: uid('bm'), title: String(p.title || ''), source: String(p.source || ''), mode: (p.mode || 'informational') as any, status: 'published', branchTags: String(p.branchTags || '全旅').split(','), audienceTags: String(p.audienceTags || '全旅').split(','), fee: String(p.fee || ''), paymentUrl: String(p.paymentUrl || ''), officialDeadline: String(p.officialDeadline || ''), internalDeadline: String(p.internalDeadline || ''), activityType: String(p.activityType || ''), targetText: String(p.note || '') });
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
      return S(ob);
    }
    // 領袖會議
    case 'createMeeting':
      store.meetings.push({ id: uid('mt'), title: String(p.title || ''), type: (p.type || 'agenda') as any, date: String(p.date || ''), startTime: String(p.startTime || ''), endTime: String(p.endTime || ''), location: String(p.location || ''), status: 'draft', branchId: String(p.branchId || '') });
      return S(ob);
    case 'updateMeeting': { const i = findIdx(store.meetings, 'id', String(p.meetingId || '')); if (i >= 0) Object.assign(store.meetings[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'meetingId'].includes(k)))); return S(ob); }
    case 'deleteMeeting': store.meetings = store.meetings.filter(m => m.id !== p.meetingId); return S(ob);
    case 'publishMeeting': { const i = findIdx(store.meetings, 'id', String(p.meetingId || '')); if (i >= 0) store.meetings[i].status = 'published'; return S(ob); }
    // 設定
    case 'saveConfig': (store.config as any)[String(p.key || '')] = String(p.value ?? ''); return S(ob);
    case 'savePluginSetting': {
      const i = findIdx(store.pluginSettings, 'pluginId', String(p.pluginId || ''));
      if (i >= 0) Object.assign(store.pluginSettings[i], Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy', 'pluginId'].includes(k))));
      else store.pluginSettings.push(Object.fromEntries(Object.entries(p).filter(([k]) => !['action', 'operatedBy'].includes(k))) as any);
      return S(ob);
    }
    case 'togglePluginStatus': { const i = findIdx(store.plugins, 'id', String(p.pluginId || '')); if (i >= 0) store.plugins[i].enabled = !store.plugins[i].enabled; return S(ob); }
    case 'toggleSystemLock': { (store.config as any).system_locked = (store.config as any).system_locked === 'true' ? '' : 'true'; return S(ob); }
    // 其他(不模擬副作用)
    case 'autoRepairParentLinks':
    case 'reseedAdmin':
    case 'fixParentChildLinks':
      return S(ob);
    default:
      return S(ob);
  }
}

// ==================== 統一入口 ====================

export function mockHandle(action: string, params: Record<string, any> = {}): any {
  const p = { ...params };
  const userId = String(p.userId || '');
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
  };

  if (action === 'health') return { success: true, version: 'mock-3.0', action: 'health', ready: true };
  if (action === 'login') return handleMockLogin(p);
  if (action === 'getDashboard') return { success: true, state: buildMockState(userId) };
  if (READ_SLICES[action]) return { success: true, state: sliceState(buildMockState(userId), READ_SLICES[action]) };
  if (action === 'getState') return { success: true, state: sliceState(buildMockState(userId || 'u_admin'), String(p.keys || 'users,config')) };
  if (action === 'getApplications') return { success: true, applications: buildMockState(userId).applications };
  if (action === 'getEventRegistrationSummary') return handleRegistrationSummary(p);
  if (action === 'getPublicBootstrap') return { success: true, data: { config: { TROOP_CODE: store.config.TROOP_CODE, TROOP_NAME: store.config.TROOP_NAME, REGISTRY_URL: store.config.REGISTRY_URL }, branches: modelBranches.map(b => ({ id: b.id, name: b.name })) } };
  if (action === 'getPublicCalendarItems') return { success: true, data: buildMockState('').regularMeetings };
  if (action === 'getPublicLibraryBookmarks') return { success: true, data: buildMockState('').bookmarks };
  if (action === 'listAnnouncementPdfs') return { success: true, files: store.announcementPdfs };
  if (action === 'updatePdfTags') return { success: true };
  if (action === 'getAttendance') return handleGetAttendance(p);
  if (action === 'saveAttendance') return handleSaveAttendance(p);
  if (action === 'getAttendanceMatrix') return handleGetMatrix(p);
  if (action === 'getAttendanceSessions') return handleGetSessions(p);
  if (action === 'getMemberAttendance') return handleMemberAttendance(p);
  if (action === 'forgotPassword') return { success: true, message: '(演示) 密碼重設信已寄出(模擬)。' };
  if (action === 'getSystemStatus') return { success: true, status: 'ok (mock)' };

  // 其餘一律視為寫入
  return handleMutate(action, p);
}
