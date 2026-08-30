'use client';
import { AppState } from './store';
import { Role } from './model';
import { getSession } from './session';

// ==================== 取得旅團資訊 ====================

function getTroopKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const troop = JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null');
    return troop?.key || '';
  } catch { return ''; }
}

// ==================== 通用 fetch（經 proxy） ====================

function buildUrl(action: string, params?: Record<string, string | undefined>): string {
  const troopKey = getTroopKey();
  const url = new URL('/api/proxy', window.location.origin);
  url.searchParams.set('action', action);
  url.searchParams.set('troopKey', troopKey || 'unknown');
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function apiGet<T = any>(action: string, params?: Record<string, string | undefined>): Promise<T> {
  const res = await fetch(buildUrl(action, params), { cache: 'no-store' });
  const data = await res.json();
  if (!data.success && data.error) {
    throw new Error(data.error);
  }
  return data;
}

async function apiPost<T = any>(action: string, body: Record<string, any>): Promise<T> {
  const troopKey = getTroopKey();
  const url = new URL('/api/proxy', window.location.origin);
  url.searchParams.set('action', action);
  url.searchParams.set('troopKey', troopKey || 'unknown');
  const res = await fetch(url.toString(), {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, action }),
  });
  const data = await res.json();
  if (!data.success && data.error) {
    throw new Error(data.error);
  }
  return data;
}

function currentUser(): { userId: string; role: Role } | null {
  const s = getSession();
  if (!s) return null;
  return { userId: s.userId, role: s.role };
}

// ==================== 核心 API ====================

/** 讀取 Dashboard（按角色過濾） */
export async function fetchState(): Promise<AppState> {
  const user = currentUser();
  const data = await apiGet<{ success: boolean; state?: AppState; error?: string }>('getDashboard', {
    userId: user?.userId || ''
  });
  if (!data.success || !data.state) throw new Error(data.error || 'getDashboard 失敗');
  return data.state;
}

/** 登入 */
export async function apiLogin(params: {
  identifier: string; password: string; loginType: 'account' | 'member' | 'staffToken';
}) {
  return apiGet('login', {
    identifier: params.identifier,
    password: params.password,
    loginType: params.loginType,
  });
}

/** 忘記密碼 */
export async function apiForgotPassword(params: {
  identifier: string; loginType: 'account' | 'member';
}) {
  const res = await fetch(buildUrl('forgotPassword', params as any), { cache: 'no-store' });
  return res.json();
}

/** 更改密碼 */
export async function apiUpdatePassword(newPassword: string) {
  return apiMutate('updatePassword', { newPassword });
}

/** 測試後台連線 */
export async function apiHealth() {
  return apiGet('health');
}

// ==================== 寫入：通用 mutate ====================

async function withSubmissionLock<T>(action: string, runner: () => Promise<T>): Promise<T> {
  // Prevent double submissions globally
  if (typeof window !== 'undefined' && (window as any)._scout_submitting) {
    throw new Error('請稍候，正在處理上一筆請求...');
  }
  if (typeof window !== 'undefined') {
    (window as any)._scout_submitting = true;
    window.dispatchEvent(new CustomEvent('scout:loading-start', { detail: { action } }));
  }

  try {
    return await runner();
  } finally {
    if (typeof window !== 'undefined') {
      (window as any)._scout_submitting = false;
      window.dispatchEvent(new CustomEvent('scout:loading-end'));
    }
  }
}

async function apiMutate(action: string, params: Record<string, string | undefined>): Promise<AppState> {
  return withSubmissionLock(action, async () => {
    const user = currentUser();
    const full = { ...params, operatedBy: user?.userId || params.operatedBy || 'system' };
    const data = await apiGet<{ success: boolean; state?: AppState; error?: string }>(action, full);
    if (!data.success || !data.state) throw new Error(data.error || action + ' 失敗');
    return data.state;
  });
}

async function apiMutatePost(action: string, body: Record<string, any>): Promise<AppState> {
  return withSubmissionLock(action, async () => {
    const user = currentUser();
    const full = { ...body, operatedBy: user?.userId || body.operatedBy || 'system' };
    const data = await apiPost<{ success: boolean; state?: AppState; error?: string }>(action, full);
    if (!data.success || !data.state) throw new Error(data.error || action + ' 失敗');
    return data.state;
  });
}

// ==================== 公開 API（不需登入） ====================

export async function apiApplyJoin(p: { type: string; name: string; email: string; role: string; branchId?: string; ymNumbers?: string; note?: string }) {
  const res = await fetch(buildUrl('applyJoin', p as any), { cache: 'no-store' });
  return res.json();
}

// ==================== 成員 ====================

