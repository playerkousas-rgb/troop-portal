'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/* ═══════════════════════════════════════════════════
   類型 & 模擬資料
   ═══════════════════════════════════════════════════ */

type Role = 'super_admin' | 'admin' | 'group_leader' | 'branch_leader' | 'coach' | 'parent' | 'member';
const ROLE_LABEL: Record<Role, string> = {
  super_admin: '技術測試', admin: '管理員', group_leader: '團長',
  branch_leader: '支部領袖', coach: '教練員', parent: '家長', member: '成員',
};

// 我的監察（家長/成員）
const MY_REGISTRATIONS = [
  { title: '旅團露營', date: '9月20-21日', status: 'registered' as const, paid: 'confirmed' as const, fee: '$300', deadline: '9月15日' },
  { title: '區運會', date: '10月5日', status: 'registered' as const, paid: 'pending' as const, fee: '$50', deadline: '9月28日' },
  { title: '親子活動', date: '10月12日', status: 'interested' as const, paid: 'unpaid' as const, fee: '$80', deadline: '10月5日' },
];

// 活動模擬
const ACTIVITIES = [
  { id: 'a1', title: '旅團露營', date: '9月20-21日', type: 'internal' as const, registered: 32, interested: 8, pending: 12, declined: 5, paid: 28, deadline: '9月15日', expired: false },
  { id: 'a2', title: '區運會', date: '10月5日', type: 'internal' as const, registered: 18, interested: 3, pending: 22, declined: 2, paid: 10, deadline: '9月28日', expired: false },
  { id: 'a3', title: '總區領袖訓練', date: '9月28日', type: 'external' as const, registered: 5, interested: 2, pending: 8, declined: 1, paid: 5, deadline: '已過期', expired: true },
];

// 通告（活動頁用 — 家長/成員只看最新，領袖看全部含過期）
const NOTICES_ACTIVITY = [
  { id: 'n1', title: '旅團露營報名', date: '9月20-21日', type: 'internal' as const, deadline: '9月15日', expired: false, source: '旅團自辦' },
  { id: 'n2', title: '區運會報名', date: '10月5日', type: 'internal' as const, deadline: '9月28日', expired: false, source: '旅團自辦' },
  { id: 'n3', title: '總區領袖訓練課程', date: '9月28日', type: 'external' as const, deadline: '已過期', expired: true, source: '圖書館引入' },
  { id: 'n4', title: '世界思緒日活動', date: '10月18日', type: 'external' as const, deadline: '10月10日', expired: false, source: '圖書館引入' },
];

// 成員統計
const BRANCH_STATS = [
  { id: 'b1', name: '小童軍', members: 8, patrols: 0 },
  { id: 'b2', name: '幼童軍', members: 22, patrols: 4, patrolDetail: [{ name: 'RED', count: 6 }, { name: 'YELLOW', count: 5 }, { name: 'BLUE', count: 6 }, { name: 'GREEN', count: 5 }] },
  { id: 'b3', name: '童軍', members: 28, patrols: 3, patrolDetail: [{ name: 'TIGER', count: 10, leader: '張小明' }, { name: 'SEAGULL', count: 9, leader: '李美玲' }, { name: 'WOLF', count: 9, leader: '黃偉' }] },
  { id: 'b4', name: '深資', members: 16, patrols: 0 },
  { id: 'b5', name: '樂行', members: 12, patrols: 0 },
];

// 會議模擬
const MEETINGS = [
  { id: 'm1', title: '9月份領袖會議', date: '9月10日', time: '19:00', location: '旅團部', status: 'upcoming', files: 3 },
  { id: 'm2', title: '週年大會', date: '10月15日', time: '14:00', location: '社區中心', status: 'upcoming', files: 0 },
  { id: 'm3', title: '8月份領袖會議', date: '8月12日', time: '19:00', location: '旅團部', status: 'past', files: 5 },
];

// 批核
const APPROVALS = [
  { type: '帳號申請', count: 1, icon: '👤' },
  { type: '成員申請', count: 1, icon: '🧒' },
  { type: '家長申請', count: 0, icon: '👨‍👩‍👧' },
  { type: '物資借用', count: 0, icon: '📦' },
];

/* ═══════════════════════════════════════════════════
   主頁面
   ═══════════════════════════════════════════════════ */

