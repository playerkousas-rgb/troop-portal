import Link from 'next/link';

/**
 * 旅團管理員可以決定「未登入可唔可以睇公開資料」。
 * 呢個元件喺 PUBLIC_VIEW = FALSE 時，取代公開內容顯示。
 */
export default function PublicLocked({ troopName }: { troopName?: string }) {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-3" aria-hidden>🔒</div>
      <h1 className="text-2xl font-black text-brand-700 mb-2 m-0">本旅團未開放公開瀏覽</h1>
      <p className="text-[13px] text-slate-500 mb-6 leading-relaxed mt-2">
        {troopName ? troopName + ' 的' : ''}行事曆、公告及活動只供已登入成員查看。
        請先登入；如果未有帳號，可向旅團領袖申請，或請旅團管理員喺「系統設定」開放公開瀏覽。
      </p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center bg-brand-600 text-white font-bold px-6 py-3 rounded-xl no-underline hover:bg-brand-700 transition"
      >
        前往登入 →
      </Link>
    </div>
  );
}
