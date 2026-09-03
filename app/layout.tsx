import type { Metadata } from 'next';
import TopNav from '@/components/layout/TopNav';
import LatestNewsBar from '@/components/LatestNewsBar';
import BackButton from '@/components/layout/BackButton';
import BottomNav from '@/components/layout/BottomNav';
import SiteFooter from '@/components/layout/SiteFooter';
import ConfirmProvider from '@/components/ConfirmProvider';
import './globals.css';

export const metadata: Metadata = {
  title: '2026 Scout System — 旅團管理系統',
  description: 'Scout System — 多旅團共用的管理平台（© 2026 Scout System）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body>
        <ConfirmProvider>
          <TopNav />
          <LatestNewsBar />
          <main className="page-container">
            {/* 全站「← 返回」：用戶要求每個版面都要有返回按鈕（首頁本身係入口，唔顯示） */}
            <BackButton />
            {children}
          </main>
          <SiteFooter />
          <BottomNav />
        </ConfirmProvider>
      </body>
    </html>
  );
}
