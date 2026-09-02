import type { Metadata } from 'next';

/**
 * /dashboard/** ＝ 公開示範樹（全部假資料）
 *
 * 呢個分支係特登公開嘅：畀有興趣嘅旅團唔使開帳號都可以睇到 APP 點運作。
 * 內容全部係寫死嘅示範資料，唔會連到任何真實旅團後台，所以冇資料外洩風險。
 *
 * 但要 noindex：
 *   1. 避免 Google 收錄咗示範頁，旅團搜尋「XX旅 行事曆」時撞到假資料，
 *      以為係自己旅團嘅真實資訊。
 *   2. 避免示範頁同真實頁（/admin/users vs /dashboard/admin/users）
 *      喺搜尋結果度撞內容，拖低真實頁排名。
 * 示範樹照樣任何人都入到，只係唔會出現喺搜尋結果。
 */
export const metadata: Metadata = {
  title: '功能示範（假資料）— 2026 Scout System',
  description: '示範用的假資料頁面，展示 APP 的運作原理，並非任何旅團的真實資料。',
  robots: { index: false, follow: false },
};

export default function DashboardDemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 示範模式橫額：講清楚呢度全部係假資料，避免有人以為係自己旅團嘅真實資訊 */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
        <p className="m-0 text-sm font-bold text-amber-800">
          🧪 功能示範模式 —— 以下全部為假資料，僅展示系統運作方式，並非任何旅團的真實資料。
        </p>
      </div>
      {children}
    </>
  );
}
