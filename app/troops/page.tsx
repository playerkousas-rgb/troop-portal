import Link from 'next/link';
import { activeTroops } from '@/lib/troops';

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  active: { label: '✅ 已開通', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  testing: { label: '🧪 測試中', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

/**
 * 已接入旅團（公開展示）
 * 資料來源：lib/troops.ts 的 APPROVED_TROOPS 登記表（由系統管理員維護）。
 * 只顯示旅團名稱、編號、狀態、備註 —— webAppUrl 屬於後台資訊，一律不顯示。
 */
export default function Troops() {
  const troops = activeTroops();

  return (
    <div className="space-y-4">
      {/* ── 頁首 ── */}
      <section className="hero-gradient text-white rounded-3xl px-6 py-8 relative overflow-hidden">
        <div className="absolute right-4 bottom-2 text-[7rem] opacity-[0.07] pointer-events-none select-none leading-none">
          ⚜
        </div>
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-sm font-semibold px-3 py-1 rounded-full border border-white/25">
            🌏 已接入旅團
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-3 mb-0 leading-tight">現已使用 / 測試中的旅團</h1>
          <p className="mt-2 mb-0 text-white/75 text-sm leading-relaxed">
            公開展示可協助推廣，讓其他旅團了解接入情況。選擇旅團後即可查看公開行事曆及活動資訊。
          </p>
        </div>
      </section>

      {/* ── 登記表 ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="font-bold text-sm flex items-center gap-2 m-0">
            <span className="w-7 h-7 bg-brand-600 text-white rounded-lg flex items-center justify-center text-sm">⚜</span>
            旅團登記表
          </h2>
          <span className="text-sm text-slate-500 font-bold">共 {troops.length} 個旅團</span>
        </div>

        {troops.length === 0 ? (
          <p className="text-sm text-slate-500 m-0">暫無已接入旅團，歡迎按下方步骤申請接入。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {troops.map(t => {
              const st = STATUS_STYLE[t.status] || STATUS_STYLE.testing;
              return (
                <div key={t.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        ⚜
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate">{t.name}</div>
                        <div className="text-sm text-slate-500 font-semibold">編號 {t.id}</div>
                      </div>
                    </div>
                    <span
                      className={`text-sm px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  {t.note && <p className="text-sm text-slate-500 mt-2 mb-0 leading-relaxed">{t.note}</p>}
                  <Link
                    href="/"
                    className="inline-flex mt-2.5 text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-1.5 no-underline hover:bg-brand-100 transition"
                  >
                    到首頁選擇此旅團 →
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-sm text-slate-500 mt-3 mb-0">
          💡 登記表由系統管理員維護；旅團後台網址及 API Key 不會顯示在此頁。
        </p>
      </section>

      {/* ── 申請接入 ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h2 className="font-bold text-sm mt-0 mb-1.5">你的旅團未有出現？</h2>
        <p className="text-sm text-slate-500 leading-relaxed mt-0 mb-3">
          代表尚未開通。先照接入教學建立 Google Sheet 後台，再提交接入申請；管理員審核通過後就會加入上面的登記表。
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/setup"
            className="no-underline text-sm font-bold bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition"
          >
            📖 接入教學
          </Link>
          <Link
            href="/onboard"
            className="no-underline text-sm font-bold bg-brand-600 text-white px-3 py-2 rounded-xl hover:bg-brand-700 transition"
          >
            📨 提交接入申請
          </Link>
          <Link
            href="/downloads"
            className="no-underline text-sm font-bold bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition"
          >
            ⬇️ 模板下載
          </Link>
        </div>
      </section>
    </div>
  );
}
