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
    <section className={`${TONE[tone]} text-white rounded-2xl px-5 py-5 shadow-lg`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <span
            className="w-14 h-14 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
            aria-hidden
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="font-black text-xl sm:text-2xl leading-tight truncate m-0">{name}</h2>
            <p className="text-sm sm:text-base text-white/90 font-semibold truncate m-0 mt-1">
              {[troop, roleLabel].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        {action}
      </div>
      {tagline && <p className="text-base text-white/80 mt-3 mb-0 leading-relaxed">{tagline}</p>}
    </section>
  );
}
