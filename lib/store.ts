'use client';
import { Role } from './model';

// ==================== 資料型態 ====================

export type Patrol = { id:string; branchId:string; name:string; short:string; leaderMemberId?:string; deputyLeaderMemberId?:string; memberIds?:string[]; enabled:boolean; order:number };
export type User = { id:string; name:string; email:string; role:Role; branchId?:string; memberId?:string; childMemberIds?:string[]; approved:boolean; techTest?:boolean };
export type Member = { id:string; ymNumber:string; name:string; email?:string; branchId:string; patrolId?:string; patrolRole?:''|'leader'|'deputy'|'member'; specialRole?:string; age:number; dateOfBirth?:string; parentUserId?:string; emergencyContactName?:string; emergencyContactPhone?:string; active:boolean };
export type Application = { id:string; type:'parent'|'leader'|'member'; name:string; email:string; role:Role; branchId?:string; ymNumbers?:string; status:'pending'|'approved'|'rejected'; createdAt:string; decidedAt?:string };
export type EventItem = { id:string; title:string; date:string; location:string; scope:'troop'|'branch'; branchId?:string; kind:'activity'|'notice_troop_participation'; status:'draft'|'published'; source?:string; targetMemberIds:string[]; fee?:string; paymentUrl?:string; dutyPatrol?:string };
export type Reply = { id:string; eventId:string; memberId:string; memberName?:string; branchId?:string; parentUserId?:string; type:'interested'|'registered'|'declined'; operatedBy:'member'|'parent'|'leader'|'admin'; paid?:boolean; cancelled?:boolean; updatedAt:string };
export type Bookmark = { id:string; title:string; source:string; circularKey?:string; region?:string; circularDate?:string; sourceUrl?:string; attachmentUrl?:string; paymentUrl?:string; officialDeadline?:string; internalDeadline?:string; mode:'informational'|'troop_participation'; activityType?:string; targetText?:string; eligibility?:string; fee?:string; branchTags:string[]; audienceTags?:string[]; status:'published'|'converted'; convertedEventId?:string; ownerUserId?:string; importedBy?:string };
export type AnnouncementPdf = { id:string; name:string; url:string; updatedAt?:string; size?:string; visible?:boolean; branchTags?:string[]; audienceTags?:string[]; note?:string };
export type RegularMeeting = { id:string; branchId:string; title:string; weekday:0|1|2|3|4|5|6; frequency?:string; startTime:string; endTime:string; location:string; enabled:boolean };
export type CancelledMeeting = { id:string; branchId:string; date:string; reason?:string; markedBy:string; markedAt:string };
export type Announcement = { id:string; title:string; source?:string; month?:string; publishDate?:string; branchTags:string[]; folderUrl?:string; documentUrl?:string; rawText?:string; createdAt:string; status:'published'|'archived' };
export type AttendanceRecord = { id:string; memberId:string; ymNumber:string; name:string; branchId:string; patrolId?:string; date:string; status:'P'|'A'|'L'|'E'|'S'|''; note?:string; sessionType:'meeting'|'activity'; eventId?:string; markedBy?:string; markedAt?:string };
export type PluginCard = { id:string; title:string; icon:string; tier:2|3; url:string; embed:boolean; minRole:Role; enabled:boolean; order:number; needsUnitBackend?:boolean };
export type PluginSetting = { pluginId:string; frontendUrl?:string; backendUrl?:string; apiKey?:string };
export type Meeting = { id:string; title:string; type:'agenda'|'minutes'; date:string; startTime?:string; endTime?:string; location?:string; targetRoles?:string[]; branchId?:string; url?:string; status:'draft'|'published' };
export type Audit = { id:string; userId:string; action:string; entity:string; entityId:string; createdAt:string; detail:string };
export type AppState = { patrols:Patrol[]; users:User[]; members:Member[]; applications:Application[]; events:EventItem[]; replies:Reply[]; bookmarks:Bookmark[]; announcements:Announcement[]; announcementPdfs:AnnouncementPdf[]; regularMeetings:RegularMeeting[]; cancelledMeetings:CancelledMeeting[]; meetings:Meeting[]; plugins:PluginCard[]; pluginSettings?:PluginSetting[]; audits:Audit[]; config:Record<string,string>; userFeatures?:string[] };

// ==================== 載入（API） ====================

import { fetchState } from './api';

/** 從 GS 後台讀取整個 AppState */
export async function loadState(): Promise<AppState> {
  return fetchState();
}

// ==================== 純查詢函式（不寫入，只讀 state） ====================

export function replyStatus(s:AppState, eventId:string, memberId:string){
  return s.replies.find(r=>r.eventId===eventId && r.memberId===memberId);
}

export function visibleEventsForMember(s:AppState, member:Member){
  return s.events.filter(e=>e.status==='published' && (e.scope==='troop' || e.branchId===member.branchId))
    .filter(e=>replyStatus(s,e.id,member.id)?.type!=='declined');
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
  return {
    users: s.users.length,
    pending: s.applications.filter(a=>a.status==='pending').length,
    activities: s.events.filter(e=>e.status==='published').length,
    notices: s.bookmarks.length,
  };
}
