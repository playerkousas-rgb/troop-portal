'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Auth from '@/components/Auth';
import ConsoleHeader from '@/components/ui/ConsoleHeader';
import StatStrip from '@/components/ui/StatStrip';
import MyEventReplies from '@/components/ui/MyEventReplies';
import { AppState, loadStateSlice, computeStats } from '@/lib/store';
import { ROLE_LABEL, Role, isAdmin } from '@/lib/model';
import { getSession } from '@/lib/session';
import { hasFeature } from '@/lib/permissions';
import { ADMIN_MODULES, ADMIN_MODULE_TOTAL, SYSTEM_MODULE } from '@/lib/adminModules';

/**
 * 管理中心 —— 管理員／團長／支部領袖／教練員共用同一個版面（用戶要求 #9 #11 #13）。
 *
 * 管理員一共 8 個管理項目：
 *   支部管理・使用者管理・行事曆管理・出席管理・活動管理・物資管理・會議管理・系統管理
 *
 * 團長／支部領袖／教練員版面完全一樣，只係：
 *   ・顯示嘅管理項目按權限多寡不同（冇權限嘅項目唔會出現）
 *   ・冇「系統管理」（系統設定／操作紀錄／擴充元件只屬管理員）
 *
 * ★ 已移除底部嗰排小標籤（用戶要求 #1 #4 #5）：
 *   ・「簽到／點名」→ 底部 tab bar 已經有個大按鈕，重複
 *   ・「通告文件（PDF）」→ 通告喺「活動管理」處理
 *   ・「活動統計」→ 統計喺「活動管理」逐個活動入面
 *   ・「操作紀錄」→ 併入「系統管理」（用戶要求 #6）
 * ★ 擴充元件唔再喺領袖控制台顯示，只留管理員右上角（用戶要求 #8 #10 #12）。
 */
// 管理項目清單（含 feature 對照）抽咗去 lib/adminModules.ts，
// 方便 scripts/check-admin-modules.mjs 用後台真實權限驗證每個角色見到邊几张卡。
const FEATURES = ADMIN_MODULES;

