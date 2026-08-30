'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { icon: '📅', label: '行事曆', href: '/dashboard/calendar' },
  { icon: '📢', label: '公告', href: '/dashboard/notices' },
  { icon: '🎯', label: '活動', href: '/dashboard/activities' },
  { icon: '👤', label: '我的', href: '/dashboard/profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  // 只在 dashboard 區域顯示
  if (!pathname?.startsWith('/dashboard')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-lg">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(item => {
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
