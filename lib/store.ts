'use client';
import { Role, branches as BRANCH_DEFS } from './model';

// ==================== 資料型態 ====================

export type Patrol = { id:string; branchId:string; name:string; short:string; leaderMemberId?:string; deputyLeaderMemberId?:string; memberIds?:string[]; enabled:boolean; order:number };
export type User = { id:string; name:string; email:string; role:Role; branchId?:string; memberId?:string; childMemberIds?:string[]; approved:boolean; techTest?:boolean };
export type Member = { id:string; ymNumber:string; name:string; email?:string; branchId:string; patrolId?:string; patrolRole?:''|'leader'|'deputy'|'member'; specialRole?:string; age:number; dateOfBirth?:string; parentUserId?:string; emergencyContactName?:string; emergencyContactPhone?:string; active:boolean; wantedBadges?:string; wantedBadgesAt?:string };
export type Application = { id:string; type:'parent'|'leader'|'member'; name:string; email:string; role:Role; branchId?:string; ymNumbers?:string; status:'pending'|'approved'|'rejected'; createdAt:string; decidedAt?:string };
export type EventItem = { id:string; title:string; date:string; location:string; scope:'troop'|'branch'; branchId?:string; kind:'activity'|'notice_troop_participation'; status:'draft'|'published'|'archived'; source?:string; targetMemberIds:string[]; fee?:string; paymentUrl?:string; dutyPatrol?:string; calendarTag?:string; category?:'self'|'district'; noticeUrl?:string; noticeFileName?:string; inputMode?:'form'|'upload'|'link'; lateRegistration?:boolean; albumUrl?:string };
export type Reply = { id:string; eventId:string; memberId:string; memberName?:string; branchId?:string; parentUserId?:string; type:'interested'|'registered'|'declined'; operatedBy:'member'|'parent'|'leader'|'admin'; paid?:boolean; paymentConfirmed?:boolean; paymentConfirmedBy?:string; paymentConfirmedAt?:string; cancelled?:boolean; updatedAt:string };
export type Bookmark = { id:string; title:string; source:string; circularKey?:string; region?:string; circularDate?:string; sourceUrl?:string; attachmentUrl?:string; paymentUrl?:string; officialDeadline?:string; internalDeadline?:string; mode:'informational'|'troop_participation'; activityType?:string; targetText?:string; eligibility?:string; fee?:string; branchTags:string[]; audienceTags?:string[]; status:'published'|'converted'; convertedEventId?:string; ownerUserId?:string; importedBy?:string };
export type AnnouncementPdf = { id:string; name:string; url:string; updatedAt?:string; size?:string; visible?:boolean; branchTags?:string[]; audienceTags?:string[]; note?:string };
export type RegularMeeting = { id:string; branchId:string; title:string; weekday:0|1|2|3|4|5|6; frequency?:string; startTime:string; endTime:string; location:string; enabled:boolean };
export type CancelledMeeting = { id:string; branchId:string; date:string; reason?:string; markedBy:string; markedAt:string };
export type Announcement = {
  id?: string;
  announcementId?: string;
  title: string;
  message?: string;
  scope?: string;
  branchId?: string;
  senderId?: string;
  senderName?: string;
  source?: string;
  month?: string;
  publishDate?: string;
  branchTags?: string[];
  folderUrl?: string;
  documentUrl?: string;
  rawText?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'published' | 'archived' | 'active' | string;
};
export type AttendanceRecord = { id:string; memberId:string; ymNumber:string; name:string; branchId:string; patrolId?:string; date:string; status:'P'|'A'|'L'|'E'|'S'|''; note?:string; sessionType:'meeting'|'activity'; eventId?:string; markedBy?:string; markedAt?:string };
export type PluginCard = { id:string; title:string; icon:string; tier:2|3; url:string; embed:boolean; minRole:Role; enabled:boolean; order:number; needsUnitBackend?:boolean };
export type PluginSetting = { pluginId:string; frontendUrl?:string; backendUrl?:string; apiKey?:string };
export type Meeting = { id:string; title:string; type:'agenda'|'minutes'; date:string; startTime?:string; endTime?:string; location?:string; targetRoles?:string[]; branchId?:string; url?:string; status:'draft'|'published'; calendarTag?:string };
export type Audit = { id:string; userId:string; action:string; entity:string; entityId:string; createdAt:string; detail:string };
/** 最新消息（首頁最上方 BAR，領袖直接點條 BAR 加入，最多 3 條，不同於公告） */
export type LatestNews = { id:string; text:string; authorUserId?:string; authorName?:string; createdAt:string };
export type Equipment = { id:string; name:string; category:string; unit:string; totalQty:number; availableQty:number; location?:string; note?:string; enabled:boolean; updatedAt?:string };
export type EquipmentLoanStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'cancelled';
export type EquipmentLoan = {
  id:string; batchRef:string; equipmentId:string; equipmentName:string; unit:string; qty:number;
  memberId:string; memberName:string; branchId:string; purpose:string;
  borrowDate:string; returnDueDate:string; status:EquipmentLoanStatus;
  requestedAt?:string; decidedBy?:string; decidedAt?:string; decisionNote?:string;
  returnedAt?:string; returnedBy?:string; note?:string;
};
/** 可借用物資的成員支部（童軍支部及以上）；領袖角色一律可借 */
export const EQUIPMENT_BORROW_BRANCHES = ['b3', 'b4', 'b5'];
export const LOAN_STATUS_LABEL: Record<EquipmentLoanStatus, string> = {
  pending: '待批核', approved: '已批核（未歸還）', rejected: '已拒絕', returned: '已歸還', cancelled: '已取消',
};
export const LOAN_STATUS_TONE: Record<EquipmentLoanStatus, string> = {
  pending: 'gold', approved: 'blue', rejected: 'red', returned: 'green', cancelled: 'red',
};
export type AppState = { patrols:Patrol[]; users:User[]; members:Member[]; applications:Application[]; events:EventItem[]; replies:Reply[]; bookmarks:Bookmark[]; announcements:Announcement[]; announcementPdfs:AnnouncementPdf[]; regularMeetings:RegularMeeting[]; cancelledMeetings:CancelledMeeting[]; meetings:Meeting[]; plugins:PluginCard[]; pluginSettings?:PluginSetting[]; audits:Audit[]; equipment:Equipment[]; equipmentLoans:EquipmentLoan[]; latestNews:LatestNews[]; config:Record<string,string>; userFeatures?:string[] };

