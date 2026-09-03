'use client';
import Link from 'next/link';
import Auth from '@/components/Auth';

/**
 * 🛠️ 系統管理 —— 管理員專用（用戶要求 #6 #9）
 *
 * 由來：管理中心底部原本有一排小標籤，其中「📜 操作紀錄（含審核紀錄）」
 * 其實屬於系統層面嘅嘢。而家把它同「系統設定」「擴充元件」一齊收成
 * 一個管理項目「系統管理」，管理中心就係清一色 8 個管理卡。
 *
 * 團長／支部領袖／教練員睇唔到呢張卡（亦入唔到呢一頁）。
 */
const ITEMS: { icon: string; title: string; text: string; href: string; external?: boolean }[] = [
  { icon: '⚙️', title: '系統設定', text: '服務開關（系統鎖定）、公開瀏覽、Drive 資料夾及 API 連線。', href: '/admin/settings' },
  { icon: '📜', title: '操作紀錄', text: '所有操作紀錄（含申請審核／批核），按類別分類方便追查。', href: '/admin/audit' },
  { icon: '🔌', title: '擴充元件設定', text: '已安裝 2／3 級元件嘅網址與金鑰，逐個單位元件開關。', href: '/admin/plugins' },
  { icon: '🧩', title: '元件市場', text: '瀏覽及安裝新嘅擴充元件（Registry）。', href: '/marketplace' },
  { icon: '🔀', title: '轉駁中心', text: '連接外部系統（轉駁／整合設定）。', href: '/connectors' },
];

export default function SystemManagement() {
  return (
    <Auth roles={['super_admin', 'troop_super', 'troop_leader', 'admin']}>
      <div className="max-w-3xl mx-auto space-y-4">
        <section className="bg-gradient-to-br from-slate-800 to-slate-600 text-white rounded-2xl px-5 py-5 shadow-lg">
          <h1 className="font-black text-2xl leading-tight m-0">🛠️ 系統管理</h1>
          <p className="text-base text-white/85 mt-1.5 mb-0 leading-relaxed">
            系統設定、操作紀錄（含審核紀錄）及擴充元件。呢啲屬系統層面嘅管理，只限管理員使用。
          </p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ITEMS.map(it => (
            <Link key={it.title} href={it.href} className="no-underline text-inherit block group">
              <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start gap-3.5 transition group-hover:border-brand-300 group-hover:shadow-md">
                <span className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" aria-hidden>{it.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-black text-base text-slate-800 leading-tight">{it.title}</span>
                  <span className="block text-sm text-slate-500 leading-snug mt-1">{it.text}</span>
                </span>
                <span className="text-slate-300 group-hover:text-brand-500 font-black text-xl flex-shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-sm text-slate-500 m-0">
          ← 返回管理中心：<Link href="/admin" className="font-bold text-brand-700">管理中心</Link>
        </p>
      </div>
    </Auth>
  );
}
