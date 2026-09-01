'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Auth from '@/components/Auth';
import ConsoleHeader from '@/components/ui/ConsoleHeader';
import StatStrip from '@/components/ui/StatStrip';
import { AppState, loadStateSlice, computeStats } from '@/lib/store';
import { ROLE_LABEL } from '@/lib/model';
import { getSession } from '@/lib/session';

/**
 * 管理中心 —— 統一為 6 張卡：
 *   支部管理・使用者管理（合併成員資料庫＋審核申請）・行事曆管理・
 *   出席管理・活動管理（自行舉辦＋區地域總會活動）・物資管理・會議管理。
 * 系統設定改放右上小圖示（TopNav ⚙️）；操作紀錄經系統設定進入。
 */
// blockedFor：該角色開唔到嘅頁面唔會顯示卡片（避免撳落去變「需要合適權限」）
const FEATURES: { id: string; icon: string; title: string; text: string; href: string; tone: string; blockedFor?: string[] }[] = [
  { id: 'branches',  icon: '🏢', title: '支部管理',     text: '管理支部、小隊及啟用狀態。', href: '/admin/branches', tone: 'from-emerald-700 to-emerald-500', blockedFor: ['branch_leader', 'coach'] },
  { id: 'users',     icon: '👥', title: '使用者管理',   text: '帳號、成員資料庫與審核申請（合併）。', href: '/admin/users', tone: 'from-brand-800 to-brand-500', blockedFor: ['coach'] },
  { id: 'calendar',  icon: '📅', title: '行事曆管理',   text: '恆常集會、特別集會及取消；亦可在行事曆直接修改。', href: '/admin/calendar', tone: 'from-sky-700 to-sky-500' },
  { id: 'attendance', icon: '📝', title: '出席管理',   text: '簽到／點名、出席紀錄及統計報表。', href: '/attendance', tone: 'from-teal-700 to-teal-500' },
  { id: 'events',    icon: '🎯', title: '活動管理',     text: '自行舉辦活動 及 區地域總會活動（原圖書館引入）。', href: '/admin/events', tone: 'from-violet-700 to-violet-500' },
  { id: 'equipment', icon: '📦', title: '物資管理',     text: '物資清單、庫存調整、借用批核及歸還。', href: '/admin/equipment', tone: 'from-amber-700 to-amber-500', blockedFor: ['coach'] },
  { id: 'meetings',  icon: '🤝', title: '會議管理',     text: '會議議程、紀錄及文件連結。', href: '/admin/meetings', tone: 'from-rose-700 to-rose-500' },
];

export default function Admin() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { loadStateSlice(['users', 'applications', 'events', 'bookmarks']).then(setS).catch(e => setErr(e.message)) }, []);
  const stats = s ? computeStats(s) : { users: 0, pending: 0, activities: 0, selfActivities: 0, districtActivities: 0, notices: 0 };

  const session = typeof window === 'undefined' ? null : getSession();
  const emptyData = !!s && !err && (s.users || []).length === 0;
  const canUsers = session?.role !== 'coach';

  return <Auth roles={['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader', 'coach']}><div className="max-w-5xl mx-auto space-y-4">
    <ConsoleHeader
      icon="🛡️"
      name={session?.name || '管理員'}
      roleLabel={ROLE_LABEL[(session?.role as any) || 'admin']}
      tone="amber"
      tagline="管理中心：功能卡按你的權限動態顯示。系統設定喺右上角 ⚙️ 小圖示；操作紀錄亦可由系統設定進入。"
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

    <StatStrip stats={[
      { label: '用戶', value: stats.users, desc: '總登記人數', tone: 'blue', ...(canUsers ? { href: '/admin/users' } : {}) },
      { label: '待審批', value: stats.pending, desc: '等待審批申請', tone: 'red', ...(canUsers ? { href: '/admin/users#applications' } : {}) },
      { label: '自行舉辦', value: stats.selfActivities, desc: '已發布活動', tone: 'green', href: '/admin/events' },
      { label: '區地域總會', value: stats.districtActivities, desc: '區／地域／總會活動', tone: 'violet', href: '/admin/events' },
    ]} />

    {/* 功能卡 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {FEATURES.filter(f => !f.blockedFor?.includes(session?.role || '')).map(f => (
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
    </div>

    {/* 工具捷徑：活動統計（統一）・操作紀錄（含審核紀錄）・點名・通告 */}
    <div className="flex flex-wrap gap-2">
      <Link href="/admin/registrations" className="no-underline text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-brand-300 hover:shadow-sm transition">
        📊 活動統計（自行舉辦＝區地域總會＝通告）
      </Link>
      {['super_admin', 'troop_super', 'admin'].includes(session?.role || '') && (
        <Link href="/admin/audit" className="no-underline text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-brand-300 hover:shadow-sm transition">
          📜 操作紀錄（含審核紀錄）
        </Link>
      )}
      <Link href="/attendance" className="no-underline text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-brand-300 hover:shadow-sm transition">
        📝 簽到／點名
      </Link>
      <Link href="/notices" className="no-underline text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-brand-300 hover:shadow-sm transition">
        📢 通告管理
      </Link>
    </div>
  </div></Auth>;
}
