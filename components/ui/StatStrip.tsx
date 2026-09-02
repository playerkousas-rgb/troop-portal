import Link from 'next/link';

export type Stat = {
  label: string;
  value: number | string;
  desc?: string;
  href?: string;
  tone?: 'blue' | 'green' | 'red' | 'gold' | 'violet' | 'slate';
};

const TONE: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-rose-50 text-rose-700',
  gold: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-600',
};

/** 依格數選欄數：3 / 4 / 5 格都要排得齊，唔會出現最後一格孤零零 */
const COLS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-3',
};

/**
 * 統計數字合併成一張卡（舊版每個數字一張 .summary 卡）
 *
 * 有 href 的格＝可以撳入去對應嘅管理頁；冇 href 就純粹顯示數字。
 * ★ 完全冇權限睇嘅項目請喺呼叫端直接唔好傳入 —— 顯示一個撳唔到的數字
 *   （例如「待審批 3」但入唔到審批頁）對用戶冇幫助。
 */
export default function StatStrip({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;
  const cols = COLS[stats.length] || 'sm:grid-cols-4';
  return (
    <section className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-3 grid grid-cols-2 ${cols} gap-2.5`}>
      {stats.map(st => {
        const inner = (
          <div
            className={`h-full rounded-xl px-3 py-3.5 text-center transition ${TONE[st.tone || 'blue']} ${
              st.href ? 'hover:shadow-sm hover:brightness-[0.98]' : ''
            }`}
          >
            <div className="text-2xl font-black leading-none">{st.value}</div>
            <div className="text-sm font-bold mt-1.5">{st.label}</div>
            {st.desc && <div className="text-sm text-slate-500 mt-0.5">{st.desc}</div>}
          </div>
        );
        return st.href ? (
          <Link key={st.label} href={st.href} className="no-underline text-inherit block">
            {inner}
          </Link>
        ) : (
          <div key={st.label}>{inner}</div>
        );
      })}
    </section>
  );
}