// ==================== 活動兩大分類（統一命名） ====================

/** 活動分類：旅團活動（旅團自己舉辦）／區地域總會活動（外部引入） */
export type EventCategory = 'self' | 'district';
export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  self: '旅團活動',
  district: '區地域總會活動',
};
/** 活動分類 icon（全 APP 統一） */
export const EVENT_CATEGORY_ICON: Record<EventCategory, string> = {
  self: '🏠',
  district: '🗺️',
};

/**
 * 判斷活動屬於「旅團活動」還是「區地域總會活動」。
 * 新資料直接讀 category 欄位；舊資料按 kind / source 推斷。
 */
export function eventCategory(e: { kind?: string; source?: string; category?: string } | null | undefined): EventCategory {
  if (!e) return 'self';
  if (e.category === 'district' || e.category === 'self') return e.category;
  if (e.kind === 'notice_troop_participation') return 'district';
  if (/圖書館|地域|區會|區地域|總會/.test(e.source || '')) return 'district';
  return 'self';
}
export function eventCategoryLabel(e: { kind?: string; source?: string; category?: string } | null | undefined): string {
  return EVENT_CATEGORY_LABEL[eventCategory(e)];
}

// ==================== 載入（API） ====================

import { fetchState, apiGetSlice } from './api';
import { getSession } from './session';

/** 從 GS 後台讀取整個 AppState（寫入操作後重新整理用） */
export async function loadState(): Promise<AppState> {
  return fetchState();
}

