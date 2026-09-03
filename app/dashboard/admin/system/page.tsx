'use client';

import Link from 'next/link';

/**
 * 🛠️ 系統管理（MOCK）—— 鏡像正式版 `app/admin/system/page.tsx`
 *
 * ★ 點解要有呢一頁：
 *   正式版管理中心嘅「系統管理」卡指去 `/admin/system` 呢個 **hub**，
 *   由 hub 再連去系統設定／操作紀錄／擴充元件／元件市場／轉駁中心。
 *   但 demo 樹嘅「系統管理」卡原本**直接指去 leaf 頁** `/dashboard/admin/audit`
 *   （審核紀錄），而嗰頁一條 href 都冇 → 結果 demo 樹有 5 個頁面
 *   （settings／plugins／branches／marketplace／connectors）**完全冇入站連結**，
 *   用戶永遠到唔到。呢一頁就係補返嗰條接線。
 *
 * ★ 用戶要求：MOCK 係示範頁，要同真實 UI 對得上 —— 所以結構照抄正式版。
 */
const ITEMS = [
  { icon: '⚙️', title: '系統設定', text: '服務開關（系統鎖定）、公開瀏覽、Drive 資料夾及 API 連線。', href: '/dashboard/admin/settings' },
  { icon: '📜', title: '操作紀錄', text: '所有操作紀錄（含申請審核／批核），按類別分類方便追查。', href: '/dashboard/admin/audit' },
  { icon: '🔌', title: '擴充元件設定', text: '已安裝 2／3 級元件嘅網址與金鑰，逐個單位元件開關。', href: '/dashboard/admin/plugins' },
  { icon: '🧩', title: '元件市場', text: '瀏覽及安裝新嘅擴充元件（Registry）。', href: '/dashboard/marketplace' },
  { icon: '🔀', title: '轉駁中心', text: '連接外部系統（轉駁／整合設定）。', href: '/dashboard/connectors' },
  {
    icon: '🏢',
    title: '支部與小隊設定',
    // ★ 正式版呢張卡喺管理中心（lib/adminModules.ts 嘅 branches module）。
    //   demo 樹嘅管理中心刻意冇呢張卡（見 app/dashboard/admin/page.tsx 底部註解：
    //   「支部及小隊已併入帳戶管理」），但頁面本身仍然存在。
    //   挂喺呢度令佢可達；如果要跟 demo 嘅設計刪除呢頁，改呢一行就得。
    text: '各支部人數、小隊編制及分隊方式（帳戶管理頁亦可逐個成員改）。',
    href: '/dashboard/admin/branches',
  },
] as const;

export default function MockSystemManagement() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/dashboard/admin" className="text-[13px] font-bold text-slate-500 no-underline hover:text-brand-700">← 返回管理中心</Link>
          <h1 className="font-bold text-lg m-0 mt-1">🛠️ 系統管理</h1>
          <p className="text-[13px] text-slate-500 m-0 mt-1">
            系統設定、操作紀錄（含審核紀錄）及擴充元件。呢啲屬系統層面嘅管理，只限管理員使用。
          </p>
        </div>
        <span className="text-[13px] font-black bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2.5 py-1 whitespace-nowrap">🎨 MOCK</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ITEMS.map(it => (
          <Link key={it.title} href={it.href} className="no-underline text-inherit group">
            <div className="h-full bg-white rounded-2xl border border-slate-200 p-3.5 flex items-start gap-3 transition group-hover:border-brand-300 group-hover:shadow-md">
              <span className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-xl flex-shrink-0" aria-hidden>{it.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[13px] text-slate-800 leading-tight">{it.title}</span>
                <span className="block text-[13px] text-slate-500 leading-snug mt-1">{it.text}</span>
              </span>
              <span className="text-slate-300 group-hover:text-brand-600 font-black flex-shrink-0">→</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
