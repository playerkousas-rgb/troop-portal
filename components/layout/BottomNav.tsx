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

// 領袖身份：底部 4 個按鈕同成員／家長唔同（行事曆 · 公告 · 點名 · 管理中心）
const LEADER_ROLES = ['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader', 'coach'];
const LEADER_ITEMS: Item[] = [
  { icon: '📅', label: '行事曆', href: '/calendar' },
  { icon: '📢', label: '公告', href: '/notices' },
  { icon: '📝', label: '點名', href: '/attendance' },
  { icon: '🔧', label: '管理中心', href: '/admin' },
];
const DEMO_LEADER_ITEMS: Item[] = [
  { icon: '📅', label: '行事曆', href: '/dashboard/calendar' },
  { icon: '📢', label: '公告', href: '/dashboard/notices' },
  { icon: '📝', label: '點名', href: '/dashboard/attendance' },
  { icon: '🔧', label: '管理中心', href: '/dashboard/admin' },
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
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHasTroop(!!JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null'));
    } catch {
      setHasTroop(false);
    }
    try {
      const u = JSON.parse(localStorage.getItem('scoutsystem2_current_user') || 'null');
      setLoggedIn(!!u);
      setRole(u?.role || null);
    } catch {
      setLoggedIn(false);
      setRole(null);
    }
  }, [pathname]);

  const isLeader = !!role && LEADER_ROLES.includes(role);

  const isDemo = !!pathname?.startsWith('/dashboard');
  // 首頁（登入旅團頁）：底部就係平台資訊 tab —— 模板下載／更新公告
  const isLanding = pathname === '/';

  // 未選旅團又未登入 → 冇嘢可快捷；平台資訊頁一律唔顯示（首頁除外）
  if (!isDemo && !isLanding && (!hasTroop && !loggedIn)) return null;
  if (!isDemo && !isLanding && HIDDEN_PATHS.includes(pathname || '')) return null;

  const items: Item[] = isLanding
    ? [
        { icon: '⬇️', label: '模板下載', href: '/downloads' },
        { icon: '📢', label: '更新公告', href: '/updates' },
      ]
    : isLeader
    ? (isDemo ? DEMO_LEADER_ITEMS : LEADER_ITEMS)
    : [
        ...(isDemo ? DEMO_ITEMS : REAL_ITEMS),
        // 「我的」→ 改名做「主頁」，並且入返自己嘅儀表板（家長／成員空間），
        // 唔再直接跳去個人設定（個人設定喺儀表板右上角）。
        {
          icon: '🏠',
          label: loggedIn ? '主頁' : '登入',
          href: isDemo ? '/dashboard' : loggedIn ? (role === 'parent' ? '/parent' : role === 'member' ? '/member' : '/profile') : '/login',
        },
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
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition no-underline ${
                active ? 'text-brand-700' : 'text-slate-500 hover:text-slate-600'
              }`}
            >
              <span className={`text-2xl transition-transform ${active ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className={`text-sm font-bold ${active ? 'text-brand-700' : ''}`}>{item.label}</span>
              {active && <div className="w-4 h-0.5 bg-brand-600 rounded-full mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
