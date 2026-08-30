import type { Metadata } from 'next';
import TopNav from '@/components/layout/TopNav';
import BottomNav from '@/components/layout/BottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: '2026 Scout System — 旅團管理系統',
  description: 'Scout System — 多旅團共用的管理平台（© 2026 Scout System）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body>
        <TopNav />
        {children}
        {/* © Copyright */}
        <footer className="pt-2 pb-16 text-center">
          <p className="text-[10px] text-slate-400">© 2026 Scout System · 旅團管理系統</p>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