export default function Admin() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    loadStateSlice(['users', 'applications', 'events', 'bookmarks', 'userFeatures', 'replies'])
      .then(setS)
      .catch(e => setErr(e.message));
  }, []);
  const stats = s ? computeStats(s) : { users: 0, pending: 0, activities: 0, selfActivities: 0, districtActivities: 0, notices: 0 };

  const session = typeof window === 'undefined' ? null : getSession();
  const emptyData = !!s && !err && (s.users || []).length === 0;
  const role = (session?.role || '') as Role;
  const admin = isAdmin(role);
  const visibleFeatures = FEATURES.filter(f => hasFeature(s?.userFeatures, f.feature, role));
  const canUsers = hasFeature(s?.userFeatures, 'users', role);
  const canApplications = hasFeature(s?.userFeatures, 'applications', role);
  const canEvents = hasFeature(s?.userFeatures, 'events', role);

  return <Auth roles={['super_admin', 'troop_super', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach']}><div className="max-w-5xl mx-auto space-y-4">
    <ConsoleHeader
      icon={admin ? '🛡️' : '🧭'}
      name={session?.name || '管理員'}
      roleLabel={ROLE_LABEL[(session?.role as any) || 'admin']}
      tone={admin ? 'amber' : 'blue'}
      tagline={admin
        ? `管理中心：管理員一共 ${ADMIN_MODULE_TOTAL} 個管理項目。擴充元件喺右上角「⋯」選單。`
        : `管理中心：顯示嘅管理項目按你獲得嘅授權而定；如需其他管理功能，請聯絡旅團管理員或所屬支部團長開啟。`}
    />

    {err && (
      <section className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
        <p className="text-sm text-rose-700 font-bold m-0 whitespace-pre-wrap leading-relaxed">{err}</p>
      </section>
    )}

    {emptyData && (
      <section className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
        <h3 className="text-sm font-black text-rose-800 mt-0 mb-1.5">⚠️ 已登入，但後台沒有回傳任何資料</h3>
        <p className="text-sm text-rose-700 leading-relaxed m-0">
          登入帳號是「{session?.userId || '—'}」，後台卻回傳空的 user 清單。這通常代表
          Google Sheet 的 Apps Script 還沒更新到 <b>3.0-live</b>（舊版不認得超管／STAFF_TOKEN 的身份，會把它當訪客）。
        </p>
      </section>
    )}

    {/* 排列：先活動（內部 → 外部），再人（待審批 → 用戶）。
        每格都直接跳去對應嘅管理頁；冇權限嘅格唔顯示（見到數字但入唔到＝冇用）。 */}
    <StatStrip stats={[
      { label: '旅團活動', value: stats.selfActivities, desc: '內部·已發布', tone: 'green', ...(canEvents ? { href: '/admin/events?tab=self' } : {}) },
      { label: '區地域總會', value: stats.districtActivities, desc: '外部·已發布', tone: 'violet', ...(canEvents ? { href: '/admin/events?tab=district' } : {}) },
      ...(canApplications || canUsers ? [{
        label: '待審批', value: stats.pending, desc: '帳號 / 成員申請', tone: 'red' as const,
        href: canUsers ? '/admin/users?tab=applications' : '/admin/applications',
      }] : []),
      ...(canUsers ? [{ label: '用戶', value: stats.users, desc: '總登記人數', tone: 'blue' as const, href: '/admin/users' }] : []),
    ]} />

    {/* 管理項目（管理員 8 個；其他領袖按權限顯示） */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {visibleFeatures.map(f => (
        <Link key={f.id} href={f.href} className="no-underline text-inherit block group">
          <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3.5 transition group-hover:border-brand-300 group-hover:shadow-md">
            <span className={`w-14 h-14 bg-gradient-to-br ${f.tone} text-white rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow`} aria-hidden>{f.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block font-black text-lg text-slate-800 leading-tight">{f.title}</span>
              <span className="block text-sm text-slate-500 leading-snug mt-0.5">{f.text}</span>
            </span>
            <span className="text-slate-300 group-hover:text-brand-500 font-black text-2xl flex-shrink-0">→</span>
          </div>
        </Link>
      ))}

      {/* 系統管理：只有管理員可見（團長／支部領袖／教練員冇呢張卡） */}
      {admin && (
        <Link href={SYSTEM_MODULE.href} className="no-underline text-inherit block group">
          <div className="h-full bg-white rounded-2xl border border-slate-300 shadow-sm p-4 flex items-center gap-3.5 transition group-hover:border-brand-300 group-hover:shadow-md">
            <span className={`w-14 h-14 bg-gradient-to-br ${SYSTEM_MODULE.tone} text-white rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow`} aria-hidden>{SYSTEM_MODULE.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block font-black text-lg text-slate-800 leading-tight">{SYSTEM_MODULE.title}</span>
              <span className="block text-sm text-slate-500 leading-snug mt-0.5">{SYSTEM_MODULE.text}</span>
            </span>
            <span className="text-slate-300 group-hover:text-brand-500 font-black text-2xl flex-shrink-0">→</span>
          </div>
        </Link>
      )}
    </div>

    {/* 完全冇管理權限（例如未獲授權嘅教練員）：講清楚要搵邊個，唔好留一片空白 */}
    {visibleFeatures.length === 0 && !admin && (
      <section className="bg-white rounded-2xl border border-dashed border-slate-300 p-4">
        <h3 className="text-sm font-black text-slate-800 mt-0 mb-1.5">🔒 你目前未獲授權任何管理項目</h3>
        <p className="text-sm text-slate-600 leading-relaxed m-0">
          管理項目由旅團管理員或所屬支部團長逐項授權（例如活動管理、出席管理、物資管理）。
          獲授權後，對應嘅管理卡會自動出現在這裡。日常點名仍可用底部「📝 點名」。
        </p>
      </section>
    )}

    {/* 我自己嘅出席回覆（收合式，唔搶管理項目嘅位置） */}
    <MyEventReplies state={s} onState={setS} onError={setErr} />
  </div></Auth>;
}
