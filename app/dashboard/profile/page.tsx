'use client';
import Link from 'next/link';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   模擬資料
   ═══════════════════════════════════════════════════ */

type Role = 'super_admin' | 'admin' | 'group_leader' | 'branch_leader' | 'coach' | 'parent' | 'member';
const ROLE_LABEL: Record<Role, string> = {
  super_admin: '技術測試', admin: '管理員', group_leader: '團長',
  branch_leader: '支部領袖', coach: '教練員', parent: '家長', member: '成員',
};

const MY_PROFILE = {
  name: '王小明', ymNumber: '1234567890', branch: '童軍支部', patrol: 'TIGER 小隊', age: 13,
  parentName: '王爸爸', parentEmail: 'parent@example.com',
  emergencyContactName: '王爸爸', emergencyContactPhone: '9123-4567',
};

// 活動（已報名 + 待回覆）
const MY_REGISTRATIONS = [
  { title: '旅團露營', date: '9月20-21日', time: '09:00', location: '西貢白沙灣', status: 'registered' as const, paid: 'confirmed' as const, fee: '$300', deadline: '9月15日' },
  { title: '區運會', date: '10月5日', time: '08:30', location: '九龍公園', status: 'registered' as const, paid: 'pending' as const, fee: '$50', deadline: '9月28日' },
  { title: '親子活動', date: '10月12日', time: '10:00', location: '大埔', status: 'interested' as const, paid: 'unpaid' as const, fee: '$80', deadline: '10月5日' },
];

// 已結束的活動（只限內部、自己參加過的）
const PAST_ACTIVITIES = [
  { title: '8月旅團集會', date: '8月24日', location: '旅團部', status: 'attended' as const },
  { title: '暑期露營', date: '7月15-16日', location: '創興水上活動中心', status: 'attended' as const },
];

// 幼童軍支部（b2）年紀細，想考的章由家長代填；其他支部由成員自己填
const CHILDREN = [
  { id: 'c1', name: '王大明', ymNumber: '1234567890', branch: '童軍', branchId: 'b3', patrol: 'TIGER', age: 13, badges: [
    { name: '世界環保章', note: '想在今年完成', read: true },
  ] as Badge[] },
  { id: 'c2', name: '王小明', ymNumber: '0987654321', branch: '幼童軍', branchId: 'b2', patrol: 'RED', age: 9, badges: [
    { name: '幼童軍天象章', note: '想學觀星', read: false },
  ] as Badge[] },
];

type Badge = { name: string; note: string; read: boolean };

const MY_BADGES = [
  { name: '世界環保章', note: '想在今年完成', read: true },
  { name: '社區服務章', note: '想做探訪老人院', read: false },
];

const SUPPLIES = [
  { id: 's1', name: '帳篷 (大型)', status: 'borrowed' as const, borrowDate: '2026-08-20', returnDate: '2026-09-05' },
];

// 領袖管理資料
const APPROVALS = [
  { type: '帳號申請', count: 1, icon: '👤' },
  { type: '成員申請', count: 1, icon: '🧒' },
  { type: '家長申請', count: 0, icon: '👨‍👩‍👧' },
  { type: '物資借用', count: 0, icon: '📦' },
];

const ACTIVITIES_OVERVIEW = [
  { id: 'a1', title: '旅團露營', date: '9月20-21日', type: 'internal' as const, registered: 32, interested: 8, pending: 12, paid: 28, deadline: '9月15日', expired: false },
  { id: 'a2', title: '區運會', date: '10月5日', type: 'internal' as const, registered: 18, interested: 3, pending: 22, paid: 10, deadline: '9月28日', expired: false },
  { id: 'a3', title: '總區領袖訓練', date: '9月28日', type: 'external' as const, registered: 5, interested: 2, pending: 8, paid: 5, deadline: '已過期', expired: true },
];

