'use client';
import { useState } from 'react';

export type ReplyActionType = 'interested' | 'registered' | 'declined';
/**
 * lockedReason：有值代表「呢個掣存在，但你冇權撳」。
 * 刻意唔隱藏個掣 —— 用戶要見到有呢個功能、同埋知道點解自己用唔到，
 * 而唔係對住一個空白版面猜。
 */
export type ReplyAction = { type: ReplyActionType; idle: string; active: string; lockedReason?: string };

const STATUS: Record<string, { text: string; cls: string }> = {
  registered: { text: '✅ 已報名參加', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  declined: { text: '❌ 已婉拒參加', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  interested: { text: '❤️ 有興趣', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  unresponded: { text: '⚠️ 尚未回覆', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const ACTIVE: Record<ReplyActionType, string> = {
  interested: 'bg-rose-600 text-white border-rose-700 shadow-sm',
  registered: 'bg-emerald-700 text-white border-emerald-800 shadow-sm',
  declined: 'bg-slate-700 text-white border-slate-800 shadow-sm',
};
const IDLE = 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50';

export type ReplyEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  fee?: string;
  paymentUrl?: string;
  /** ★ 以下欄位用嚟喺「📄 通告及詳情」展開區顯示（用戶要求 #9）：
   *    報咗名之後仲要睇到通告同集合地點，唔使翻返去活動管理搵。 */
  noticeUrl?: string;
  noticeFileName?: string;
  calendarTag?: string;
  dutyPatrol?: string;
  scope?: string;
  branchId?: string;
};

/**
 * 活動回覆列（成員／領袖／家長共用）
 * 保留原有 apiSetReply 流程，只把舊版 inline style 的 .event-line 換成新版設計。
 *
 * ★ 每張卡都可以展開「📄 通告及詳情」（用戶要求 #9）：
 *   報名之後仍然睇到集合時間／地點、費用同通告連結，
 *   唔使再跳去活動管理或者搵返封通告 email。
 */
export default function EventReplyRow({
  event,
  status,
  badges,
  actions,
  loading,
  onAct,
  labels,
  footer,
  defaultOpen = false,
}: {
  event: ReplyEvent;
  status?: string;
  badges?: { text: string; tone?: 'violet' | 'slate' | 'blue' }[];
  actions: ReplyAction[];
  loading: boolean;
  onAct: (type: ReplyActionType) => void;
  labels?: Partial<Record<'registered' | 'declined' | 'interested' | 'unresponded', string>>;
  footer?: React.ReactNode;
  /** 預設展開詳情（例如只有一兩個活動時可以直接攤開） */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const key = status || 'unresponded';
  // 手機冇 hover，tooltip 睇唔到，所以鎖住嘅原因要喺畫面寫出嚟（同一原因只寫一次）
  const lockedNote = actions.find(a => a.lockedReason)?.lockedReason;
  const st = STATUS[key] || STATUS.unresponded;
  const text = (labels && labels[key as 'registered']) || st.text;

  // 詳情區內容：有乜顯示乜，全部冇嘢就唔顯示個掣
  const detailRows: { k: string; v: React.ReactNode }[] = [
    { k: '📅 日期', v: event.date || '未定日期' },
    { k: '📍 集合地點', v: event.location || '待定' },
    ...(event.fee ? [{ k: '💰 費用', v: event.fee }] : []),
    ...(event.calendarTag ? [{ k: '🏷️ 行事曆標籤', v: event.calendarTag }] : []),
    ...(event.dutyPatrol ? [{ k: '🪖 值日小隊', v: event.dutyPatrol }] : []),
    ...(event.branchId ? [{ k: '🏢 支部', v: event.scope === 'troop' ? '全旅' : event.branchId }] : []),
    ...(event.noticeUrl
      ? [{
          k: '📄 通告',
          v: (
            <a
              href={event.noticeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 font-bold underline break-all"
            >
              開啟通告{event.noticeFileName ? `（${event.noticeFileName}）` : ''} ↗
            </a>
          ),
        }]
      : []),
    ...(event.paymentUrl
      ? [{
          k: '💳 收款連結',
          v: (
            <a href={event.paymentUrl} target="_blank" rel="noopener noreferrer" className="text-amber-800 font-bold underline break-all">
              前往付款 ↗
            </a>
          ),
        }]
      : []),
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 grid gap-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-base text-slate-800">{event.title}</span>
            {(badges || []).map(b => (
              <span
                key={b.text}
                className={`text-sm px-2 py-0.5 rounded-full border font-bold ${
                  b.tone === 'violet'
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : b.tone === 'blue'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {b.text}
              </span>
            ))}
          </div>
          <div className="text-sm text-slate-500 font-semibold mt-1">
            {event.date} · {event.location}
            {event.fee ? ` · ${event.fee}` : ''}
          </div>
          {event.paymentUrl && (
            <a
              href={event.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mt-2 text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 no-underline hover:bg-amber-100 transition"
            >
              💳 前往付款
            </a>
          )}
        </div>
        <span
          className={`text-sm px-2.5 py-0.5 rounded-full border font-bold whitespace-nowrap ${st.cls}`}
        >
          {text}
        </span>
      </div>

      {/* ★ 通告及詳情（可展開）—— 報咗名都要睇到集合地點同通告 */}
      {detailRows.length > 0 && (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className="w-full flex items-center justify-between gap-2 text-sm font-bold text-brand-700 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:border-brand-300 transition"
          >
            <span>📄 通告及詳情（集合時間／地點{event.noticeUrl ? '・通告連結' : ''}）</span>
            <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>▾</span>
          </button>
          {open && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 grid gap-1.5">
              {detailRows.map(r => (
                <div key={r.k} className="flex items-start gap-2 text-sm">
                  <span className="text-slate-500 font-bold flex-shrink-0 w-28">{r.k}</span>
                  <span className="text-slate-800 font-semibold min-w-0 break-words">{r.v}</span>
                </div>
              ))}
              {!event.noticeUrl && (
                <p className="text-sm text-slate-500 m-0 mt-1 leading-relaxed">
                  ℹ️ 此活動未掛通告連結。如需詳細內容，請聯絡旅團領袖。
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {actions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {actions.map(a => {
            const locked = !!a.lockedReason;
            return (
              <button
                key={a.type}
                type="button"
                disabled={loading || locked}
                title={a.lockedReason}
                aria-label={locked ? `${a.idle}（${a.lockedReason}）` : a.idle}
                onClick={() => { if (!locked) onAct(a.type); }}
                className={`text-sm font-bold px-3.5 py-2.5 rounded-lg border transition disabled:opacity-60 ${
                  locked
                    ? 'bg-slate-100 text-slate-400 border-slate-200 border-dashed cursor-not-allowed'
                    : `cursor-pointer ${key === a.type ? ACTIVE[a.type] : IDLE}`
                }`}
              >
                {locked ? `🔒 ${a.idle}` : key === a.type ? a.active : a.idle}
              </button>
            );
          })}
        </div>
      )}

      {lockedNote && (
        <p className="text-sm text-slate-500 m-0 leading-relaxed">🔒 {lockedNote}</p>
      )}

      {footer && <div className="border-t border-slate-200/70 pt-2.5">{footer}</div>}
    </div>
  );
}
