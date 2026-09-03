'use client';

import Link from 'next/link';

// 頂部只顯示需要領袖採取行動的項目，避免把資料統計誤當成待辦事項。
const STATS = [
  { icon: '👤', label: '帳戶申請', value: '2', note: '等候批核', tone: 'rose' },
  { icon: '🎯', label: '活動待處理', value: '3', note: '報名／想考章回覆', tone: 'amber' },
  { icon: '📦', label: '物資借用', value: '1', note: '等候批核', tone: 'orange' },
] as const;

const MODULES = [
  { icon: '🎯', title: '活動管理', subtitle: '活動通告 · 過期區', detail: '旅團活動／區地域總會活動', href: '/dashboard/activities', tone: 'blue' },
  { icon: '📅', title: '行事曆管理', subtitle: '集會 · 活動 · 標籤', detail: '直接新增、修改及取消', href: '/dashboard/calendar', tone: 'emerald' },
  { icon: '🎫', title: '報名管理', subtitle: '回覆 · 名額 · 付款', detail: '按活動查看報名名單', href: '/dashboard/admin/registrations', tone: 'violet' },
  { icon: '🤝', title: '會議管理', subtitle: '議程 · 紀錄 · 文件', detail: '領袖會議及相關附件', href: '/dashboard/meetings', tone: 'amber' },
  { icon: '📦', title: '物資管理', subtitle: '清單 · 借用 · 庫存', detail: '審批借用及追蹤歸還', href: '/dashboard/admin/equipment', tone: 'orange' },
  { icon: '📷', title: '相簿管理', subtitle: '相片 · 分支權限', detail: '活動完結後補上相簿連結（通告與相片分開處理）', href: '/dashboard/admin/albums', tone: 'violet' },
  { icon: '👤', title: '帳戶管理', subtitle: '成員 · 家長 · 權限', detail: '帳號、角色、支部小隊資料及申請審核', href: '/dashboard/admin/users', tone: 'slate' },
  // 系統管理：由舊版管理中心底部嘅「操作紀錄」小標籤升級而成（用戶要求 #6）
  { icon: '🛠️', title: '系統管理', subtitle: '設定 · 操作紀錄 · 元件', detail: '系統設定、操作紀錄（含審核紀錄）及擴充元件', href: '/dashboard/admin/audit', tone: 'slate' },
] as const;

const toneStyles: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  violet: 'bg-violet-50 border-violet-200 text-violet-800',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  orange: 'bg-orange-50 border-orange-200 text-orange-800',
  slate: 'bg-slate-50 border-slate-200 text-slate-800',
  rose: 'bg-rose-50 border-rose-200 text-rose-800',
};

export default function MockAdminCenter() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-4 pb-24 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/dashboard" className="text-[13px] font-bold text-slate-500 no-underline hover:text-brand-700">← 返回控制台</Link>
          <h1 className="font-black text-xl text-slate-900 m-0 mt-1">🔧 管理中心</h1>
          <p className="text-[13px] text-slate-500 m-0 mt-1">管理權人士可在這裡進入各項管理；日常操作仍可在行事曆、最新消息及活動頁直接處理。</p>
        </div>
        <span className="text-[13px] font-black bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2.5 py-1">🎨 MOCK 管理中心</span>
      </div>

      {/* 統計永遠置頂 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-sm text-slate-800 m-0">旅團概況</h2>
          <span className="text-[13px] text-slate-500">更新於剛才</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {STATS.map(stat => (
            <div key={stat.label} className={`rounded-2xl border p-3 ${toneStyles[stat.tone]}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl" aria-hidden>{stat.icon}</span>
                <span className="text-2xl font-black leading-none">{stat.value}</span>
              </div>
              <div className="font-bold text-xs mt-2">{stat.label}</div>
              <div className="text-[13px] opacity-75 mt-0.5">{stat.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 管理項目（管理員一共 8 個） */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-bold text-sm text-slate-800 m-0">管理項目</h2>
            <p className="text-[13px] text-slate-500 m-0 mt-1">點擊卡片直接進入管理頁面</p>
          </div>
          <span className="text-[13px] font-bold text-slate-400">{MODULES.length} 個管理項目</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {MODULES.map(module => (
            <Link key={module.title} href={module.href} className="no-underline text-inherit group">
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${toneStyles[module.tone]}`} aria-hidden>{module.icon}</div>
                <div className="flex items-start justify-between gap-2 mt-3">
                  <div>
                    <h3 className="font-bold text-[13px] text-slate-800 m-0">{module.title}</h3>
                    <p className="text-[13px] text-brand-700 font-bold m-0 mt-1">{module.subtitle}</p>
                  </div>
                  <span className="text-slate-400 group-hover:text-brand-600 font-black">→</span>
                </div>
                <p className="text-[13px] text-slate-500 m-0 mt-1.5 leading-relaxed">{module.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ★ 底部嗰排小標籤已移除（用戶要求 #1 #4 #5 #6）：
          「批核中心」已併入帳戶管理、「系統設定／操作紀錄」已併入系統管理、
          「支部及小隊」已併入帳戶管理 —— 管理中心只保留清一色嘅管理卡。 */}
    </main>
  );
}
