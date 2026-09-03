'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { dashboardFor, getSession } from '@/lib/session';
import { Role } from '@/lib/model';

/**
 * 全站「← 返回」按鈕（用戶要求：各版面都要有返回按鈕）
 *
 * 點下去嘅行為：
 *   1. 如果呢個分頁曾經喺 APP 內跳過頁 → 返回上一頁（router.back()）
 *   2. 如果係直接開連結／新分頁入嚟（冇 APP 內歷史）→ 返回自己嘅控制台／主頁
 *      （唔會用 router.back() 跳去 Google，亦唔會因為 history.length 誤判）
 *
 * 歷史記錄用 sessionStorage 記「本分頁喺 APP 內行過幾多個路由」：
 *   document.referrer / window.history.length 都唔可靠 —— 前者喺 SPA 內部跳頁
 *   唔會更新，後者連外部網站嘅歷史一齊計。
 */

const NAV_COUNT_KEY = 'scoutsystem2_nav_count';
/** 呢啲頁面本身就係入口，冇「上一頁」可言 → 唔顯示返回按鈕 */
const NO_BACK_PATHS = ['/'];

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [depth, setDepth] = useState(0);

  // 每次路由改變就 +1；第一次（首次載入）＝1，代表仲未有 APP 內歷史
  useEffect(() => {
    let n = 1;
    try { n = Number(sessionStorage.getItem(NAV_COUNT_KEY) || '0') + 1; } catch {}
    try { sessionStorage.setItem(NAV_COUNT_KEY, String(n)); } catch {}
    setDepth(n);
  }, [pathname]);

  if (NO_BACK_PATHS.includes(pathname || '')) return null;

  function home() {
    const role = (getSession()?.role || 'guest') as Role;
    return role === 'guest' ? '/' : dashboardFor(role);
  }

  function goBack() {
    // depth > 1 ＝ 本分頁曾經喺 APP 內跳過頁，先至有「上一頁」可返
    if (depth > 1) router.back();
    else router.replace(home());
  }

  return (
    <div className="max-w-5xl mx-auto pb-2">
      <button
        type="button"
        onClick={goBack}
        title={depth > 1 ? '返回上一頁' : '返回我的主頁'}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-full px-3.5 py-2 shadow-sm hover:border-brand-300 hover:text-brand-700 transition cursor-pointer"
      >
        <span aria-hidden>←</span> 返回
      </button>
    </div>
  );
}