export default function DashboardPage() {
  const [role, setRole] = useState<Role>('admin');

  const isManager = ['admin', 'super_admin', 'group_leader', 'branch_leader'].includes(role);
  const isLeader = ['admin', 'super_admin', 'group_leader', 'branch_leader', 'coach'].includes(role);
  const isParentOrMember = role === 'parent' || role === 'member';

  return (
    <main className="max-w-6xl mx-auto px-4 py-4 pb-24 space-y-5">

      {/* ── Demo 切換 ── */}
      <div className="flex gap-1.5 flex-wrap">
        <span className="text-[9px] text-slate-400 mr-1 self-center">Demo：</span>
        {(['admin', 'branch_leader', 'coach', 'parent', 'member'] as Role[]).map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition font-bold ${
              role === r ? 'bg-brand-600 text-white border-brand-600 shadow' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
            }`}>
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          家長/成員 — 我的監察
          ═══════════════════════════════════════════ */}
      {isParentOrMember && (
        <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-lg">📡</span>
              我的監察
            </h3>
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">1 待回覆</span>
          </div>
          <div className="space-y-2">
            {MY_REGISTRATIONS.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-white/10 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs truncate">{r.title}</div>
                  <div className="text-white/50 text-[10px]">{r.date} · {r.fee} · 截止 {r.deadline}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    r.status === 'registered' ? 'bg-emerald-400/20 text-emerald-200' :
                    r.status === 'interested' ? 'bg-amber-400/20 text-amber-200' : 'bg-rose-400/20 text-rose-200'
                  }`}>
                    {r.status === 'registered' ? '✅ 已報名' : r.status === 'interested' ? '❤️ 有興趣' : '❌ 婉拒'}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    r.paid === 'confirmed' ? 'bg-emerald-400/20 text-emerald-200' :
                    r.paid === 'pending' ? 'bg-amber-400/20 text-amber-200' :
                    'bg-rose-400/20 text-rose-200'
                  }`}>
                    {r.paid === 'confirmed' ? '💰 已核實' : r.paid === 'pending' ? '💰 待核實' : '❌ 未付'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/activities" className="block text-center text-[10px] text-white/60 hover:text-white/80 mt-3 font-bold no-underline">
            查看全部活動 →
          </Link>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          領袖 — 申請卡片（取代原統計摘要）
          ═══════════════════════════════════════════ */}
      {isLeader && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center text-[10px]">📋</span>
              申請
            </h3>
            <span className="text-[10px] text-slate-400">點擊查看詳情</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {APPROVALS.map((a, i) => (
              <Link key={i} href={`/dashboard/admin/applications?type=${a.type}`} className="no-underline text-inherit">
                <div className={`rounded-xl p-3 text-center transition hover:shadow-md relative ${a.count > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                  {a.count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold">{a.count}</span>
                  )}
                  <div className="text-xl mb-1">{a.icon}</div>
                  <div className={`text-[10px] font-bold ${a.count > 0 ? 'text-amber-800' : 'text-slate-500'}`}>{a.type}</div>
                  {a.count > 0 && <div className="text-[9px] text-amber-600 font-semibold mt-0.5">{a.count} 待批核</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          領袖 — 活動概況
          ═══════════════════════════════════════════ */}
      {isLeader && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center text-[10px]">🎯</span>
              活動概況
            </h3>
            <Link href="/dashboard/admin/registrations" className="text-[10px] text-brand-600 font-bold no-underline">全部 →</Link>
          </div>
          <div className="space-y-2">
            {ACTIVITIES.map(a => (
              <Link key={a.id} href={`/dashboard/admin/registrations?eventId=${a.id}`} className="no-underline text-inherit block">
                <div className={`bg-white rounded-xl border p-3 card-hover ${a.expired ? 'opacity-60 border-dashed' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${a.type === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                        {a.type === 'internal' ? '🏠 內部' : '📚 外部'}
                      </span>
                      <span className="font-bold text-xs">{a.title}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">{a.expired ? '⏰ 已過期' : `截止 ${a.deadline}`}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="bg-emerald-50 rounded-lg px-2 py-1 text-center">
                      <div className="text-xs font-extrabold text-emerald-700">{a.registered}</div>
                      <div className="text-[8px] text-emerald-600 font-semibold">✅ 報名</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg px-2 py-1 text-center">
                      <div className="text-xs font-extrabold text-amber-700">{a.interested}</div>
                      <div className="text-[8px] text-amber-600 font-semibold">❤️ 有興趣</div>
                    </div>
                    <div className="bg-slate-100 rounded-lg px-2 py-1 text-center">
                      <div className="text-xs font-extrabold text-slate-600">{a.pending}</div>
                      <div className="text-[8px] text-slate-500 font-semibold">⚠️ 待回覆</div>
                    </div>
                    <div className={`rounded-lg px-2 py-1 text-center ${a.paid >= a.registered ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <div className={`text-xs font-extrabold ${a.paid >= a.registered ? 'text-emerald-700' : 'text-rose-700'}`}>{a.paid}/{a.registered}</div>
                      <div className="text-[8px] text-slate-500 font-semibold">💰 付款</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          領袖 — 成員/支部概況
          ═══════════════════════════════════════════ */}
      {isLeader && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-[10px]">👥</span>
              成員
            </h3>
            <Link href="/dashboard/admin/members" className="text-[10px] text-brand-600 font-bold no-underline">管理 →</Link>
          </div>
          <div className="space-y-2">
            {BRANCH_STATS.map(b => (
              <Link key={b.id} href={`/dashboard/admin/members?branch=${b.id}`} className="no-underline text-inherit block">
                <div className="bg-white rounded-xl border border-slate-200 p-3 card-hover">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs">{b.name}</span>
                    <span className="text-[10px] text-slate-400">{b.members} 人{b.patrols > 0 ? ` · ${b.patrols} 小隊` : ''}</span>
                  </div>
                  {b.patrolDetail && (
                    <div className="flex gap-1.5 flex-wrap">
                      {b.patrolDetail.map((p, i) => (
                        <span key={i} className="text-[9px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 flex items-center gap-1">
                          <span className="font-bold text-slate-700">{p.name}</span>
                          <span className="text-slate-400">{p.count}人</span>
                          {'leader' in p && p.leader && <span className="text-emerald-600">★{p.leader}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          領袖 — 會議
          ═══════════════════════════════════════════ */}
      {isLeader && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-6 h-6 bg-violet-500 text-white rounded-lg flex items-center justify-center text-[10px]">🤝</span>
              會議
            </h3>
            <Link href="/dashboard/meetings" className="text-[10px] text-brand-600 font-bold no-underline">全部 →</Link>
          </div>
          <div className="space-y-2">
            {MEETINGS.map(m => (
              <Link key={m.id} href={`/dashboard/meetings?id=${m.id}`} className="no-underline text-inherit block">
                <div className={`bg-white rounded-xl border p-3 card-hover flex items-center gap-3 ${m.status === 'past' ? 'opacity-60 border-dashed' : 'border-slate-200'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${m.status === 'upcoming' ? 'bg-violet-100' : 'bg-slate-100'}`}>
                    {m.status === 'upcoming' ? '📋' : '📁'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs">{m.title}</div>
                    <div className="text-[10px] text-slate-400">{m.date} {m.time} · {m.location}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.files > 0 && (
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">📎 {m.files} 文件</span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${m.status === 'upcoming' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {m.status === 'upcoming' ? '即將進行' : '已結束'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          管理中心（管理員/團長/支部領袖）
          ═══════════════════════════════════════════ */}
      {isManager && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-slate-600 text-white rounded-lg flex items-center justify-center text-[10px]">🔧</span>
            <h3 className="font-bold text-sm">管理中心</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Link href="/dashboard/admin/members" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center">
                <div className="text-2xl mb-1.5">🏢</div>
                <div className="font-bold text-[11px]">支部管理</div>
                <div className="text-[9px] text-slate-400 mt-0.5">成員·家長·小隊</div>
              </div>
            </Link>
            <Link href="/dashboard/admin/registrations" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center">
                <div className="text-2xl mb-1.5">🎫</div>
                <div className="font-bold text-[11px]">報名管理</div>
                <div className="text-[9px] text-slate-400 mt-0.5">內部·外部·付款</div>
              </div>
            </Link>
            <Link href="/dashboard/admin/applications" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center relative">
                <span className="absolute -top-1 -right-1 text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold">2</span>
                <div className="text-2xl mb-1.5">✅</div>
                <div className="font-bold text-[11px]">批核中心</div>
                <div className="text-[9px] text-slate-400 mt-0.5">帳號·成員·物資</div>
              </div>
            </Link>
            <Link href="/dashboard/admin/users" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center">
                <div className="text-2xl mb-1.5">👤</div>
                <div className="font-bold text-[11px]">使用者管理</div>
                <div className="text-[9px] text-slate-400 mt-0.5">帳號·權限·紀錄</div>
              </div>
            </Link>
          </div>
          {/* 第二排：系統設定、集會規則、通告 */}
          <div className="grid grid-cols-3 gap-2.5 mt-2.5">
            <Link href="/dashboard/admin/settings" className="no-underline text-inherit">
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 card-hover text-center">
                <div className="text-lg mb-1">⚙️</div>
                <div className="font-bold text-[10px]">系統設定</div>
              </div>
            </Link>
            <Link href="/dashboard/admin/calendar" className="no-underline text-inherit">
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 card-hover text-center">
                <div className="text-lg mb-1">📅</div>
                <div className="font-bold text-[10px]">集會規則</div>
              </div>
            </Link>
            <Link href="/dashboard/notices" className="no-underline text-inherit">
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 card-hover text-center">
                <div className="text-lg mb-1">📄</div>
                <div className="font-bold text-[10px]">通告管理</div>
              </div>
            </Link>
          </div>
        </section>
      )}

      <div className="h-4" />
    </main>
  );
}
