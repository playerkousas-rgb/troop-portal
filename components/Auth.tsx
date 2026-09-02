'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSession, Session } from '@/lib/session';
import { Role } from '@/lib/model';

/**
 * 頁面守衛。
 *
 * ⚠️ 曾經有個後門：`role === 'member' && specialRole` 會繞過所有角色檢查，
 *    即係任何執委／管委自動有齊全系統權限（包括使用者管理、系統設定），
 *    換屆變返普通成員之前一直有。已經移除 —— 執委／管委而家當作「該支部教練員」，
 *    見到管理卡片但要團長逐項授權先入到，同一般教練員一致。
 */
export default function Auth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(() => setS(getSession()), []);

  if (s === undefined) return <div className="card">載入中...</div>;

  const allowed = !!s && (!roles || roles.includes(s.role));
  if (allowed) return <>{children}</>;

  // 已登入但權限不足 → 講清楚要搵邊個，唔好淨係話「需要登入」
  if (s && s.role !== 'guest') {
    const isHelper = s.role === 'coach' || (s.role === 'member' && !!(s as any).specialRole);
    return (
      <section className="hero">
        <span className="badge red">未獲授權</span>
        <h1>🔒 此功能需要團長授權</h1>
        <p>
          {isHelper
            ? '你目前的身份未獲授權使用此功能。教練員／執委／管委的管理權限，需要由所屬支部的團長或管理員逐項開啟（並只限該支部）。'
            : '你的帳號未有使用此功能的權限，請聯絡旅團管理員或團長。'}
        </p>
        <Link className="btn primary" href="/">返回主頁</Link>
      </section>
    );
  }

  return (
    <section className="hero">
      <span className="badge red">需要登入</span>
      <h1>需要合適權限</h1>
      <p>請先登入旅團，或切換到有權限的示範角色。</p>
      <Link className="btn primary" href="/login">前往登入</Link>
    </section>
  );
}
