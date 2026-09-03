'use client';
import { AppState } from './store';
import { Role } from './model';
import { getSession } from './session';

// ==================== 取得旅團資訊 ====================

export function getTroopKey(): string {
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
  // ★ MOCK 已實作進 MAIN：所有請求（包括演示旅團）都經真實 HTTP 路徑
  //   /api/proxy。演示旅團由 proxy 轉到內置 MOCK 後台，不再在瀏覽器模擬。
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

/**
 * 讀取資料切片（3.0 按需載入）
 * 取代整包 getDashboard：每個頁面只取自己需要的欄位（keys），
 * 回傳的 state 只含所請求的欄位（未請求的欄位為空值），
 * 角色過濾邏輯與 getDashboard 完全相同。
 */
export async function apiGetSlice(keys: string[], extra?: Record<string, string | undefined>) {
  const user = currentUser();
  return apiGet<{ success: boolean; state?: AppState; error?: string }>('getState', {
    keys: keys.join(','),
    userId: user?.userId || '',
    ...extra,
  });
}

/** 讀取 Dashboard（按角色過濾，整包 — 寫入後重新整理時用） */
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

/**
 * 連線診斷：一次過檢查「前端 → /api/proxy → Apps Script」整條鏈。
 * 用原始 fetch（不經 apiGet），即使後台回 success:false 也能把錯誤內容帶回來，
 * 讓登入頁可以顯示可執行的修復建議，而不是一句「登入失敗」。
 */
export async function apiDiagnose(): Promise<{
  troopKey: string;
  proxyOk: boolean;
  mock?: boolean;
  apiKeySet?: boolean;
  webAppOk?: boolean;
  version?: string;
  error?: string;
}> {
  const out: any = { troopKey: getTroopKey(), proxyOk: false };

  if (typeof window === 'undefined') return out;

  // 1) Vercel proxy + 環境變數（API Key 有沒有設）
  try {
    const dbgUrl = new URL('/api/proxy', window.location.origin);
    dbgUrl.searchParams.set('action', 'proxyDebug');
    dbgUrl.searchParams.set('troopKey', out.troopKey || 'unknown');
    const res = await fetch(dbgUrl.toString(), { cache: 'no-store' });
    const dbg = await res.json().catch(() => ({}));
    out.proxyOk = !!dbg?.success || !!dbg?.debug;
    out.apiKeySet = !!dbg?.apiKeyFound;
    out.mock = !!dbg?.mock;
    if (dbg?.error) out.error = dbg.error;
    if (dbg?.envVarName) out.envVarName = dbg.envVarName;
  } catch (e: any) {
    out.error = '無法連到本站的 /api/proxy：' + (e?.message || String(e));
    return out;
  }

  // 2) 後台 health（演示旅團 → 內置 MOCK 後台；真實旅團 → Apps Script Web App）
  try {
    const res = await fetch(buildUrl('health'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    out.webAppOk = !!data?.success;
    out.version = data?.version;
    if (!out.webAppOk && (data?.error || data?.raw)) {
      out.error = data.error || ('Apps Script 回傳：' + String(data.raw || '').slice(0, 120));
    }
  } catch (e: any) {
    out.error = '無法連到後台：' + (e?.message || String(e));
  }

  return out;
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

// ==================== 物資（Equipment）／借用（EquipmentLoans） ====================

/** 讀取物資清單 + 借用紀錄（含該角色看得到的範圍，由 GS 依角色過濾） */
export async function apiGetEquipment() {
  const data = await apiGet<{ success: boolean; state?: AppState; error?: string }>('getEquipment', {
    userId: currentUser()?.userId || '',
  });
  if (!data.success || !data.state) throw new Error(data.error || '讀取物資失敗');
  return data.state;
}

export function apiCreateEquipment(p: { name: string; category?: string; unit?: string; totalQty?: number | string; location?: string; note?: string; enabled?: boolean }) {
  return apiMutate('createEquipment', p as any);
}
export function apiUpdateEquipment(p: { equipmentId: string; name?: string; category?: string; unit?: string; totalQty?: number | string; location?: string; note?: string; enabled?: boolean }) {
  return apiMutate('updateEquipment', p as any);
}
/** 入庫（+delta）／報廢（-delta） */
export function apiAdjustEquipmentQty(equipmentId: string, delta: number, note?: string) {
  return apiMutate('adjustEquipmentQty', { equipmentId, delta: String(delta), note: note || '' });
}
export function apiDeleteEquipment(equipmentId: string) {
  return apiMutate('deleteEquipment', { equipmentId });
}

/** 借用申請：一次可借多項（items = [{ equipmentId, qty }]） */
export function apiRequestEquipmentLoan(p: { items: { equipmentId: string; qty: number }[]; borrowDate: string; returnDueDate: string; purpose?: string; note?: string; memberId?: string }) {
  return apiMutate('requestEquipmentLoan', {
    items: JSON.stringify(p.items),
    borrowDate: p.borrowDate,
    returnDueDate: p.returnDueDate,
    purpose: p.purpose || '',
    note: p.note || '',
    memberId: p.memberId || '',
  });
}
export function apiUpdateEquipmentLoan(p: { loanId: string; qty?: number; purpose?: string; borrowDate?: string; returnDueDate?: string; note?: string }) {
  return apiMutate('updateEquipmentLoan', p as any);
}
export function apiCancelEquipmentLoan(loanId: string) {
  return apiMutate('cancelEquipmentLoan', { loanId });
}
/** 領袖批核：approved 會即時扣庫存 */
export function apiDecideEquipmentLoan(loanId: string, decision: 'approved' | 'rejected', note?: string) {
  return apiMutate('decideEquipmentLoan', { loanId, decision, note: note || '' });
}
/** 領袖 Tick 已歸還 → 庫存回補 */
export function apiReturnEquipmentLoan(loanId: string, note?: string) {
  return apiMutate('returnEquipmentLoan', { loanId, note: note || '' });
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

/** 成員自助登記「想考的章」（唔需要 members 權限；後端會檢查係咪本人／家長） */
export function apiSetWantedBadges(p: { memberId: string; wantedBadges: string }) {
  return apiMutate('setWantedBadges', p);
}

/** 公開資料第 1 層：管理員開／關卡片（行事曆／相簿／通告）。
 *  開卡時後端會預設把 troop（全旅內容）一齊公開。 */
export function apiSetPublicCard(p: { card: 'calendar' | 'albums' | 'notices'; enabled: boolean }) {
  return apiMutate('setPublicCard', { card: p.card, enabled: p.enabled ? 'TRUE' : 'FALSE' });
}

/** 公開資料第 2 層：內容 scope。
 *  `troop`（全旅內容）只可以由管理層改；支部 scope 由該支部團長／支部領袖改（後端會檢查）。 */
export function apiSetPublicScope(p: { card: 'calendar' | 'albums' | 'notices'; scope: string; enabled: boolean }) {
  return apiMutate('setPublicScope', { card: p.card, scope: p.scope, enabled: p.enabled ? 'TRUE' : 'FALSE' });
}

// ==================== 活動 / 報名 ====================

export function apiCreateEvent(p: { title: string; scope?: string; branchId?: string; date?: string; location?: string; kind?: string; status?: string; source?: string; fee?: string; paymentUrl?: string; dutyPatrol?: string; targetMemberIds?: string; category?: string; calendarTag?: string; noticeUrl?: string; noticeFileName?: string; albumUrl?: string; inputMode?: string }) {
  return apiMutate('createEvent', p as any);
}
export function apiPublishEvent(eventId: string) {
  return apiMutate('publishEvent', { eventId });
}
export function apiUpdateEvent(p: { eventId: string; title?: string; date?: string; location?: string; scope?: string; branchId?: string; fee?: string; paymentUrl?: string; dutyPatrol?: string; status?: string; category?: string; calendarTag?: string; noticeUrl?: string; noticeFileName?: string; albumUrl?: string; inputMode?: string }) {
  return apiMutate('updateEvent', p as any);
}
export function apiDeleteEvent(eventId: string) {
  return apiMutate('deleteEvent', { eventId });
}
/** 過期通告：旅團活動 → 放入「過期通告」封存（可查回）；區地域總會（外部）→ 直接刪除 */
export function apiArchiveEvent(eventId: string) {
  return apiMutate('archiveEvent', { eventId });
}
/** 由封存還原成已發布 */
export function apiRestoreEvent(eventId: string) {
  return apiMutate('restoreEvent', { eventId });
}
/** 重開報名：活動過咗期／已封存，但領袖想畀遲咗嘅人補報 */
export function apiReopenEvent(eventId: string) {
  return apiMutate('reopenEvent', { eventId });
}
export function apiSetReply(p: { eventId: string; memberId: string; type: string; parentUserId?: string }) {
  const user = currentUser();
  const operatedBy = user?.role === 'parent' ? 'parent' : user?.role === 'member' ? 'member' : 'leader';
  return apiMutate('setReply', { ...p, operatedBy });
}
export function apiTogglePaid(eventId: string, memberId: string) {
  return apiMutate('togglePaid', { eventId, memberId });
}
/** 領袖核實收款：家長 tick「已付款」後，領袖在自己一邊確認收到錢 */
export function apiConfirmPayment(eventId: string, memberId: string, confirmed: boolean) {
  return apiMutate('confirmPayment', { eventId, memberId, confirmed: confirmed ? 'true' : 'false' });
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
export type ChildRef = string | { ymNumber?: string; name?: string; branchId?: string; dateOfBirth?: string };

/** 建立帳號;家長可帶 children(SCOUT ID 或姓名陣列)— GS 端自動找/建成員紀錄並連結 */
export async function apiCreateUser(p: { name: string; email: string; password?: string; role: string; branchId?: string; children?: ChildRef[] }) {
  return withSubmissionLock('createUser', async () => {
    const user = currentUser();
    const data = await apiPost<{ success: boolean; state?: AppState; linked?: string[]; created?: string[]; error?: string }>('createUser', {
      ...p, operatedBy: user?.userId || 'system',
    });
    if (!data.success || !data.state) throw new Error(data.error || 'createUser 失敗');
    return { state: data.state, linked: data.linked || [], created: data.created || [] };
  });
}
export function apiBatchCreateUsers(rows: Array<{ name: string; email: string; password?: string; role: string; branchId?: string; memberId?: string; approved?: boolean; children?: ChildRef[] }>) {
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

// ==================== 最新消息（首頁最上方 BAR，最多 3 條） ====================

export function apiAddLatestNews(p: { text: string }) {
  return apiMutate('addLatestNews', p as any);
}
export function apiDeleteLatestNews(id: string) {
  return apiMutate('deleteLatestNews', { id });
}

// ==================== 內部公告 ====================

export async function apiGetAnnouncements() {
  return apiGet<{ success: boolean; data?: any[]; count?: number; error?: string }>('getAnnouncements');
}
export function apiAddAnnouncement(p: { title: string; message: string; scope?: string; branchId?: string }) {
  return apiMutate('addAnnouncement', p as any);
}
export function apiUpdateAnnouncement(p: { announcementId: string; title?: string; message?: string; scope?: string; branchId?: string }) {
  return apiMutate('updateAnnouncement', p as any);
}
export function apiDeleteAnnouncement(announcementId: string) {
  return apiMutate('deleteAnnouncement', { announcementId });
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

export function apiCreateMeeting(p: { title: string; type: 'agenda' | 'minutes'; date: string; startTime?: string; endTime?: string; location?: string; targetRoles?: string; branchId?: string; url?: string; calendarTag?: string }) {
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
  from?: string;
  to?: string;
}) {
  const user = currentUser();
  return apiGet('getAttendanceMatrix', {
    branchId: p.branchId,
    days: String(p.days || 30),
    sessionType: p.sessionType || 'meeting',
    patrolId: p.patrolId || '',
    from: p.from || '',
    to: p.to || '',
    userId: user?.userId || '',
  });
}

/** 後補／補改：列出可以點名嘅場次（過期／即將嘅恆常集會日 + 旅團活動） */
export async function apiGetAttendanceSessions(p: { branchId: string }) {
  const user = currentUser();
  return apiGet('getAttendanceSessions', {
    branchId: p.branchId,
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
