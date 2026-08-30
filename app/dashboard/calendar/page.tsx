'use client';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   模擬資料
   ═══════════════════════════════════════════════════ */

const EVENTS = [
  { id: 'e1', title: '旅團露營', date: '2026-09-20', type: 'event' as const, branch: '全旅', color: 'purple', location: '西貢' },
  { id: 'e2', title: '區運會', date: '2026-10-05', type: 'event' as const, branch: '全旅', color: 'blue', location: '九龍公園' },
  { id: 'e3', title: '親子日營', date: '2026-10-12', type: 'event' as const, branch: '童軍', color: 'green', location: '大埔' },
];

const REGULAR_MEETINGS: Record<string, { branch: string; time: string; location: string }[]> = {
  '1': [{ branch: '童軍', time: '19:00-21:00', location: '旅團部' }],
  '3': [{ branch: '幼童軍', time: '18:00-19:30', location: '旅團部' }],
  '5': [{ branch: '童軍', time: '19:00-21:00', location: '旅團部' }],
  '8': [{ branch: '幼童軍', time: '18:00-19:30', location: '旅團部' }],
  '10': [{ branch: '童軍', time: '19:00-21:00', location: '旅團部' }],
  '15': [{ branch: '童軍', time: '19:00-21:00', location: '旅團部' }],
  '17': [{ branch: '幼童軍', time: '18:00-19:30', location: '旅團部' }],
  '22': [{ branch: '童軍', time: '19:00-21:00', location: '旅團部' }],
  '24': [{ branch: '幼童軍', time: '18:00-19:30', location: '旅團部' }],
  '29': [{ branch: '童軍', time: '19:00-21:00', location: '旅團部' }],
};

const CANCELLED = ['15']; // 9月15日取消

const BRANCH_COLORS: Record<string, string> = {
  '小童軍': '#ff9800', '幼童軍': '#fbc02d', '童軍': '#4caf50', '深資': '#f44336', '樂行': '#2196f3', '全旅': '#9c27b0',
};

