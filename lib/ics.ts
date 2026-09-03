/**
 * 行事曆 → ICS（iCalendar）產生器
 *
 * 點解要呢個：
 *   旅團行事曆其實係存喺 Google **Sheet**（Events／RegularMeetings 兩張表），
 *   並唔係旅團 Google 帳戶嘅 Google Calendar —— Apps Script 全程冇用 CalendarApp。
 *   所以「加入去自己嘅行事曆」要由前端產生標準 .ics 檔／訂閱連結，
 *   用戶先至可以加去 Google 日曆、Apple 日曆、Outlook。
 *
 * 兩種用法：
 *   1. 下載 .ics（一次過匯入）—— 用家自己撳「下載」，內容係佢當時睇到嘅項目
 *   2. 訂閱網址（自動同步）—— /api/ics，Google 日曆「從網址新增」
 */

export type IcsEventInput = {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM（可留空＝全日） */
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  branchLabel?: string;
};

export type IcsRuleInput = {
  id: string;
  title: string;
  /** 0=星期日 … 6=星期六 */
  weekday: number;
  frequency?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  branchLabel?: string;
  /** ★ 呢條恆常集會自己嘅取消日子（YYYY-MM-DD）。
   *    必須按支部分開傳 —— 如果成個旅團嘅取消日子一齊傳，
   *    b3 取消咗嘅一日會連 b2 嘅集會一齊喺訂閱日曆上面消失。 */
  cancelledDates?: string[];
};

/** ICS 文字要 escape 同摺行（RFC 5545） */
function esc(s: string): string {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function fold(line: string): string {
  // 每行最長 75 octets，超出用 CRLF + 空格續行
  if (line.length <= 73) return line;
  const out: string[] = [];
  let cur = line.slice(0, 73);
  out.push(cur);
  let rest = line.slice(73);
  while (rest.length) {
    cur = ' ' + rest.slice(0, 72);
    out.push(cur);
    rest = rest.slice(72);
  }
  return out.join('\r\n');
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function dateOnly(ymd: string): string {
  return String(ymd || '').replace(/-/g, '');
}

function dateTime(ymd: string, hm?: string): string {
  const [h, m] = String(hm || '00:00').split(':');
  return `${dateOnly(ymd)}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
}

/** 恆常集會頻率 → RRULE（Google 日曆認得嘅寫法） */
function rruleFor(frequency: string | undefined, weekday: number): string {
  const byday = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][weekday] || 'MO';
  switch (frequency) {
    case 'biweekly': return `FREQ=WEEKLY;INTERVAL=2;BYDAY=${byday}`;
    case 'monthly_1': return `FREQ=MONTHLY;BYDAY=1${byday}`;
    case 'monthly_2': return `FREQ=MONTHLY;BYDAY=2${byday}`;
    case 'monthly_3': return `FREQ=MONTHLY;BYDAY=3${byday}`;
    case 'monthly_4': return `FREQ=MONTHLY;BYDAY=4${byday}`;
    case 'monthly_last': return `FREQ=MONTHLY;BYDAY=-1${byday}`;
    default: return `FREQ=WEEKLY;BYDAY=${byday}`;
  }
}

export function buildIcs(opts: {
  calendarName: string;
  events: IcsEventInput[];
  rules?: IcsRuleInput[];
  /** 已取消嘅日子（YYYY-MM-DD）→ 由訂閱嘅恆常集會排除 */
  cancelledDates?: string[];
}): string {
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Scout System//Troop Calendar//ZH-HK',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${esc(opts.calendarName)}`),
    fold(`X-WR-TIMEZONE:Asia/Hong_Kong`),
  ];

  // 一次性活動
  for (const e of opts.events) {
    const allDay = !e.startTime;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${esc(e.id)}@scoutsystem`);
    lines.push(`DTSTAMP:${stamp(now)}`);
    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.date)}`);
      // DTEND 係「結束嗰日」＝次日（全日事件規則）
      const next = new Date(`${e.date}T00:00:00`);
      next.setDate(next.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${stamp(next).slice(0, 8)}`);
    } else {
      lines.push(`DTSTART;TZID=Asia/Hong_Kong:${dateTime(e.date, e.startTime)}`);
      lines.push(`DTEND;TZID=Asia/Hong_Kong:${dateTime(e.date, e.endTime || e.startTime)}`);
    }
    lines.push(fold(`SUMMARY:${esc(e.title)}`));
    if (e.location) lines.push(fold(`LOCATION:${esc(e.location)}`));
    const desc = [e.branchLabel ? `支部：${e.branchLabel}` : '', e.description || ''].filter(Boolean).join('\n');
    if (desc) lines.push(fold(`DESCRIPTION:${esc(desc)}`));
    lines.push('END:VEVENT');
  }

  // 恆常集會 → 用 RRULE 重複事件，取消咗嘅日子用 EXDATE 排除
  for (const r of opts.rules || []) {
    // 優先用呢條集會自己（自己支部）嘅取消日子；冇先退回全域清單
    const src = (r.cancelledDates && r.cancelledDates.length !== undefined)
      ? r.cancelledDates
      : (opts.cancelledDates || []);
    const cancelled = (src || []).map(dateOnly).filter(Boolean);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:rule-${esc(r.id)}@scoutsystem`);
    lines.push(`DTSTAMP:${stamp(now)}`);
    // 起始日：以本星期該 weekday 為起點
    const base = new Date();
    const diff = (Number(r.weekday) - base.getDay() + 7) % 7;
    base.setDate(base.getDate() + diff - 28); // 由 4 星期前開始，涵蓋已過嘅紀錄
    const startYmd = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    lines.push(`DTSTART;TZID=Asia/Hong_Kong:${dateTime(startYmd, r.startTime)}`);
    lines.push(`DTEND;TZID=Asia/Hong_Kong:${dateTime(startYmd, r.endTime || r.startTime)}`);
    lines.push(`RRULE:${rruleFor(r.frequency, Number(r.weekday))}`);
    if (cancelled.length) {
      lines.push(`EXDATE;TZID=Asia/Hong_Kong:${cancelled.map(d => dateTime(ymdFromCompact(d), r.startTime)).join(',')}`);
    }
    lines.push(fold(`SUMMARY:${esc(r.title)}`));
    if (r.location) lines.push(fold(`LOCATION:${esc(r.location)}`));
    if (r.branchLabel) lines.push(fold(`DESCRIPTION:${esc(`支部：${r.branchLabel}`)}`));
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

function ymdFromCompact(compact: string): string {
  const s = String(compact || '');
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
}

/** 瀏覽器下載 .ics */
export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
