'use client';
import Link from 'next/link';
import Panel, { PanelTone } from './Panel';

export type ConsoleTool = {
  id: string;
  icon: string;
  label: string;
  desc?: string;
  href: string;
  badge?: string;
  /** 有值 = 卡片照顯示但鎖住（未獲授權），內容為原因 */
  lockedReason?: string;
};

/**
 * 同類功能卡歸類成一張大卡（可收合）
 * —— 舊版每個功能一張 .card（管理員頁面一次排 15 張），
 *    新版按類別收成 4–5 張大卡，卡內以小方格排列。
 */
export default function ToolGroup({
  icon,
  title,
  subtitle,
  tone = 'slate',
  tools,
  defaultOpen = true,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  tone?: PanelTone;
  tools: ConsoleTool[];
  defaultOpen?: boolean;
}) {
  if (!tools || tools.length === 0) return null;

  return (
    <Panel
      icon={icon}
      title={title}
      subtitle={subtitle}
      tone={tone}
      count={`${tools.length} 項`}
      defaultOpen={defaultOpen}
      bodyClass="pt-3"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {tools.map(t => {
          const body = (
            <div
              className={`h-full rounded-xl border p-3 flex flex-col gap-1.5 transition ${
                t.lockedReason
                  ? 'border-dashed border-slate-300 bg-slate-100/70'
                  : 'border-slate-200 bg-slate-50/70 group-hover:bg-white group-hover:border-brand-300 group-hover:shadow-sm'
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span className={`text-xl leading-none ${t.lockedReason ? 'grayscale opacity-60' : ''}`} aria-hidden>
                  {t.icon}
                </span>
                {t.lockedReason ? (
                  <span className="text-sm bg-slate-200 text-slate-600 border border-slate-300 px-2 py-0.5 rounded-full font-bold">
                    🔒 未授權
                  </span>
                ) : t.badge ? (
                  <span className="text-sm bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                    {t.badge}
                  </span>
                ) : null}
              </span>
              <span className={`font-bold text-sm leading-tight ${t.lockedReason ? 'text-slate-500' : 'text-slate-800'}`}>
                {t.label}
              </span>
              {t.desc && (
                <span className="text-sm text-slate-500 leading-snug line-clamp-2">
                  {t.lockedReason || t.desc}
                </span>
              )}
            </div>
          );
          // 鎖住嘅卡片唔做連結 —— 撳落去彈「未獲授權」頁對用戶冇幫助，
          // 不如當場講清楚要搵團長授權。
          return t.lockedReason ? (
            <div key={t.id} title={t.lockedReason} aria-disabled="true" className="cursor-not-allowed">
              {body}
            </div>
          ) : (
            <Link key={t.id} href={t.href} className="no-underline text-inherit block group">
              {body}
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
