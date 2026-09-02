'use client';
import { useState } from 'react';
import Link from 'next/link';

/**
 * MOCK 登入頁（對應 UI 參考 01-login）
 * 純前端展示：不接 GS、不寫 session。按「登入」只跳到 /dashboard 預覽。
 */
export default function MockLogin() {
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24 space-y-6">
      {/* 預覽提示 */}
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        <Link href="/dashboard" className="text-[13px] font-bold text-amber-800 no-underline underline-offset-2">返回控制台預覽 →</Link>
      </div>

      {/* 品牌 */}
      <div className="text-center pt-6">
        <div className="text-7xl text-brand-600 mb-3" aria-hidden>⚜</div>
        <h1 className="text-3xl font-black text-brand-700 leading-tight m-0">2026 童軍系統</h1>
      </div>

      {/* 登入卡 */}
      <section className="space-y-4">
        <h2 className="font-bold text-lg text-slate-800 m-0">歡迎登入</h2>

        <label className="block">
          <span className="block text-[12px] font-semibold text-slate-600 mb-1.5">電郵/帳號</span>
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-3">
            <span className="text-slate-400" aria-hidden>🪪</span>
            <input className="flex-1 border-0 outline-none bg-transparent p-0 text-sm" placeholder="輸入您的電郵或帳號" />
          </div>
        </label>

        <label className="block">
          <span className="block text-[12px] font-semibold text-slate-600 mb-1.5">密碼</span>
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-3">
            <span className="text-slate-400" aria-hidden>🔒</span>
            <input type={showPw ? 'text' : 'password'} className="flex-1 border-0 outline-none bg-transparent p-0 text-sm" placeholder="輸入您的密碼" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="flex items-center gap-1 text-[12px] font-semibold text-slate-600 bg-transparent border-0 cursor-pointer whitespace-nowrap">
              顯示密碼 <span aria-hidden>👁</span>
            </button>
          </div>
        </label>

        <Link href="/dashboard" className="block w-full bg-brand-600 text-white font-black text-base text-center py-3.5 rounded-xl no-underline hover:bg-brand-700 transition">
          登入
        </Link>

        <div className="text-center">
          <button type="button" className="text-[13px] font-semibold text-slate-700 bg-transparent border-0 cursor-pointer">忘記密碼?</button>
        </div>
      </section>

      <div className="pt-16 text-center space-y-1.5">
        <p className="text-[13px] text-slate-700 m-0">
          未有帳號? <Link href="/dashboard" className="font-bold text-brand-700 underline underline-offset-4">申請加入</Link>
        </p>
        {/* 「只睇公開資料」已移除：唔登入都睇到公開行事曆／公告／活動 */}
      </div>
    </div>
  );
}
