import Link from 'next/link';

export type Stat = {
  label: string;
  value: number | string;
  desc?: string;
  href?: string;
  tone?: 'blue' | 'green' | 'red' | 'gold' | 'violet';
};

const TONE: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-rose-50 text-rose-700',
  gold: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
};

/**
 * 統計數字合併成一張卡（舊版每個數字一張 .summary 卡）
 */
export default function StatStrip({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {stats.map(st => {
        const inner = (
          <div
            className={`rounded-xl px-3 py-3.5 text-center transition ${TONE[st.tone || 'blue']} ${
              st.href ? 'hover:shadow-sm hover:brightness-[0.98]' : ''
            }`}
          >
            <div className="text-2xl font-black leading-none">{st.value}</div>
            <div className="text-sm font-bold mt-1.5">{st.label}</div>
            {st.desc && <div className="text-sm text-slate-500 mt-0.5">{st.desc}</div>}
          </div>
        );
        return st.href ? (
          <Link key={st.label} href={st.href} className="no-underline text-inherit">
            {inner}
          </Link>
        ) : (
          <div key={st.label}>{inner}</div>
        );
      })}
    </section>
  );
}
