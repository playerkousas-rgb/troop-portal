'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Auth from '@/components/Auth';
import ConsoleHeader from '@/components/ui/ConsoleHeader';
import StatStrip from '@/components/ui/StatStrip';
import ToolGroup, { ConsoleTool } from '@/components/ui/ToolGroup';
import { AppState, loadStateSlice, computeStats } from '@/lib/store';
import { ROLE_LABEL } from '@/lib/model';
import { getSession } from '@/lib/session';

// 功能定義：未來插件也會動態加入
const FEATURE_DEFS: Record<string, { title: string; icon: string; text: string; href: string }> = {
  branches:       { title:'支部管理', icon:'🏢', text:'管理支部及小隊。', href:'/admin/branches' },
  members:        { title:'成員資料庫', icon:'👥', text:'新增、編輯、連結家長。', href:'/admin/members' },
  applications:   { title:'審核 / 申請管理', icon:'✅', text:'審核申請，批核後自動建帳號。', href:'/admin/applications' },
  users:          { title:'使用者管理', icon:'👤', text:'帳號、角色、功能權限分配。', href:'/admin/users' },
  events:         { title:'活動管理', icon:'🗓️', text:'新增、編輯、發布活動。', href:'/admin/events' },
  registrations:  { title:'報名管理', icon:'📋', text:'旅團及外間活動的報名狀態、付款與匯出。', href:'/admin/registrations' },
  attendance:     { title:'簽到／點名', icon:'📝', text:'日常集會及旅團自辦活動的實際出席（P／A／L／E／S）。', href:'/attendance' },
  calendar:       { title:'行事曆管理', icon:'📅', text:'恆常集會、特別集會。', href:'/admin/calendar' },
  notices:        { title:'通告管理', icon:'📄', text:'上傳通告、Drive PDF。', href:'/notices' },
  library_import: { title:'圖書館引入', icon:'📚', text:'由通告圖書館引入。', href:'/library/import' },
  equipment:      { title:'物資借用管理', icon:'📦', text:'物資清單、庫存調整、借用批核及歸還。', href:'/admin/equipment' },
  meetings:       { title:'會議管理', icon:'🤝', text:'會議議程及紀錄。', href:'/admin/meetings' },
  audit:          { title:'審核紀錄', icon:'📜', text:'所有操作紀錄。', href:'/admin/audit' },
  settings:       { title:'系統設定', icon:'⚙️', text:'SystemConfig。', href:'/admin/settings' },
  plugins:        { title:'元件管理', icon:'🧩', text:'設定 2/3 級元件網址與金鑰。', href:'/admin/plugins' },
};

// 同類功能歸類成一張大卡（可收合）—— 取代舊版 15 張獨立功能卡
const FEATURE_GROUPS: { id: string; icon: string; title: string; subtitle: string; tone: 'emerald' | 'blue' | 'amber' | 'violet' | 'slate'; keys: string[] }[] = [
  { id: 'people',     icon: '👥', title: '成員與帳號', subtitle: '支部 · 成員 · 申請 · 權限', tone: 'emerald', keys: ['branches', 'members', 'applications', 'users'] },
  { id: 'events',     icon: '🎯', title: '活動與報名', subtitle: '活動 · 報名 · 點名 · 行事曆', tone: 'blue',    keys: ['events', 'registrations', 'attendance', 'calendar'] },
  { id: 'resources',  icon: '📦', title: '通告與物資', subtitle: '通告 · 圖書館 · 借用物資', tone: 'amber',   keys: ['notices', 'library_import', 'equipment'] },
  { id: 'governance', icon: '🤝', title: '會議與紀錄', subtitle: '會議議程 · 審核紀錄', tone: 'violet',  keys: ['meetings', 'audit'] },
  { id: 'system',     icon: '⚙️', title: '系統設定',   subtitle: 'SystemConfig · 元件', tone: 'slate',   keys: ['settings', 'plugins'] },
];

