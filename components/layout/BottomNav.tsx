'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Item = { icon: string; label: string; href: string };

// 真實頁面（登入後實際使用的路由）
// 順序對照 UI 參考：📅 行事曆 · 📢 公告 · 🎯 活動 · 👤 我的
const REAL_ITEMS: Item[] = [
  { icon: '📅', label: '行事曆', href: '/calendar' },
  { icon: '📢', label: '公告', href: '/notices' },
  { icon: '🎯', label: '活動', href: '/activities' },
];

// /dashboard/** 模擬展示樹：維持原有 demo 連結，唔影響展示頁
const DEMO_ITEMS: Item[] = [
  { icon: '📅', label: '行事曆', href: '/dashboard/calendar' },
  { icon: '📢', label: '公告', href: '/dashboard/notices' },
  { icon: '🎯', label: '活動', href: '/dashboard/activities' },
];

// 平台資訊／接入流程頁面唔需要 tab bar
const HIDDEN_PATHS = ['/', '/setup', '/onboard', '/downloads', '/troops', '/updates', '/marketplace', '/connectors'];

/**
 * 底部 4 個快捷 tab（移動優先）
 * 舊版只在 /dashboard/** 顯示、且全部連去 mock 展示樹，
 * 真實控制台（/admin /member /leader /parent /calendar …）永遠睇唔到。
 * 現在：已選旅團或已登入 → 全站顯示，並連去真實路由。
 */
export default function BottomNav() {
  const pathname = usePathname();
  const [hasTroop, setHasTroop] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    try {
      setHasTroop(!!JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null'));
    } catch {
      setHasTroop(false);
    }
    try {
      setLoggedIn(!!JSON.parse(localStorage.getItem('scoutsystem2_current_user') || 'null'));
    } catch {
      setLoggedIn(false);
    }
  }, [pathname]);

  const isDemo = !!pathname?.startsWith('/dashboard');

  // 未選旅團又未登入 → 冇嘢可快捷；平台資訊頁一律唔顯示
  if (!isDemo && (!hasTroop && !loggedIn)) return null;
  if (!isDemo && HIDDEN_PATHS.includes(pathname || '')) return null;

  const items: Item[] = [
    ...(isDemo ? DEMO_ITEMS : REAL_ITEMS),
    { icon: '👤', label: '我的', href: isDemo ? '/dashboard/profile' : loggedIn ? '/profile' : '/login' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-lg">
      <div className="max-w-lg mx-auto flex">
        {items.map(item => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition no-underline ${
                active ? 'text-brand-700' : 'text-slate-500 hover:text-slate-600'
              }`}
            >
              <span className={`text-xl transition-transform ${active ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className={`text-[11px] font-bold ${active ? 'text-brand-700' : ''}`}>{item.label}</span>
              {active && <div className="w-4 h-0.5 bg-brand-600 rounded-full mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
