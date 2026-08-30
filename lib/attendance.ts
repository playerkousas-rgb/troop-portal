import { Role } from './model';

export type AttendanceStatus = 'P' | 'A' | 'L' | 'E' | 'S' | '';
export type AttendanceSessionType = 'meeting' | 'activity';

export type AttendanceRosterItem = {
  memberId: string;
  ymNumber: string;
  name: string;
  branchId: string;
  patrolId: string;
  patrolName: string;
  status: AttendanceStatus;
  note: string;
  recordId?: string;
};

export type AttendanceSummary = {
  P: number;
  A: number;
  L: number;
  E: number;
  S: number;
  blank: number;
  total: number;
};

export type AttendancePayload = {
  success: boolean;
  error?: string;
  date?: string;
  branchId?: string;
  sessionType?: AttendanceSessionType;
  eventId?: string;
  roster?: AttendanceRosterItem[];
  summary?: AttendanceSummary;
};

export type AttendanceMatrix = {
  success: boolean;
  error?: string;
  headers: string[];
  rows: Array<Record<string, string>>;
};

export type MemberAttendanceRecord = {
  memberId: string;
  ymNumber: string;
  name: string;
  branchId: string;
  patrolId: string;
  patrolName: string;
  dates: Record<string, { status: AttendanceStatus; note: string; sessionType: AttendanceSessionType; eventId?: string }>;
  stats: AttendanceSummary;
};

export const ATTENDANCE_STATUSES: Array<{
  code: Exclude<AttendanceStatus, ''>;
  label: string;
  hint: string;
}> = [
  { code: 'P', label: '出席', hint: '準時到場' },
  { code: 'A', label: '缺席', hint: '沒有到場' },
  { code: 'L', label: '遲到', hint: '遲到到場' },
  { code: 'E', label: '請假', hint: '事先請假' },
  { code: 'S', label: '病假', hint: '因病缺席' },
];

export const LEADER_ATTENDANCE_ROLES: Role[] = [
  'super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader', 'coach',
];

export function canMarkAttendance(role?: Role) {
  return !!role && LEADER_ATTENDANCE_ROLES.includes(role);
}

export function emptyAttendanceSummary(total = 0): AttendanceSummary {
  return { P: 0, A: 0, L: 0, E: 0, S: 0, blank: total, total };
}

export function summarizeRoster(roster: AttendanceRosterItem[]): AttendanceSummary {
  const summary = emptyAttendanceSummary(roster.length);
  roster.forEach(item => {
    if (item.status === 'P' || item.status === 'A' || item.status === 'L' || item.status === 'E' || item.status === 'S') {
      summary[item.status] += 1;
    } else {
      summary.blank += 1;
    }
  });
  summary.blank = roster.filter(item => !item.status).length;
  return summary;
}

export function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function weekdayLabel(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const [y, m, d] = date.split('-').map(Number);
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()] || '';
}

export const PLUGIN_IDS_NOW_CORE = new Set(['troop_attendance']);

export function isCoreNotPlugin(pluginId?: string) {
  return !!pluginId && PLUGIN_IDS_NOW_CORE.has(pluginId);
}