export function apiCreateMember(p: { name: string; ymNumber: string; branchId: string; patrolId?: string; specialRole?: string; dateOfBirth?: string; parentUserId?: string; emergencyContactName?: string; emergencyContactPhone?: string; password?: string }) {
  return apiMutate('createMember', p as any);
}
export function apiLinkParent(memberId: string, parentUserId: string) {
  return apiMutate('linkParent', { memberId, parentUserId });
}
export function apiDeleteMember(memberId: string) {
  return apiMutate('deleteMember', { memberId });
}
export function apiUpdateMember(p: Record<string, string>) {
  return apiMutate('updateMember', p);
}

// ==================== 活動 / 報名 ====================

export function apiCreateEvent(p: { title: string; scope?: string; branchId?: string; date?: string; location?: string; kind?: string; status?: string; source?: string; fee?: string; paymentUrl?: string; dutyPatrol?: string; targetMemberIds?: string }) {
  return apiMutate('createEvent', p as any);
}
export function apiPublishEvent(eventId: string) {
  return apiMutate('publishEvent', { eventId });
}
export function apiUpdateEvent(p: { eventId: string; title?: string; date?: string; location?: string; scope?: string; branchId?: string; fee?: string; paymentUrl?: string; dutyPatrol?: string; status?: string }) {
  return apiMutate('updateEvent', p as any);
}
export function apiDeleteEvent(eventId: string) {
  return apiMutate('deleteEvent', { eventId });
}
export function apiSetReply(p: { eventId: string; memberId: string; type: string; parentUserId?: string }) {
  const user = currentUser();
  const operatedBy = user?.role === 'parent' ? 'parent' : user?.role === 'member' ? 'member' : 'leader';
  return apiMutate('setReply', { ...p, operatedBy });
}
export function apiTogglePaid(eventId: string, memberId: string) {
  return apiMutate('togglePaid', { eventId, memberId });
}
export function apiCancelReply(eventId: string, memberId: string) {
  return apiMutate('cancelReply', { eventId, memberId });
}
export async function apiGetRegistrationSummary(eventId: string) {
  return apiGet('getEventRegistrationSummary', { eventId });
}

// ==================== 申請 ====================

export function apiDecideApplication(applicationId: string, status: 'approved' | 'rejected') {
  return apiMutate('decideApplication', { applicationId, status });
}

// ==================== 使用者 ====================

export function apiToggleUser(userId: string) {
  return apiMutate('toggleUser', { userId });
}
export function apiCreateUser(p: { name: string; email: string; password?: string; role: string; branchId?: string }) {
  return apiMutate('createUser', p as any);
}
export function apiBatchCreateUsers(rows: Array<{ name: string; email: string; password?: string; role: string; branchId?: string; memberId?: string; approved?: boolean }>) {
  return apiMutatePost('batchCreateUsers', { rows });
}
export function apiBatchCreateMembers(rows: Array<{ name: string; ymNumber: string; password?: string; email?: string; branchId: string; patrolId?: string; patrolRole?: string; specialRole?: string; dateOfBirth?: string; parentUserId?: string; emergencyContactName?: string; emergencyContactPhone?: string; note?: string }>) {
  return apiMutatePost('batchCreateMembers', { rows });
}
export function apiUpdateUserRole(userId: string, role: string) {
  return apiMutate('updateUserRole', { userId, role });
}
export function apiDeleteUser(userId: string) {
  return apiMutate('deleteUser', { userId });
}
export function apiUpdateUserField(userId: string, field: string, value: string) {
  return apiMutate('updateUserField', { userId, field, value });
}
export function apiGrantFeature(targetUserId: string, feature: string, granted: boolean) {
  return apiMutate('grantFeature', { targetUserId, feature, granted: String(granted) });
}
export function apiRevokeFeature(targetUserId: string, feature: string) {
  return apiMutate('revokeFeature', { targetUserId, feature });
}
export async function apiGetUserFeatures(targetUserId: string) {
  return apiGet('getUserFeatures', { targetUserId });
}

// ==================== 小隊 ====================

export function apiCreatePatrol(p: { branchId: string; name: string; short?: string }) {
  return apiMutate('createPatrol', p as any);
}
export function apiTogglePatrol(patrolId: string) {
  return apiMutate('togglePatrol', { patrolId });
}
export function apiDeletePatrol(patrolId: string) {
  return apiMutate('deletePatrol', { patrolId });
}

// ==================== 圖書館標記 ====================

export function apiImportBookmark(p: { title: string; mode: string; source?: string; officialDeadline?: string; internalDeadline?: string; branchTags?: string; audienceTags?: string; fee?: string; paymentUrl?: string; eligibility?: string; activityType?: string; note?: string; date?: string }) {
  return apiMutate('importBookmark', p as any);
}

