export type MeetingItem = { date?: string; gatherTime?: string; dismissTime?: string; gatherLocation?: string; dismissLocation?: string; location?: string; activity?: string; assessment?: string; uniform?: string; fee?: string; remarks?: string };

export type ParsedNotice = {
  noticeType?: 'activity_notice' | 'meeting_schedule';
  noticeNo?: string;
  title?: string;
  source?: string;
  publishDate?: string;
  eventDate?: string;
  eventTime?: string;
  gatherTime?: string;
  gatherLocation?: string;
  dismissTime?: string;
  dismissLocation?: string;
  location?: string;
  eligibility?: string;
  branches?: string;
  quota?: string;
  fee?: string;
  internalDeadline?: string;
  officialDeadline?: string;
  registrationMethod?: string;
  leaderInCharge?: string;
  attachmentUrl?: string;
  googleFolderUrl?: string;
  documentUrl?: string;
  mode?: 'informational' | 'troop_participation';
  addToCalendar?: boolean;
  contact?: string;
  meetingMonth?: string;
  replyDeadline?: string;
  meetingItems: MeetingItem[];
  notes?: string;
  rawText: string;
  warnings: string[];
};

const LABELS: Array<[keyof ParsedNotice, string[]]> = [
  ['noticeType', ['通告類型', '類型', '文件類型']],
  ['noticeNo', ['通告編號', '編號', 'notice no', 'notice number']],
  ['title', ['通告標題', '標題', '活動名稱', '名稱', 'title']],
  ['source', ['來源', '發布單位', '主辦單位', 'source']],
  ['publishDate', ['發布日期', '通告日期', 'date issued']],
  ['meetingMonth', ['集會月份', '月份', 'month']],
  ['replyDeadline', ['回覆截止日期', '回覆截止', '家長回覆截止']],
  ['eventDate', ['活動日期', '日期', 'event date']],
  ['eventTime', ['活動時間', '時間', 'event time']],
  ['gatherTime', ['集合時間', 'gathering time']],
  ['gatherLocation', ['集合地點', 'gathering place', '集合位置']],
  ['dismissTime', ['解散時間', 'dismissal time']],
  ['dismissLocation', ['解散地點', 'dismissal place', '解散位置']],
  ['location', ['活動地點', '地點', '場地', 'location', 'venue']],
  ['eligibility', ['參加資格', '參加對象', '對象', '資格', 'eligible participants']],
  ['branches', ['適合支部', '支部', '適用支部', '對應支部']],
  ['quota', ['名額', '限額', 'quota']],
  ['fee', ['收費', '費用', '費用及收費', 'fee']],
  ['internalDeadline', ['本旅截止日期', '內部截止日期', '本團截止日期', '本旅截止']],
  ['officialDeadline', ['官方截止日期', '截止日期', '報名截止日期', 'deadline']],
  ['registrationMethod', ['報名方式', '報名方法', 'application method']],
  ['leaderInCharge', ['負責領袖', '查詢', '聯絡人', '負責人']],
  ['contact', ['查詢電話', '聯絡電話', '查詢聯絡']],
  ['attachmentUrl', ['附件連結', '通告連結', '表格連結', '附件', 'url', 'link']],
  ['googleFolderUrl', ['google folder', 'google folder url', '資料夾連結', 'google資料夾', 'google drive 資料夾', '雲端資料夾']],
  ['documentUrl', ['原檔連結', 'word連結', '文件連結', 'google doc', 'google文件']],
  ['notes', ['備註', '注意事項', 'remarks', 'notes']],
];

const labelToKey = new Map<string, keyof ParsedNotice>();
for (const [key, labels] of LABELS) labels.forEach(l => labelToKey.set(normalizeLabel(l), key));

function normalizeLabel(v: string) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[：:]/g, '');
}

function normalizeMode(v: string): ParsedNotice['mode'] | undefined {
  const s = v.trim();
  if (/旅團參與|團體參與|活動|行事曆|需要家長|家長回覆/.test(s)) return 'troop_participation';
  if (/資訊|通告|不加入|自行報名|自行找領袖/.test(s)) return 'informational';
  return undefined;
}

function parseBool(v: string) {
  if (/^(是|yes|y|true|加入|需要)$/i.test(v.trim())) return true;
  if (/^(否|no|n|false|不加入|不用|不需要)$/i.test(v.trim())) return false;
  return undefined;
}