/**
 * 按需載入：只讀取頁面需要的欄位（3.0 API 拆分）
 *
 * 用法：
 *   loadStateSlice(['events', 'replies'])                    // 活動頁
 *   loadStateSlice(['regularMeetings','cancelledMeetings','events','meetings']) // 行事曆
 *
 * 回傳的 AppState 只含所請求的欄位（未請求的欄位為空值），
 * 頁面只應存取自己請求過的欄位。角色過濾邏輯與 loadState 相同。
 */
export async function loadStateSlice(keys: string[]): Promise<AppState> {
  const session = getSession();
  const data = await apiGetSlice(keys, { userId: session?.userId || '' });
  if (!data.success || !data.state) throw new Error(data.error || '載入資料失敗');
  return data.state;
}

// ==================== 純查詢函式（不寫入，只讀 state） ====================

export function replyStatus(s:AppState, eventId:string, memberId:string){
  return s.replies.find(r=>r.eventId===eventId && r.memberId===memberId);
}

export function visibleEventsForMember(s:AppState, member:Member){
  return s.events.filter(e=>{
    const mine = !!replyStatus(s, e.id, member.id);
    const inScope = e.scope==='troop' || e.branchId===member.branchId;
    // 已封存（過期通告）：只有自己報過名先睇到，方便查返紀錄
    if (e.status==='archived') return mine;
    if (e.status!=='published') return false;
    return inScope || mine;
  });
  // 註：以前會隱藏「已婉拒」嘅活動，但咁樣改錯咗就搵唔返，
  //     所以改為照樣顯示（狀態會寫住 ❌ 已婉拒），可以隨時改回覆。
}

export function isMeetingCancelled(s:AppState, branchId:string, date:string){
  return !!s.cancelledMeetings.find(c=>c.branchId===branchId && c.date===date);
}

export function nextRegularMeetingDates(count=6){
  const today=new Date(); const out:string[]=[];
  for(let i=0;i<90 && out.length<count;i++){
    const d=new Date(today); d.setDate(today.getDate()+i);
    out.push(d.toISOString().slice(0,10));
  }
  return out;
}

/** 計算摘要數字（控制台用） */
export function computeStats(s:AppState){
  // 切片載入時未請求嘅欄位可能係 undefined，全部做防禦（唔好因為一個統計數字炸咗成頁）
  const published = (s.events||[]).filter(e=>e.status==='published');
  const archived = (s.events||[]).filter(e=>e.status==='archived');
  return {
    users: (s.users||[]).length,
    pending: (s.applications||[]).filter(a=>a.status==='pending').length,
    activities: published.length,
    selfActivities: published.filter(e=>eventCategory(e)==='self').length,
    districtActivities: published.filter(e=>eventCategory(e)==='district').length,
    archivedActivities: archived.length,
    notices: (s.bookmarks||[]).length,
  };
}

// ==================== 家長／成員上方統計 ====================

/** 有冇需要俾錢（"免費"／"0"／空白 = 唔使俾） */
export function eventNeedsPayment(e: { fee?: string }): boolean {
  const fee = String(e.fee || '').trim();
  if (!fee) return false;
  if (/^(免費|free|0|\$0|-)$/i.test(fee)) return false;
  return true;
}

export type PersonActivityStats = {
  /** 進行中（已發布、未封存）的旅團活動數 */
  ongoing: number;
  /** 已報名參加（人次；家長會合計所有子女） */
  registered: number;
  /** 只表達咗「有興趣」，未算報名 */
  interested: number;
  /** 已婉拒 */
  declined: number;
  /** 尚未回覆 */
  unresponded: number;
  /** 已報名但仍未標記付款（只計有費用的活動） */
  unpaid: number;
  /** 外部：區／地域／總會活動（自行報名，不計狀態） */
  district: number;
};

/**
 * 家長／成員控制台上方統計。
 *
 * 「進行中活動」以活動計（家長有兩名子女報同一個活動只算一個活動），
 * 「報名／未回覆／未付款」以人次計（家長要知道係邊個仔女未搞掂）。
 */
