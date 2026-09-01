'use client';

export type ReplyActionType = 'interested' | 'registered' | 'declined';
export type ReplyAction = { type: ReplyActionType; idle: string; active: string };

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
};

/**
 * 活動回覆列（成員／領袖／家長共用）
 * 保留原有 apiSetReply 流程，只把舊版 inline style 的 .event-line 換成新版設計。
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
}: {
  event: ReplyEvent;
  status?: string;
  badges?: { text: string; tone?: 'violet' | 'slate' | 'blue' }[];
  actions: ReplyAction[];
  loading: boolean;
  onAct: (type: ReplyActionType) => void;
  labels?: Partial<Record<'registered' | 'declined' | 'interested' | 'unresponded', string>>;
  footer?: React.ReactNode;
}) {
  const key = status || 'unresponded';
  const st = STATUS[key] || STATUS.unresponded;
  const text = (labels && labels[key as 'registered']) || st.text;

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

      {actions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {actions.map(a => (
            <button
              key={a.type}
              type="button"
              disabled={loading}
              onClick={() => onAct(a.type)}
              className={`text-sm font-bold px-3.5 py-2.5 rounded-lg border transition cursor-pointer disabled:opacity-60 ${
                key === a.type ? ACTIVE[a.type] : IDLE
              }`}
            >
              {key === a.type ? a.active : a.idle}
            </button>
          ))}
        </div>
      )}

      {footer && <div className="border-t border-slate-200/70 pt-2.5">{footer}</div>}
    </div>
  );
}