export function parseNoticeText(rawText: string): ParsedNotice {
  const result: ParsedNotice = { rawText, warnings: [], meetingItems: [] };
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let currentKey: keyof ParsedNotice | null = null;

  for (const line of lines) {
    const m = line.match(/^([^:：]{1,30})[：:]\s*(.*)$/);
    if (m) {
      const label = normalizeLabel(m[1]);
      const value = m[2].trim();
      if (label === normalizeLabel('通告類型') || label === normalizeLabel('類型') || label === normalizeLabel('文件類型')) {
        if (/集會|月.*安排|日常|公告/.test(value)) result.noticeType = 'meeting_schedule';
        else if (/活動|露營|訓練|服務|旅團參與/.test(value)) result.noticeType = 'activity_notice';
        currentKey = null;
        continue;
      }
      if (label === normalizeLabel('接入模式') || label === normalizeLabel('通告模式')) {
        const mode = normalizeMode(value);
        if (mode) result.mode = mode;
        else result.warnings.push(`未能識別接入模式：${value}`);
        currentKey = null;
        continue;
      }
      if (label === normalizeLabel('是否加入行事曆') || label === normalizeLabel('加入行事曆')) {
        const b = parseBool(value);
        if (typeof b === 'boolean') result.addToCalendar = b;
        currentKey = null;
        continue;
      }
      const key = labelToKey.get(label);
      if (key) {
        const old = result[key] as any;
        (result as any)[key] = old ? `${old}\n${value}` : value;
        currentKey = key;
        continue;
      }
    }
    // Standard meeting schedule row: date｜gather｜dismiss｜gather place｜dismiss place｜location｜activity｜assessment｜uniform｜fee｜remarks
    if (line.includes('｜') || line.includes('|')) {
      const parts = line.split(/[｜|]/).map(x => x.trim());
      if (parts.length >= 6 && /\d|月|日|星期|六|五/.test(parts[0])) {
        result.meetingItems.push({
          date: parts[0], gatherTime: parts[1], dismissTime: parts[2], gatherLocation: parts[3], dismissLocation: parts[4],
          location: parts[5], activity: parts[6], assessment: parts[7], uniform: parts[8], fee: parts[9], remarks: parts.slice(10).join('｜')
        });
        result.noticeType = result.noticeType || 'meeting_schedule';
        currentKey = null;
        continue;
      }
    }

    // continuation line: append to previous field, usually notes/eligibility
    if (currentKey && currentKey !== 'rawText' && currentKey !== 'warnings') {
      (result as any)[currentKey] = ((result as any)[currentKey] ? (result as any)[currentKey] + '\n' : '') + line;
    }
  }

  if (!result.noticeType) {
    if (result.meetingItems.length || result.meetingMonth || /集會安排|月份集會/.test(rawText)) result.noticeType = 'meeting_schedule';
    else result.noticeType = 'activity_notice';
  }
  if (!result.mode) {
    // 日常集會安排預設是公告，不是通告 / 活動，不需要家長回覆、不加入行事曆。
    if (result.noticeType === 'meeting_schedule') result.mode = 'informational';
    else result.mode = result.addToCalendar ? 'troop_participation' : 'informational';
  }
  if (result.noticeType === 'meeting_schedule') result.addToCalendar = false;
  if (result.mode === 'troop_participation') result.addToCalendar = true;
  // Auto-fill internalDeadline from officialDeadline if not set
  if (!result.internalDeadline && result.officialDeadline) {
    result.internalDeadline = result.officialDeadline;
  }
  if (!result.internalDeadline && result.replyDeadline) {
    result.internalDeadline = result.replyDeadline;
  }
  if (!result.title) result.warnings.push('缺少通告標題。');
  if (result.noticeType === 'meeting_schedule' && result.meetingItems.length === 0) result.warnings.push('日常集會安排建議使用「日期｜集合時間｜解散時間｜集合地點｜解散地點｜活動地點｜活動項目｜建議考核｜服飾｜費用｜備註」表格列。');
  if (!result.eligibility) result.warnings.push('建議加入「參加資格：」，方便判斷對象。');
  if (!result.fee) result.warnings.push('建議加入「收費：」，即使免費也寫「免費」。');
  if (!result.internalDeadline) result.warnings.push('建議加入「本旅截止日期：」，通常早於官方截止。');
  return result;
}
