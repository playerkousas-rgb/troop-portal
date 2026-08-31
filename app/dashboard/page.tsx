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

      {/* ── MOCK 導覽（純前端預覽，唔接 GS）── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
        <div className="text-[11px] font-bold text-amber-800 mb-2">🎨 MOCK 版預覽 · 全部假資料 · 唔會觸碰 GS／真實頁面</div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { href: '/dashboard/login', label: '🔑 登入頁' },
            { href: '/dashboard', label: '📊 控制台' },
            { href: '/dashboard/calendar', label: '📅 行事曆' },
            { href: '/dashboard/notices', label: '📢 公告' },
            { href: '/dashboard/activities', label: '🎯 活動' },
            { href: '/dashboard/profile', label: '👤 我的' },
            { href: '/dashboard/updates', label: '🆕 更新公告' },
            { href: '/dashboard/templates', label: '📂 模板下載' },
            { href: '/dashboard/admin/members', label: '🛠 管理後台' },
          ].map(l => (
            <Link key={l.href + l.label} href={l.href} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-800 no-underline hover:bg-amber-100 transition">
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Demo 切換 ── */}
      <div className="flex gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-500 mr-1 self-center">Demo：</span>
        {(['admin', 'branch_leader', 'coach', 'parent', 'member'] as Role[]).map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition font-bold ${
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
              <span className="bg-amber-400 text-slate-900 text-[11px] font-extrabold px-2 py-0.5 rounded-lg">📡</span>
              我的監察
            </h3>
            <span className="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">1 待回覆</span>
          </div>
          <div className="space-y-2">
            {MY_REGISTRATIONS.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-white/10 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs truncate">{r.title}</div>
                  <div className="text-white/80 text-[11px]">{r.date} · {r.fee} · 截止 {r.deadline}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    r.status === 'registered' ? 'bg-emerald-400/20 text-emerald-200' :
                    r.status === 'interested' ? 'bg-amber-400/20 text-amber-200' : 'bg-rose-400/20 text-rose-200'
                  }`}>
                    {r.status === 'registered' ? '✅ 已報名' : r.status === 'interested' ? '❤️ 有興趣' : '❌ 婉拒'}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
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
          <Link href="/dashboard/activities" className="block text-center text-[11px] text-white/60 hover:text-white/80 mt-3 font-bold no-underline">
            查看全部活動 →
          </Link>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          領袖 — 下方 4 格：行事曆 · 公告 · 點名 · 管理中心
          ═══════════════════════════════════════════ */}
      {isLeader && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { icon: '📅', label: '行事曆', desc: '集會·活動·會議', href: '/dashboard/calendar', tone: 'from-blue-600 to-blue-800' },
            { icon: '📢', label: '公告', desc: '通知類訊息', href: '/dashboard/notices', tone: 'from-amber-500 to-amber-700' },
            { icon: '📝', label: '點名', desc: '出席紀錄', href: '/dashboard/attendance', tone: 'from-violet-600 to-violet-800' },
            { icon: '🔧', label: '管理中心', desc: '活動·報名·會議·物資·帳戶', href: '#admin-center', tone: 'from-slate-600 to-slate-800' },
          ].map(t => (
            <Link key={t.label} href={t.href} className="no-underline text-inherit">
              <div className={`bg-gradient-to-br ${t.tone} text-white rounded-2xl p-3.5 card-hover text-center h-full`}>
                <div className="text-2xl mb-1.5">{t.icon}</div>
                <div className="font-bold text-[13px]">{t.label}</div>
                <div className="text-[11px] text-white/75 mt-0.5">{t.desc}</div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════
          領袖 — 申請卡片（取代原統計摘要）
          ═══════════════════════════════════════════ */}
      {isLeader && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-500 text-slate-900 rounded-lg flex items-center justify-center text-[11px]">📋</span>
              申請
            </h3>
            <span className="text-[11px] text-slate-500">點擊查看詳情</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {APPROVALS.map((a, i) => (
              <Link key={i} href={`/dashboard/admin/applications?type=${a.type}`} className="no-underline text-inherit">
                <div className={`rounded-xl p-3 text-center transition hover:shadow-md relative ${a.count > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                  {a.count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 text-[11px] bg-rose-600 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold">{a.count}</span>
                  )}
                  <div className="text-xl mb-1">{a.icon}</div>
                  <div className={`text-[11px] font-bold ${a.count > 0 ? 'text-amber-800' : 'text-slate-500'}`}>{a.type}</div>
                  {a.count > 0 && <div className="text-[11px] text-amber-700 font-semibold mt-0.5">{a.count} 待批核</div>}
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
              <span className="w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center text-[11px]">🎯</span>
              活動概況
            </h3>
            <Link href="/dashboard/admin/registrations" className="text-[11px] text-brand-600 font-bold no-underline">全部 →</Link>
          </div>
          <div className="space-y-2">
            {ACTIVITIES.map(a => (
              <Link key={a.id} href={`/dashboard/admin/registrations?eventId=${a.id}`} className="no-underline text-inherit block">
                <div className={`bg-white rounded-xl border p-3 card-hover ${a.expired ? 'opacity-60 border-dashed' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${a.type === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                        {a.type === 'internal' ? '🏠 內部' : '📚 外部'}
                      </span>
                      <span className="font-bold text-xs">{a.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{a.expired ? '⏰ 已過期' : `截止 ${a.deadline}`}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="bg-emerald-50 rounded-lg px-2 py-1 text-center">
                      <div className="text-xs font-extrabold text-emerald-700">{a.registered}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">✅ 報名</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg px-2 py-1 text-center">
                      <div className="text-xs font-extrabold text-amber-700">{a.interested}</div>
                      <div className="text-[11px] text-amber-700 font-semibold">❤️ 有興趣</div>
                    </div>
                    <div className="bg-slate-100 rounded-lg px-2 py-1 text-center">
                      <div className="text-xs font-extrabold text-slate-600">{a.pending}</div>
                      <div className="text-[11px] text-slate-500 font-semibold">⚠️ 待回覆</div>
                    </div>
                    <div className={`rounded-lg px-2 py-1 text-center ${a.paid >= a.registered ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <div className={`text-xs font-extrabold ${a.paid >= a.registered ? 'text-emerald-700' : 'text-rose-700'}`}>{a.paid}/{a.registered}</div>
                      <div className="text-[11px] text-slate-500 font-semibold">💰 付款</div>
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
              <span className="w-6 h-6 bg-emerald-700 text-white rounded-lg flex items-center justify-center text-[11px]">👥</span>
              成員
            </h3>
            <Link href="/dashboard/admin/members" className="text-[11px] text-brand-600 font-bold no-underline">管理 →</Link>
          </div>
          <div className="space-y-2">
            {BRANCH_STATS.map(b => (
              <Link key={b.id} href={`/dashboard/admin/members?branch=${b.id}`} className="no-underline text-inherit block">
                <div className="bg-white rounded-xl border border-slate-200 p-3 card-hover">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs">{b.name}</span>
                    <span className="text-[11px] text-slate-500">{b.members} 人{b.patrols > 0 ? ` · ${b.patrols} 小隊` : ''}</span>
                  </div>
                  {b.patrolDetail && (
                    <div className="flex gap-1.5 flex-wrap">
                      {b.patrolDetail.map((p, i) => (
                        <span key={i} className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 flex items-center gap-1">
                          <span className="font-bold text-slate-700">{p.name}</span>
                          <span className="text-slate-500">{p.count}人</span>
                          {'leader' in p && p.leader && <span className="text-emerald-700">★{p.leader}</span>}
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
              <span className="w-6 h-6 bg-violet-600 text-white rounded-lg flex items-center justify-center text-[11px]">🤝</span>
              會議
            </h3>
            <Link href="/dashboard/meetings" className="text-[11px] text-brand-600 font-bold no-underline">全部 →</Link>
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
                    <div className="text-[11px] text-slate-500">{m.date} {m.time} · {m.location}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.files > 0 && (
                      <span className="text-[11px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">📎 {m.files} 文件</span>
                    )}
                    <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${m.status === 'upcoming' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
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
          管理中心（管理員/團長/支部領袖）—— 對照用戶：
          「管理中心最上方就是統計資料,再看到各樣管理項目,點進卡片進行管理」
          六大模組：活動管理(=通告) 行事曆管理 報名管理 會議管理 物資管理 帳戶管理
          ═══════════════════════════════════════════ */}
      {isManager && (
        <section id="admin-center" className="scroll-mt-20">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-slate-600 text-white rounded-lg flex items-center justify-center text-[11px]">🔧</span>
            <h3 className="font-bold text-sm">管理中心</h3>
          </div>

          {/* 統計資料（最上方） */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { label: '用戶', value: 45, tone: 'bg-blue-50 text-blue-700' },
              { label: '待審批', value: 2, tone: 'bg-rose-50 text-rose-700' },
              { label: '已發布活動', value: 12, tone: 'bg-emerald-50 text-emerald-700' },
              { label: '通告', value: 8, tone: 'bg-amber-50 text-amber-700' },
            ].map(s => (
              <div key={s.label} className={`${s.tone} rounded-xl px-3 py-2.5 text-center`}>
                <div className="text-xl font-black leading-none">{s.value}</div>
                <div className="text-[11px] font-bold mt-1 opacity-80">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 六大管理模組：點進卡片管理 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <Link href="/dashboard/activities" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center h-full">
                <div className="text-2xl mb-1.5">🎯</div>
                <div className="font-bold text-[11px]">活動管理（=通告）</div>
                <div className="text-[11px] text-slate-500 mt-0.5">活動·通告·過期區</div>
              </div>
            </Link>
            <Link href="/dashboard/calendar" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center h-full">
                <div className="text-2xl mb-1.5">📅</div>
                <div className="font-bold text-[11px]">行事曆管理</div>
                <div className="text-[11px] text-slate-500 mt-0.5">集會·活動·標籤</div>
              </div>
            </Link>
            <Link href="/dashboard/admin/registrations" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center h-full">
                <div className="text-2xl mb-1.5">🎫</div>
                <div className="font-bold text-[11px]">報名管理</div>
                <div className="text-[11px] text-slate-500 mt-0.5">內部·外部·付款</div>
              </div>
            </Link>
            <Link href="/dashboard/meetings" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center h-full">
                <div className="text-2xl mb-1.5">🤝</div>
                <div className="font-bold text-[11px]">會議管理</div>
                <div className="text-[11px] text-slate-500 mt-0.5">議程·紀錄·文件</div>
              </div>
            </Link>
            <Link href="/dashboard/admin/equipment" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center h-full">
                <div className="text-2xl mb-1.5">📦</div>
                <div className="font-bold text-[11px]">物資管理</div>
                <div className="text-[11px] text-slate-500 mt-0.5">清單·借用·庫存</div>
              </div>
            </Link>
            <Link href="/dashboard/admin/users" className="no-underline text-inherit">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 card-hover text-center h-full">
                <div className="text-2xl mb-1.5">👤</div>
                <div className="font-bold text-[11px]">帳戶管理</div>
                <div className="text-[11px] text-slate-500 mt-0.5">帳號·角色·權限</div>
              </div>
            </Link>
          </div>

          {/* 系統設定（次要入口，收埋一行） */}
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <Link href="/dashboard/admin/settings" className="no-underline text-inherit">
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 card-hover text-center">
                <div className="text-lg mb-1">⚙️</div>
                <div className="font-bold text-[11px]">系統設定</div>
              </div>
            </Link>
            <Link href="/dashboard/admin/applications" className="no-underline text-inherit">
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 card-hover text-center">
                <div className="text-lg mb-1">✅</div>
                <div className="font-bold text-[11px]">批核中心</div>
              </div>
            </Link>
          </div>
        </section>
      )}

      <div className="h-4" />
    </main>
  );
}
