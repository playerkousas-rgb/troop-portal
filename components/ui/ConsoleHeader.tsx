import { ReactNode } from 'react';

type Tone = 'amber' | 'blue' | 'emerald' | 'violet';

const TONE: Record<Tone, string> = {
  amber: 'bg-gradient-to-br from-amber-800 to-amber-500',
  blue: 'bg-gradient-to-br from-brand-800 to-brand-500',
  emerald: 'bg-gradient-to-br from-emerald-900 to-emerald-600',
  violet: 'bg-gradient-to-br from-violet-900 to-violet-600',
};

/**
 * 控制台頂部身份條（新版設計）
 * 取代舊版「漸變大卡 + .hero 說明卡」兩張卡，合併成一張。
 */
export default function ConsoleHeader({
  icon,
  name,
  roleLabel,
  troop,
  tone,
  tagline,
  action,
}: {
  icon: string;
  name: string;
  roleLabel: string;
  troop?: string;
  tone: Tone;
  tagline?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`${TONE[tone]} text-white rounded-2xl px-4 py-3.5 shadow-lg`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-11 h-11 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            aria-hidden
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="font-black text-base sm:text-lg leading-tight truncate m-0">{name}</h2>
            <p className="text-[11px] sm:text-xs text-white/85 font-semibold truncate m-0">
              {[troop, roleLabel].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        {action}
      </div>
      {tagline && <p className="text-[11px] text-white/75 mt-2 mb-0 leading-relaxed">{tagline}</p>}
    </section>
  );
}
