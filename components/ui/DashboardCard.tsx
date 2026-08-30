import Link from 'next/link';
import { ReactNode } from 'react';

interface DashboardCardProps {
  icon: string;
  title: string;
  description: string;
  href?: string;
  badge?: string;
  badgeColor?: 'green' | 'blue' | 'gold' | 'red' | 'purple' | 'slate';
  stats?: { label: string; value: string | number; color?: string }[];
  subItems?: { label: string; href: string; icon?: string; badge?: string }[];
  locked?: boolean;
  wide?: boolean;
}

const BADGE_COLORS = {
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  gold: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
  purple: 'bg-violet-100 text-violet-700 border-violet-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function DashboardCard({
  icon,
  title,
  description,
  href,
  badge,
  badgeColor = 'slate',
  stats,
  subItems,
  locked,
  wide,
}: DashboardCardProps) {
  const content = (
    <div
      className={`
        bg-white rounded-2xl border border-slate-200 p-4 
        card-hover relative overflow-hidden
        ${locked ? 'opacity-50 grayscale' : ''}
        ${wide ? 'col-span-full md:col-span-2' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-slate-800 leading-tight truncate">{title}</h4>
          </div>
        </div>
        {badge && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${BADGE_COLORS[badgeColor]}`}>
            {badge}
          </span>
        )}
        {locked && (
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
            🔒
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 line-clamp-2">
        {description}
      </p>

      {/* Stats row */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
              <div className="text-base font-extrabold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-items (big card with subcategories) */}
      {subItems && subItems.length > 0 && (
        <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
          {subItems.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 transition group text-xs"
            >
              <span className="flex items-center gap-1.5 text-slate-600 group-hover:text-slate-900 font-medium">
                {item.icon && <span className="text-sm">{item.icon}</span>}
                {item.label}
              </span>
              {item.badge && (
                <span className="text-[11px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Footer link */}
      {href && !subItems && (
        <div className="flex items-center text-[11px] text-brand-600 font-bold mt-1">
          前往 →
        </div>
      )}
    </div>
  );

  if (href && !subItems) {
    return <Link href={href} className="no-underline">{content}</Link>;
  }

  return content;
}
