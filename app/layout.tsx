import type { Metadata } from 'next';
import TopNav from '@/components/layout/TopNav';
import LatestNewsBar from '@/components/LatestNewsBar';
import BottomNav from '@/components/layout/BottomNav';
import SiteFooter from '@/components/layout/SiteFooter';
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
        <LatestNewsBar />
        <main className="page-container">{children}</main>
        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
