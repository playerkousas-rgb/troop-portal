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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {tools.map(t => (
          <Link key={t.id} href={t.href} className="no-underline text-inherit block group">
            <div className="h-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex flex-col gap-1 transition group-hover:bg-white group-hover:border-brand-300 group-hover:shadow-sm">
              <span className="flex items-center justify-between gap-1">
                <span className="text-lg leading-none" aria-hidden>
                  {t.icon}
                </span>
                {t.badge && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-full font-bold">
                    {t.badge}
                  </span>
                )}
              </span>
              <span className="font-bold text-xs text-slate-800 leading-tight">{t.label}</span>
              {t.desc && <span className="text-[11px] text-slate-500 leading-snug line-clamp-2">{t.desc}</span>}
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