export default function CalendarPage() {
  const [role, setRole] = useState('parent');
  const [view, setView] = useState<'month' | 'list'>('month');
  const [month, setMonth] = useState(new Date(2026, 8)); // Sep 2026
  const [branchFilter, setBranchFilter] = useState('all');

  const isLeader = ['admin', 'group_leader', 'branch_leader', 'coach'].includes(role);

  // Calendar grid
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function getDateStr(day: number) {
    return `${year}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function getItemsForDay(day: number) {
    const dateStr = String(day);
    const items: { title: string; time?: string; branch: string; color: string; cancelled?: boolean }[] = [];
    // Events
    EVENTS.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === mo && d.getDate() === day;
    }).forEach(e => items.push({ title: e.title, branch: e.branch, color: e.color }));
    // Regular meetings
    if (REGULAR_MEETINGS[dateStr]) {
      REGULAR_MEETINGS[dateStr].forEach(m => {
        const cancelled = CANCELLED.includes(dateStr);
        if (cancelled && !isLeader) return; // members don't see cancelled
        items.push({ title: m.branch + '集會', time: m.time, branch: m.branch, color: 'green', cancelled });
      });
    }
    if (branchFilter !== 'all') return items.filter(i => i.branch === branchFilter);
    return items;
  }

  // List view - all items sorted
  const listItems: { date: string; title: string; time?: string; branch: string; color: string; cancelled?: boolean; type: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    getItemsForDay(d).forEach(item => {
      listItems.push({ date: getDateStr(d), ...item, type: item.time ? 'meeting' : 'event' });
    });
  }

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <main className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">

      {/* Demo */}
      <div className="flex gap-1.5 flex-wrap">
        <span className="text-[9px] text-slate-400 mr-1 self-center">Demo：</span>
        {['parent', 'member', 'branch_leader', 'admin'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {r === 'parent' ? '家長' : r === 'member' ? '成員' : r === 'branch_leader' ? '支部領袖' : '管理員'}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-lg">📅 行事曆</h1>
        <div className="flex gap-1.5">
          <button onClick={() => setView('month')} className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${view === 'month' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>月曆</button>
          <button onClick={() => setView('list')} className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${view === 'list' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>清單</button>
        </div>
      </div>

      {/* Branch filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {[{ id: 'all', label: '全部' }, { id: '小童軍', label: '小童軍' }, { id: '幼童軍', label: '幼童軍' }, { id: '童軍', label: '童軍' }, { id: '深資', label: '深資' }, { id: '樂行', label: '樂行' }, { id: '全旅', label: '全旅' }].map(b => (
          <button key={b.id} onClick={() => setBranchFilter(b.id)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap border ${branchFilter === b.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            {b.label}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-2">
        <button onClick={() => setMonth(new Date(year, mo - 1))} className="text-sm font-bold text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100">← 上月</button>
        <h2 className="font-bold text-sm">{year}年 {monthNames[mo]}</h2>
        <button onClick={() => setMonth(new Date(year, mo + 1))} className="text-sm font-bold text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100">下月 →</button>
      </div>

      {/* ═══════════════════════════════════════
          月曆視圖
          ═══════════════════════════════════════ */}
      {view === 'month' && (
        <div className="month-grid">
          {['日', '一', '二', '三', '四', '五', '六'].map(w => (
            <div key={w} className="month-head">{w}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="month-cell dim" />;
            const items = getItemsForDay(day);
            const isToday = day === 30 && mo === 8; // fake today
            return (
              <div key={i} className={`month-cell ${isToday ? 'ring-2 ring-brand-400' : ''}`}>
                <div className="day-num">{day}</div>
                {items.slice(0, 3).map((item, j) => (
                  <div key={j} className={`mini-event ${item.cancelled ? 'cancelled' : ''}`}
                    style={{ borderLeft: `3px solid ${BRANCH_COLORS[item.branch] || '#999'}` }}>
                    {item.time && <span className="text-[8px] opacity-70">{item.time.slice(0, 5)} </span>}
                    {item.title}
                    {item.cancelled && isLeader && <span className="text-[7px] text-rose-600 ml-0.5">取消</span>}
                  </div>
                ))}
                {items.length > 3 && <div className="text-[8px] text-slate-400 text-center">+{items.length - 3}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════
          清單視圖
          ═══════════════════════════════════════ */}
      {view === 'list' && (
        <div className="space-y-2">
          {listItems.length === 0 && <p className="text-center text-sm text-slate-400 py-8">此月份暫無活動</p>}
          {listItems.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 card-hover"
              style={{ borderLeft: `4px solid ${BRANCH_COLORS[item.branch] || '#999'}` }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {item.cancelled && <span className="text-[8px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-bold">已取消</span>}
                  <span className="font-bold text-xs">{item.title}</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">{item.date} {item.time && `· ${item.time}`} · {item.branch}</div>
              </div>
              <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${item.type === 'event' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {item.type === 'event' ? '活動' : '集會'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════
          領袖：集會規則管理
          ═══════════════════════════════════════ */}
      {isLeader && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">⚙️ 集會規則</h3>
            <button className="text-[10px] bg-brand-600 text-white px-2.5 py-1 rounded-lg font-bold">+ 新增規則</button>
          </div>
          <div className="space-y-1.5">
            {[
              { branch: '童軍', weekday: '星期一', time: '19:00-21:00', location: '旅團部', active: true },
              { branch: '幼童軍', weekday: '星期三', time: '18:00-19:30', location: '旅團部', active: true },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: BRANCH_COLORS[r.branch] }} />
                  <span className="font-bold text-[11px]">{r.branch}</span>
                  <span className="text-[10px] text-slate-500">{r.weekday} {r.time} · {r.location}</span>
                </div>
                <div className="flex gap-1">
                  <button className="text-[9px] text-slate-400 px-1.5 py-0.5 rounded hover:bg-slate-200">編輯</button>
                  <button className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {r.active ? '啟用' : '停用'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-400">💡 在月曆上按 ✕ 可取消某日集會，按 ↺ 可恢復。</p>
        </section>
      )}
    </main>
  );
}