export function apiDeleteBookmark(bookmarkId: string) {
  return apiMutate('deleteBookmark', { bookmarkId });
}
export function apiUpdateBookmark(p: { bookmarkId: string; title?: string; source?: string; officialDeadline?: string; internalDeadline?: string; branchTags?: string; audienceTags?: string; fee?: string; paymentUrl?: string; eligibility?: string; activityType?: string; mode?: string; note?: string; targetText?: string; status?: string }) {
  return apiMutate('updateBookmark', p as any);
}

// ==================== 集會 / 行事曆 ====================

export function apiToggleRegularMeeting(meetingId: string) {
  return apiMutate('toggleRegularMeeting', { meetingId });
}
export function apiCreateRegularMeeting(p: { branchId: string; title: string; weekday: string; frequency?: string; startTime: string; endTime: string; location: string }) {
  return apiMutate('createRegularMeeting', p as any);
}
export function apiToggleMeetingCancel(branchId: string, date: string, reason?: string, type?: string) {
  return apiMutate('toggleMeetingCancel', { branchId, date, reason, type });
}

export function apiUpdateRegularMeeting(p: any) {
  return apiMutate('updateRegularMeeting', p);
}

export function apiDeleteRegularMeeting(meetingId: string) {
  return apiMutate('deleteRegularMeeting', { meetingId });
}
// ==================== 設定 ====================

export function apiSaveConfig(key: string, value: string) {
  return apiMutate('saveConfig', { key, value });
}

export function apiSavePluginSetting(p: { pluginId: string; title?: string; icon?: string; tier?: number; frontendUrl?: string; backendUrl?: string; apiKey?: string; note?: string }) {
  return apiMutate('savePluginSetting', p as any);
}
export function apiTogglePluginStatus(pluginId: string) {
  return apiMutate('togglePluginStatus', { pluginId });
}

// ==================== Meetings ====================

export function apiCreateMeeting(p: { title: string; type: 'agenda' | 'minutes'; date: string; startTime?: string; endTime?: string; location?: string; targetRoles?: string; branchId?: string; url?: string }) {
  return apiMutate('createMeeting', p as any);
}
export function apiUpdateMeeting(p: any) {
  return apiMutate('updateMeeting', p);
}
export function apiDeleteMeeting(meetingId: string) {
  return apiMutate('deleteMeeting', { meetingId });
}
export function apiPublishMeeting(meetingId: string) {
  return apiMutate('publishMeeting', { meetingId });
}
export function apiUpdateUserPermissions(targetUserId: string, features: string[]) {
  return apiMutate('updateUserPermissions', { targetUserId, features: features.join(',') });
}

// ==================== Drive ====================

export async function apiListAnnouncementPdfs() {
  return apiGet('listAnnouncementPdfs');
}
export function apiUpdatePdfTags(p: { fileId: string; branchTags?: string; audienceTags?: string; status?: string; note?: string }) {
  return apiMutate('updatePdfTags', p);
}

// ==================== 簽到／點名（內建） ====================

export async function apiGetAttendance(p: {
  branchId: string;
  date: string;
  sessionType?: string;
  eventId?: string;
}) {
  const user = currentUser();
  return apiGet('getAttendance', {
    branchId: p.branchId,
    date: p.date,
    sessionType: p.sessionType || 'meeting',
    eventId: p.eventId || '',
    userId: user?.userId || '',
  });
}

export async function apiSaveAttendance(p: {
  branchId: string;
  date: string;
  sessionType?: string;
  eventId?: string;
  records: Array<{
    memberId: string;
    ymNumber?: string;
    name?: string;
    patrolId?: string;
    status: string;
    note?: string;
  }>;
}) {
  return withSubmissionLock('saveAttendance', async () => {
    const user = currentUser();
    return apiPost('saveAttendance', {
      ...p,
      sessionType: p.sessionType || 'meeting',
      eventId: p.eventId || '',
      operatedBy: user?.userId || 'system',
    });
  });
}

export async function apiGetAttendanceMatrix(p: {
  branchId: string;
  days?: number;
  sessionType?: string;
  patrolId?: string;
}) {
  const user = currentUser();
  return apiGet('getAttendanceMatrix', {
    branchId: p.branchId,
    days: String(p.days || 30),
    sessionType: p.sessionType || 'meeting',
    patrolId: p.patrolId || '',
    userId: user?.userId || '',
  });
}

export async function apiGetMemberAttendance(p?: {
  memberId?: string;
  ymNumber?: string;
  name?: string;
}) {
  const user = currentUser();
  return apiGet('getMemberAttendance', {
    memberId: p?.memberId || '',
    ymNumber: p?.ymNumber || '',
    name: p?.name || '',
    userId: user?.userId || '',
  });
}