export function personActivityStats(s: AppState, members: Member[]): PersonActivityStats {
  const troopEventIds = new Set<string>();
  const districtEventIds = new Set<string>();
  let registered = 0, interested = 0, declined = 0, unresponded = 0, unpaid = 0;

  for (const m of members) {
    for (const e of visibleEventsForMember(s, m)) {
      if (e.status === 'archived') continue;           // 過期通告唔算「進行中」
      if (eventCategory(e) === 'district') { districtEventIds.add(e.id); continue; }
      troopEventIds.add(e.id);
      const r = replyStatus(s, e.id, m.id);
      if (!r || r.cancelled) { unresponded++; continue; }
      if (r.type === 'registered') {
        registered++;
        if (eventNeedsPayment(e) && !r.paid) unpaid++;
      } else if (r.type === 'interested') interested++;
      else if (r.type === 'declined') declined++;
    }
  }

  return {
    ongoing: troopEventIds.size,
    registered, interested, declined, unresponded, unpaid,
    district: districtEventIds.size,
  };
}

// ==================== 緊急聯絡資料 ====================

export type EmergencyContact = {
  name: string;
  phone: string;
  email: string;
  /** 資料來源：連結咗家長帳戶就直接用家長資料 */
  source: 'parent' | 'manual' | 'none';
  parentName?: string;
};

/**
 * 成員的緊急聯絡資料。
 *
 * ★ 規則：成員一旦連結咗家長帳戶（Members.parentUserId 或 Users.childMemberIds），
 *   緊急聯絡人就直接係嗰位家長 —— 唔使領袖再手動抄一次，亦唔會出現
 *   「家長改咗電話，但成員嗰邊仲係舊資料」。冇連結先用手動填嘅欄位。
 */
export function emergencyContactFor(s: AppState, member: Member): EmergencyContact {
  const parent = (s.users || []).find(u =>
    u.role === 'parent' && (u.id === member.parentUserId || (u.childMemberIds || []).includes(member.id))
  );
  if (parent) {
    return {
      name: parent.name,
      // 家長帳戶本身冇獨立電話欄，沿用成員資料上登記的聯絡電話
      phone: member.emergencyContactPhone || '',
      email: parent.email || '',
      source: 'parent',
      parentName: parent.name,
    };
  }
  if (member.emergencyContactName || member.emergencyContactPhone) {
    return {
      name: member.emergencyContactName || '',
      phone: member.emergencyContactPhone || '',
      email: '',
      source: 'manual',
    };
  }
  return { name: '', phone: '', email: '', source: 'none' };
}


// ==================== 支部人數統計（使用者管理用） ====================

export type BranchPeopleStat = {
  branchId: string;
  branchName: string;
  leaders: number;
  parents: number;
  members: number;
  total: number;
};

const LEADER_ROLE_SET = ['group_leader', 'branch_leader', 'coach'];

/**
 * 各支部「領袖／家長／成員」人數。
 * 非管理員（一般領袖）只會取得自己支部的一格；管理員／超管取得全部支部。
 */
export function branchPeopleStats(
  s: AppState,
  opts: { role?: string; branchId?: string } = {}
): BranchPeopleStat[] {
  const seeAll = ['super_admin', 'troop_super', 'troop_leader', 'admin'].includes(String(opts.role || ''));
  const scope = seeAll ? BRANCH_DEFS : BRANCH_DEFS.filter(b => b.id === opts.branchId);
  return scope.map(b => {
    const leaders = (s.users || []).filter(u => LEADER_ROLE_SET.includes(u.role) && u.branchId === b.id).length;
    const members = (s.members || []).filter(m => m.branchId === b.id && m.active !== false).length;
    // 家長歸入其子女所屬支部（一位家長在多個支部只算一次／支部）
    const parents = (s.users || []).filter(u => {
      if (u.role !== 'parent') return false;
      const childIds = u.childMemberIds || [];
      return (s.members || []).some(m => m.branchId === b.id && (childIds.includes(m.id) || m.parentUserId === u.id));
    }).length;
    return { branchId: b.id, branchName: b.name, leaders, parents, members, total: leaders + parents + members };
  });
}
