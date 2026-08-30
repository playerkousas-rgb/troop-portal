import { ReactNode } from 'react';

interface SectionHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
  badge?: string;
  color: 'emerald' | 'blue' | 'amber' | 'violet' | 'slate' | 'rose';
}

const COLOR_MAP = {
  emerald: {
    iconBg: 'bg-emerald-700',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  blue: {
    iconBg: 'bg-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  amber: {
    iconBg: 'bg-amber-700',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  violet: {
    iconBg: 'bg-violet-600',
    badgeBg: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  slate: {
    iconBg: 'bg-slate-600',
    badgeBg: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  rose: {
    iconBg: 'bg-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export default function SectionHeader({ icon, title, subtitle, badge, color }: SectionHeaderProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
      <h3 className="font-bold text-sm flex items-center gap-2">
        <span className={`w-6 h-8 ${c.iconBg} text-white rounded-lg flex items-center justify-center text-xs`}>
          {icon}
        </span>
        {title}
        {subtitle && (
          <span className="text-[11px] text-slate-500 font-normal">{subtitle}</span>
        )}
      </h3>
      {badge && (
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${c.badgeBg}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