export default function Admin(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');
  // 按需載入：管理摘要（computeStats 用到 users/applications/events/bookmarks）
  useEffect(()=>{loadStateSlice(['users','applications','events','bookmarks']).then(setS).catch(e=>setErr(e.message))},[]);
  const stats=s?computeStats(s):{users:0,pending:0,activities:0,notices:0};

  let features = s?.userFeatures || [];

  if (features.length === 0 && (s?.users[0]?.role === 'admin' || s?.users[0]?.role === 'super_admin' || s?.users[0]?.role === 'troop_super')) {
    features = Object.keys(FEATURE_DEFS);
  }

  const allowed = (key: string) => features.includes(key);

  const groups = FEATURE_GROUPS.map(g => ({
    ...g,
    tools: g.keys
      .filter(allowed)
      .map(k => {
        const def = FEATURE_DEFS[k];
        return {
          id: k,
          icon: def.icon,
          label: def.title,
          desc: def.text,
          href: def.href,
          badge: k === 'applications' && stats.pending > 0 ? String(stats.pending) : undefined,
        } as ConsoleTool;
      }),
  })).filter(g => g.tools.length > 0);

  const session = typeof window === 'undefined' ? null : getSession();
  // 已登入、但後台什麼資料都沒給 → 幾乎一定是 GS 版本太舊（未重新部署）或 API Key 不符
  const emptyData = !!s && !err && (s.users || []).length === 0;

  return <Auth roles={['super_admin','troop_super','admin','group_leader','branch_leader','coach']}><div className="space-y-3">
    <ConsoleHeader
      icon="🛡️"
      name={s?.users[0]?.name || '管理員'}
      roleLabel={ROLE_LABEL[s?.users[0]?.role || 'admin']}
      tone="amber"
      tagline="功能卡按你的權限動態顯示，同類功能已歸類在同一張大卡內，可按標題收合。"
      action={
        <Link href="/profile" className="no-underline text-[11px] font-bold bg-white/95 text-slate-800 px-3 py-2 rounded-xl hover:bg-white transition whitespace-nowrap">
          👤 個人設定
        </Link>
      }
    />

    {err && (
      <section className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
        <p className="text-xs text-rose-700 font-bold m-0 whitespace-pre-wrap leading-relaxed">{err}</p>
      </section>
    )}

    {emptyData && (
      <section className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
        <h3 className="text-sm font-black text-rose-800 mt-0 mb-1.5">⚠️ 已登入，但後台沒有回傳任何資料</h3>
        <p className="text-[11px] text-rose-700 leading-relaxed m-0">
          登入帳號是「{session?.userId || '—'}」，後台卻回傳空的 user 清單。這通常代表
          Google Sheet 的 Apps Script 還沒更新到 <b>3.0-live</b>（舊版不認得超管／STAFF_TOKEN 的身份，會把它當訪客）。
        </p>
        <ol className="text-[11px] text-rose-700 leading-relaxed mt-2 mb-0 pl-5 list-decimal">
          <li>把 <code className="bg-white/70 border border-rose-200 rounded px-1 py-0.5 font-mono">gs/SCOUTSYSTEM_2_SETUP.gs</code> 整份貼回 Script Editor</li>
          <li>Deploy → Manage deployments → 新增版本（Who has access = <b>Anyone</b>）</li>
          <li>回登入頁按「🩺 連線檢查」，確認「後台版本」是 3.0-live</li>
        </ol>
      </section>
    )}

    <StatStrip stats={[
      { label: '用戶', value: stats.users, desc: '總登記人數', tone: 'blue', href: '/admin/users' },
      { label: '待審批', value: stats.pending, desc: '等待審批', tone: 'red', href: '/admin/applications' },
      { label: '活動', value: stats.activities, desc: '已發布', tone: 'green', href: '/admin/events' },
      { label: '通告', value: stats.notices, desc: '通告數', tone: 'gold', href: '/notices' },
    ]} />

    {groups.map(g => (
      <ToolGroup key={g.id} icon={g.icon} title={g.title} subtitle={g.subtitle} tone={g.tone} tools={g.tools} />
    ))}
  </div></Auth>;
}
