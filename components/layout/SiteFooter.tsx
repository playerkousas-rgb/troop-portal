'use client';

import { usePathname } from 'next/navigation';

/** 首頁的版權列由首頁自己放在快捷列上方，其餘頁面沿用全站 footer。 */
export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  return (
    <footer className="site-footer pt-2 pb-16 text-center">
      <p className="text-[13px] text-slate-500">© 2026 Scout System · 旅團管理系統</p>
    </footer>
  );
}
