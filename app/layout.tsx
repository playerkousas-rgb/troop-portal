import type { Metadata } from 'next';
import TopNav from '@/components/layout/TopNav';
import BottomNav from '@/components/layout/BottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: '2026 旅團管理系統',
  description: '多旅團共用的管理平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body>
        <TopNav />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
