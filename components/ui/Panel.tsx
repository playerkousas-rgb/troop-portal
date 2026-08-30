'use client';
import { ReactNode, useState } from 'react';

export type PanelTone = 'blue' | 'emerald' | 'amber' | 'violet' | 'slate' | 'rose';

const ICON_TONE: Record<PanelTone, string> = {
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-700',
  amber: 'bg-amber-500',
  violet: 'bg-violet-600',
  slate: 'bg-slate-600',
  rose: 'bg-rose-600',
};

/**
 * 大卡片容器（可收合）
 * —— 同類內容收在同一張大卡內，標題列按一下就收合，控制台不再一卡一卡排開。
 */
export default function Panel({
  icon,
  title,
  subtitle,
  tone = 'slate',
  count,
  defaultOpen = true,
  bodyClass = '',
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  tone?: PanelTone;
  count?: number | string;
  defaultOpen?: boolean;
  bodyClass?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white hover:bg-slate-50 transition text-left cursor-pointer"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-7 h-7 ${ICON_TONE[tone]} text-white rounded-lg flex items-center justify-center text-sm flex-shrink-0`}
            aria-hidden
          >
            {icon}
          </span>
          <span className="block min-w-0">
            <span className="block font-bold text-sm text-slate-800 leading-tight">{title}</span>
            {subtitle && (
              <span className="block text-[11px] text-slate-500 font-semibold leading-tight mt-0.5 truncate">
                {subtitle}
              </span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-2 flex-shrink-0">
          {count !== undefined && <span className="text-[11px] text-slate-500 font-bold">{count}</span>}
          <span
            className={`text-[10px] text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          >
            ▼
          </span>
        </span>
      </button>
      {open && <div className={`px-4 pb-4 ${bodyClass}`}>{children}</div>}
    </section>
  );
}