const BRANCH_STATS = [
  { id: 'b2', name: '幼童軍', members: 22, patrols: 4, patrolDetail: [{ name: 'RED', count: 6 }, { name: 'YELLOW', count: 5 }, { name: 'BLUE', count: 6 }, { name: 'GREEN', count: 5 }] },
  { id: 'b3', name: '童軍', members: 28, patrols: 3, patrolDetail: [{ name: 'TIGER', count: 10, leader: '張小明' }, { name: 'SEAGULL', count: 9, leader: '李美玲' }, { name: 'WOLF', count: 9, leader: '黃偉' }] },
];

const MEETINGS = [
  { id: 'm1', title: '9月份領袖會議', date: '9月10日', time: '19:00', location: '旅團部', status: 'upcoming', files: 3 },
  { id: 'm2', title: '週年大會', date: '10月15日', time: '14:00', location: '社區中心', status: 'upcoming', files: 0 },
];

/* ═══════════════════════════════════════════════════
   主頁面
   ═══════════════════════════════════════════════════ */

export default function ProfilePage() {
  const [role, setRole] = useState<Role>('member');
  const [tab, setTab] = useState<'dashboard' | 'info' | 'children' | 'badges' | 'supplies' | 'password'>('dashboard');
  const [showPast, setShowPast] = useState(false);
  const [children, setChildren] = useState(CHILDREN);
  const [badgeChildId, setBadgeChildId] = useState('');
  const [badgeName, setBadgeName] = useState('');
  const [badgeNote, setBadgeNote] = useState('');

  function addChildBadge(childId: string) {
    const name = badgeName.trim();
    if (!name) return;
    setChildren(prev => prev.map(c => c.id === childId
      ? { ...c, badges: [...c.badges, { name, note: badgeNote.trim(), read: false }] }
      : c));
    setBadgeName('');
    setBadgeNote('');
  }

  const isManager = ['admin', 'super_admin', 'group_leader', 'branch_leader'].includes(role);
  const isLeader = ['admin', 'super_admin', 'group_leader', 'branch_leader', 'coach'].includes(role);
  const isParent = role === 'parent';
  const isMember = role === 'member';
  const isParentOrMember = isParent || isMember;

  // 家長/成員的 tabs
  // 家長：睇子女資料；不能借物資、冇自己嘅「想考的章」（想考的章係成員自己填）
  const MEMBER_TABS = [
    { id: 'dashboard' as const, icon: '🏠', label: '概覽' },
    { id: 'info' as const, icon: '👤', label: '基本資料' },
    ...(isParent
      ? [{ id: 'children' as const, icon: '👨‍👩‍👧', label: '子女' }]
      : [
          { id: 'badges' as const, icon: '🎖️', label: '想考的章' },
          { id: 'supplies' as const, icon: '📦', label: '借物資' },
        ]),
    { id: 'password' as const, icon: '🔑', label: '改密碼' },
  ];

  // 領袖只需要 dashboard（管理卡片直接顯示）
  // 但也可以看個人資料等
  const LEADER_TABS = [
    { id: 'dashboard' as const, icon: '🏠', label: '控制台' },
    { id: 'info' as const, icon: '👤', label: '我的資料' },
    { id: 'password' as const, icon: '🔑', label: '改密碼' },
  ];

  const currentTabs = isLeader ? LEADER_TABS : MEMBER_TABS;
  const currentRoleName = ROLE_LABEL[role];

  return (
    <main className="max-w-5xl mx-auto px-4 py-5 pb-24 space-y-5">

      {/* ── Demo 切換 ── */}
      <div className="flex gap-1.5 flex-wrap">
        <span className="text-[13px] text-slate-500 mr-1 self-center">Demo：</span>
        {(['admin', 'branch_leader', 'coach', 'parent', 'member'] as Role[]).map(r => (
          <button key={r} onClick={() => { setRole(r); setTab('dashboard'); }}
            className={`text-[13px] px-2.5 py-1 rounded-full border transition font-bold ${
              role === r ? 'bg-brand-600 text-white border-brand-600 shadow' : 'bg-white text-slate-500 border-slate-200'
            }`}>
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      {/* ── 身份卡 ── */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">👤</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold">{isLeader ? '陳管理員' : MY_PROFILE.name}</h2>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              <span className="bg-white/20 text-[13px] font-bold px-2 py-0.5 rounded-full">{currentRoleName}</span>
              {!isLeader && <span className="bg-white/20 text-[13px] font-bold px-2 py-0.5 rounded-full">{MY_PROFILE.branch}</span>}
              {!isLeader && <span className="bg-white/20 text-[13px] font-bold px-2 py-0.5 rounded-full">{MY_PROFILE.patrol}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* ── 分頁標籤 ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {currentTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition border ${
              tab === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'
            }`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════
          概覽 / 控制台
          ═══════════════════════════════════════════════════ */}
      {tab === 'dashboard' && isParentOrMember && (
        <section className="space-y-4">
          {/* 我的監察 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[15px] flex items-center gap-1.5">
                <span className="bg-amber-400 text-slate-900 text-[13px] font-extrabold px-2 py-0.5 rounded-lg">📡</span>
                我的監察
              </h3>
              <span className="text-[13px] text-slate-500">1 待回覆</span>
            </div>
            <div className="space-y-2">
              {MY_REGISTRATIONS.map((r, i) => (
                <div key={i} className="rounded-xl p-3 bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[13px]">{r.title}</span>
                    <div className="flex gap-1">
                      <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-bold ${
                        r.status === 'registered' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'interested' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {r.status === 'registered' ? '✅' : r.status === 'interested' ? '❤️' : '❌'}
                      </span>
                      <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-bold ${
                        r.paid === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                        r.paid === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {r.paid === 'confirmed' ? '💰 已核實' : r.paid === 'pending' ? '💰 待核實' : '❌ 未付'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[13px] text-slate-500">{r.date} · {r.location} · {r.fee}</div>
                  {/* 活動回覆快捷鍵（家長）—— 家長帳戶回覆＝已簽署 */}
                  {isParent && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      <button className="text-[13px] font-bold py-1.5 px-2 rounded-lg bg-amber-100 text-amber-700">❤️ 有興趣</button>
                      <button className="text-[13px] font-bold py-1.5 px-2 rounded-lg bg-emerald-700 text-white">✅ 參加</button>
                      <button className="text-[13px] font-bold py-1.5 px-2 rounded-lg bg-rose-100 text-rose-700">❌ 不參加</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 過往活動（摺疊，只限內部已參加的） */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <button onClick={() => setShowPast(!showPast)} className="w-full flex items-center justify-between text-left">
              <h3 className="font-bold text-[13px] text-slate-600">📁 過往活動（已參加）</h3>
              <span className="text-slate-500 text-[13px]">{showPast ? '▲' : '▼'}</span>
            </button>
            {showPast && (
              <div className="space-y-1.5 mt-2">
                {PAST_ACTIVITIES.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-[13px] font-bold">{p.title}</div>
                      <div className="text-[13px] text-slate-500">{p.date} · {p.location}</div>
                    </div>
                    <span className="text-[13px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">✓ 已參加</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          領袖控制台
          ═══════════════════════════════════════════════════ */}
      {tab === 'dashboard' && isLeader && (
        <section className="space-y-4">
          {/* 申請 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="font-bold text-[15px] mb-3">📋 申請</h3>
            <div className="grid grid-cols-4 gap-2">
              {APPROVALS.map((a, i) => (
                <Link key={i} href={`/dashboard/admin/applications?type=${a.type}`} className="no-underline text-inherit">
                  <div className={`rounded-xl p-2.5 text-center relative ${a.count > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                    {a.count > 0 && <span className="absolute -top-1 -right-1 text-[13px] bg-rose-600 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{a.count}</span>}
                    <div className="text-lg">{a.icon}</div>
                    <div className={`text-[13px] font-bold ${a.count > 0 ? 'text-amber-800' : 'text-slate-500'}`}>{a.type}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 活動概況 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[15px]">🎯 活動概況</h3>
              <Link href="/dashboard/admin/registrations" className="text-[13px] text-brand-600 font-bold no-underline">全部 →</Link>
            </div>
            <div className="space-y-2">
              {ACTIVITIES_OVERVIEW.map(a => (
                <Link key={a.id} href={`/dashboard/admin/registrations?eventId=${a.id}`} className="no-underline text-inherit block">
                  <div className={`bg-white rounded-xl border p-3 card-hover ${a.expired ? 'opacity-60 border-dashed' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] px-1.5 py-0.5 rounded font-bold ${a.type === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                          {a.type === 'internal' ? '🏠' : '📚'}
                        </span>
                        <span className="font-bold text-[13px]">{a.title}</span>
                      </div>
                      <span className="text-[13px] text-slate-500">{a.expired ? '⏰' : `截止 ${a.deadline}`}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <div className="bg-emerald-50 rounded px-1.5 py-1 text-center"><div className="text-[13px] font-extrabold text-emerald-700">{a.registered}</div><div className="text-[13px] text-emerald-700">✅報名</div></div>
                      <div className="bg-amber-50 rounded px-1.5 py-1 text-center"><div className="text-[13px] font-extrabold text-amber-700">{a.interested}</div><div className="text-[13px] text-amber-700">❤️興趣</div></div>
                      <div className="bg-slate-100 rounded px-1.5 py-1 text-center"><div className="text-[13px] font-extrabold text-slate-600">{a.pending}</div><div className="text-[13px] text-slate-500">⚠️待覆</div></div>
                      <div className={`rounded px-1.5 py-1 text-center ${a.paid >= a.registered ? 'bg-emerald-50' : 'bg-rose-50'}`}><div className={`text-[13px] font-extrabold ${a.paid >= a.registered ? 'text-emerald-700' : 'text-rose-700'}`}>{a.paid}/{a.registered}</div><div className="text-[13px] text-slate-500">💰付款</div></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 成員 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[15px]">👥 成員</h3>
              <Link href="/dashboard/admin/members" className="text-[13px] text-brand-600 font-bold no-underline">管理 →</Link>
            </div>
            <div className="space-y-1.5">
              {BRANCH_STATS.map(b => (
                <Link key={b.id} href={`/dashboard/admin/members?branch=${b.id}`} className="no-underline text-inherit block">
                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 card-hover flex items-center justify-between">
                    <span className="font-bold text-[13px]">{b.name}</span>
                    <div className="flex gap-1 flex-wrap">
                      {b.patrolDetail?.map((p, i) => (
                        <span key={i} className="text-[13px] bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                          <span className="font-bold">{p.name}</span> {p.count}
                          {'leader' in p && p.leader && <span className="text-emerald-700"> ★</span>}
                        </span>
                      ))}
                      <span className="text-[13px] text-slate-500 self-center ml-1">{b.members}人</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 會議 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[15px]">🤝 會議</h3>
              <Link href="/dashboard/meetings" className="text-[13px] text-brand-600 font-bold no-underline">全部 →</Link>
            </div>
            <div className="space-y-1.5">
              {MEETINGS.map(m => (
                <Link key={m.id} href={`/dashboard/meetings?id=${m.id}`} className="no-underline text-inherit block">
                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 card-hover flex items-center gap-2">
                    <span className="text-lg">{m.status === 'upcoming' ? '📋' : '📁'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[13px]">{m.title}</div>
                      <div className="text-[13px] text-slate-500">{m.date} {m.time}</div>
                    </div>
                    {m.files > 0 && <span className="text-[13px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">📎{m.files}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 管理中心 */}
          <div>
            <h3 className="font-bold text-[15px] mb-2">🔧 管理中心</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: '🏢', label: '支部管理', href: '/dashboard/admin/members' },
                { icon: '🎫', label: '報名管理', href: '/dashboard/admin/registrations' },
                { icon: '✅', label: '批核中心', href: '/dashboard/admin/applications' },
                { icon: '👤', label: '使用者', href: '/dashboard/admin/users' },
              ].map((item, i) => (
                <Link key={i} href={item.href} className="no-underline text-inherit">
                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 card-hover text-center">
                    <div className="text-xl mb-1">{item.icon}</div>
                    <div className="font-bold text-[13px]">{item.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          基本資料
          ═══════════════════════════════════════════════════ */}
      {tab === 'info' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="font-bold text-[15px]">📋 基本資料</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '姓名', value: isLeader ? '陳管理員' : MY_PROFILE.name },
              { label: 'YMIS', value: isLeader ? '—' : MY_PROFILE.ymNumber },
              { label: '支部', value: isLeader ? '全旅' : MY_PROFILE.branch },
              { label: '小隊', value: isLeader ? '—' : MY_PROFILE.patrol },
              { label: '緊急聯絡人', value: MY_PROFILE.emergencyContactName },
              { label: '緊急電話', value: MY_PROFILE.emergencyContactPhone },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-2.5">
                <div className="text-[13px] text-slate-500 font-bold uppercase">{item.label}</div>
                <div className="text-[13px] font-bold text-slate-800 mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>
          {!isLeader && !isParent && (
            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-[13px] font-bold text-slate-500 mb-1.5">👨‍👩‍👧 家長連結</h4>
              <div className="bg-blue-50 rounded-xl p-2.5 flex items-center justify-between">
                <div><div className="text-[13px] font-bold">{MY_PROFILE.parentName}</div><div className="text-[13px] text-slate-500">{MY_PROFILE.parentEmail}</div></div>
                <span className="text-[13px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">已連結</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          子女資料
          ═══════════════════════════════════════════════════ */}
      {tab === 'children' && isParent && (
        <section className="space-y-3">
          {children.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧒</span>
                  <div><div className="font-bold text-base">{c.name}</div><div className="text-[15px] text-slate-500">{c.branch} · {c.patrol} · {c.age} 歲</div></div>
                </div>
              </div>

              {/* 想考的章：家長可睇子女嘅；幼童軍（b2）可由家長代填 */}
              <div className="border-t border-slate-100 pt-3 mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-[15px] flex items-center gap-1.5 m-0">🎖️ 想考的章</h4>
                  {c.branchId === 'b2' && (
                    <span className="text-[13px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">家長可代填（幼童軍）</span>
                  )}
                </div>
                {c.badges.length === 0 && <p className="text-[15px] text-slate-500 m-0">未有想考的章。</p>}
                <div className="space-y-1.5">
                  {c.badges.map((b, i) => (
                    <div key={i} className="rounded-lg p-2.5 bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-[15px]">{b.name}</div>
                        {b.note && <div className="text-[15px] text-slate-500">想考：{b.note}</div>}
                      </div>
                      {b.read ? (
                        <span className="text-[13px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">✓ 領袖已讀</span>
                      ) : (
                        <span className="text-[13px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">⏳ 待查看</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 幼童軍：家長可幫子女填想考的章 */}
                {c.branchId === 'b2' && (
                  <div className="mt-2 bg-violet-50 border border-violet-100 rounded-xl p-2.5 space-y-2">
                    {badgeChildId === c.id ? (
                      <>
                        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px]" placeholder="章名（例如 幼童軍天象章）" value={badgeName} onChange={e => setBadgeName(e.target.value)} />
                        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px]" placeholder="備註（例如 想學觀星）" value={badgeNote} onChange={e => setBadgeNote(e.target.value)} />
                        <div className="flex gap-2">
                          <button className="flex-1 bg-brand-600 text-white text-[15px] font-bold py-2 rounded-lg" onClick={() => addChildBadge(c.id)}>＋ 加入</button>
                          <button className="bg-white text-slate-600 text-[15px] font-bold px-3 py-2 rounded-lg border border-slate-200" onClick={() => { setBadgeChildId(''); setBadgeName(''); setBadgeNote(''); }}>取消</button>
                        </div>
                      </>
                    ) : (
                      <button className="w-full bg-brand-600 text-white text-[15px] font-bold py-2 rounded-lg" onClick={() => { setBadgeChildId(c.id); setBadgeName(''); setBadgeNote(''); }}>
                        ＋ 幫 {c.name} 填想考的章
                      </button>
                    )}
                  </div>
                )}
                {c.branchId !== 'b2' && (
                  <p className="text-[13px] text-slate-500 m-0 mt-1.5">此子女可喺自己帳戶填寫想考的章。</p>
                )}
              </div>

              <div className="space-y-1 border-t border-slate-100 pt-2">
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-2">
                  <span className="text-[15px]">旅團露營 (9月20日)</span>
                  <div className="flex gap-1">
                    <span className="text-[13px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">✅</span>
                    <span className="text-[13px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">💰 已核實</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-2">
                  <span className="text-[15px]">區運會 (10月5日)</span>
                  <div className="flex gap-1">
                    <span className="text-[13px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">✅</span>
                    <span className="text-[13px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">💰 待核實</span>
                  </div>
                </div>
              </div>
              {/* 家長快捷回覆 —— 有興趣／參加／不參加；參加才需 tick 已付款 */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <button className="text-[15px] font-bold py-2 px-3 rounded-lg bg-amber-100 text-amber-700">❤️ 有興趣</button>
                <button className="text-[15px] font-bold py-2 px-3 rounded-lg bg-emerald-700 text-white">✅ 參加</button>
                <button className="text-[15px] font-bold py-2 px-3 rounded-lg bg-rose-100 text-rose-700">❌ 不參加</button>
              </div>
              <p className="text-[13px] text-slate-500 m-0 mt-1.5">ℹ️ 家長不用簽署：用家長帳戶登入報名＝已簽署。選「不參加」不用 tick 付款。</p>
            </div>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          想考的章
          ═══════════════════════════════════════════════════ */}
      {tab === 'badges' && isMember && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[15px]">🎖️ 想考的章</h3>
            <button className="bg-brand-600 text-white text-[13px] font-bold px-3 py-1.5 rounded-lg">+ 新增</button>
          </div>
          <p className="text-[13px] text-slate-500">填寫你想考的獎章，領袖看到後會標記「已讀」。</p>
          <div className="space-y-2">
            {MY_BADGES.map((b, i) => (
              <div key={i} className="rounded-xl p-3 bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[13px]">{b.name}</span>
                  {b.read ? (
                    <span className="text-[13px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">✓ 領袖已讀</span>
                  ) : (
                    <span className="text-[13px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">⏳ 待查看</span>
                  )}
                </div>
                <div className="text-[13px] text-slate-500">我想考：{b.note}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          物資借用
          ═══════════════════════════════════════════════════ */}
      {tab === 'supplies' && isMember && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[15px]">📦 物資借用</h3>
            <button className="bg-brand-600 text-white text-[13px] font-bold px-3 py-1.5 rounded-lg">申請借用</button>
          </div>
          {SUPPLIES.map(s => (
            <div key={s.id} className={`rounded-xl p-3 flex items-center justify-between ${s.status === 'borrowed' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
              <div><div className="text-[13px] font-bold">{s.name}</div><div className="text-[13px] text-slate-500">{s.borrowDate} → {s.returnDate}</div></div>
              <span className={`text-[13px] px-2 py-0.5 rounded-full font-bold ${s.status === 'borrowed' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                {s.status === 'borrowed' ? '借用中' : '已歸還'}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          改密碼
          ═══════════════════════════════════════════════════ */}
      {tab === 'password' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="font-bold text-[15px]">🔑 更改密碼</h3>
          <div className="space-y-2.5">
            <div><label className="text-[13px] font-bold text-slate-500 uppercase">目前密碼</label><input type="password" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[15px]" /></div>
            <div><label className="text-[13px] font-bold text-slate-500 uppercase">新密碼</label><input type="password" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[15px]" /></div>
            <div><label className="text-[13px] font-bold text-slate-500 uppercase">確認新密碼</label><input type="password" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[15px]" /></div>
            <button className="w-full bg-brand-600 text-white py-2.5 rounded-xl text-[15px] font-bold">更新密碼</button>
          </div>
        </section>
      )}

    </main>
  );
}
