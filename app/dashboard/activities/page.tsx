'use client';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   模擬資料
   ═══════════════════════════════════════════════════ */

type Activity = {
  id: string; title: string; date: string; type: 'internal' | 'external'; location: string; fee: string;
  deadline: string; myStatus: 'registered' | 'pending' | 'unresponded' | 'attended'; myPaid: 'confirmed' | 'pending' | 'unpaid';
};
type PastActivity = { id: string; title: string; date: string; type: 'internal'; location: string; myStatus: 'attended' };
type CrossBranchActivity = { id: string; title: string; date: string; branch: string; location: string; type: 'help' };

const CURRENT_ACTIVITIES: Activity[] = [
  { id: 'a1', title: '旅團露營', date: '9月20-21日', type: 'internal' as const, location: '西貢白沙灣', fee: '$300', deadline: '9月15日', myStatus: 'registered' as const, myPaid: 'confirmed' as const },
  { id: 'a2', title: '區運會', date: '10月5日', type: 'internal' as const, location: '九龍公園', fee: '$50', deadline: '9月28日', myStatus: 'pending' as const, myPaid: 'unpaid' as const },
  { id: 'a3', title: '總區領袖訓練', date: '9月28日', type: 'external' as const, location: '九龍塘', fee: '免費', deadline: '9月20日', myStatus: 'unresponded' as const, myPaid: 'unpaid' as const },
  { id: 'a4', title: '世界思緒日活動', date: '10月18日', type: 'external' as const, location: '待定', fee: '$30', deadline: '10月10日', myStatus: 'unresponded' as const, myPaid: 'unpaid' as const },
];

const PAST_ACTIVITIES = [
  { id: 'p1', title: '暑期露營', date: '7月15-16日', type: 'internal' as const, location: '創興水上活動中心', myStatus: 'attended' as const },
  { id: 'p2', title: '8月旅團集會', date: '8月24日', type: 'internal' as const, location: '旅團部', myStatus: 'attended' as const },
];

// 深資/樂行成員被指定看到的外支部活動
const CROSS_BRANCH_ACTIVITIES = [
  { id: 'cb1', title: '幼童軍家長日', date: '10月3日', branch: '幼童軍', location: '旅團部', type: 'help' as const },
];

export default function ActivitiesPage() {
  const [role, setRole] = useState('parent');
  const [showPast, setShowPast] = useState(false);
  const [filter, setFilter] = useState<'all' | 'internal' | 'external'>('all');

  const isParentOrMember = role === 'parent' || role === 'member';
  const isVentureRover = role === 'venture_demo'; // demo: 深資成員被指定看外支部

  const filteredActivities: Activity[] = filter === 'all'
    ? CURRENT_ACTIVITIES
    : CURRENT_ACTIVITIES.filter(a => a.type === filter);

  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">

      {/* Demo */}
      <div className="flex gap-1.5 flex-wrap">
        <span className="text-[9px] text-slate-400 mr-1 self-center">Demo：</span>
        {['parent', 'member', 'venture_demo'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {r === 'parent' ? '家長' : r === 'member' ? '成員' : '深資成員(被指定)'}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          篩選
          ═══════════════════════════════════════ */}
      <div className="flex gap-1.5">
        {[
          { id: 'all' as const, label: '全部' },
          { id: 'internal' as const, label: '🏠 旅團內部' },
          { id: 'external' as const, label: '📚 外部（圖書館）' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-[10px] px-3 py-1.5 rounded-full font-bold border ${filter === f.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          深資/樂行被指定的外支部活動
          ═══════════════════════════════════════ */}
      {(role === 'venture_demo') && CROSS_BRANCH_ACTIVITIES.length > 0 && (
        <section className="bg-violet-50 rounded-2xl border border-violet-200 p-3">
          <h3 className="font-bold text-[11px] text-violet-800 mb-2 flex items-center gap-1.5">
            <span className="text-sm">🌟</span> 外支部活動（你的領袖指定給你看）
          </h3>
          {CROSS_BRANCH_ACTIVITIES.map(a => (
            <div key={a.id} className="bg-white rounded-xl p-2.5 border border-violet-100 mb-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[8px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold mr-1">{a.branch}</span>
                  <span className="font-bold text-[11px]">{a.title}</span>
                </div>
                <span className="text-[9px] text-slate-400">{a.date}</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-1">{a.location}</div>
              <button className="mt-1.5 w-full text-[10px] font-bold py-1.5 rounded-lg bg-violet-100 text-violet-700">❤️ 有興趣幫忙</button>
            </div>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════
          目前活動（最新）
          ═══════════════════════════════════════ */}
      <section className="space-y-2">
        {filteredActivities.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-4 card-hover">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${a.type === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                  {a.type === 'internal' ? '🏠 內部' : '📚 外部'}
                </span>
                <span className="font-bold text-sm">{a.title}</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 space-y-0.5 mb-3">
              <div>📅 {a.date} · 📍 {a.location} · 💰 {a.fee}</div>
              <div>截止報名：{a.deadline}</div>
            </div>

            {/* 家長/成員：回覆 + 付款狀態 */}
            {isParentOrMember && (
              <div>
                <div className="flex gap-1.5 mb-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    a.myStatus === 'registered' ? 'bg-emerald-100 text-emerald-700' :
                    a.myStatus === 'pending' ? 'bg-slate-100 text-slate-500' :
                    'bg-slate-50 text-slate-400'
                  }`}>
                    {a.myStatus === 'registered' ? '✅ 已報名' : a.myStatus === 'pending' ? '⚠️ 待回覆' : '未回覆'}
                  </span>
                  {a.myStatus === 'registered' && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      a.myPaid === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                      a.myPaid === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {a.myPaid === 'confirmed' ? '💰 已核實' : a.myPaid === 'pending' ? '💰 待核實' : '❌ 未付'}
                    </span>
                  )}
                </div>
                {/* 快捷回覆 */}
                <div className="flex gap-1.5">
                  {role === 'parent' && a.myStatus !== 'registered' && (
                    <>
                      <button className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-emerald-600 text-white">✅ 確認參加</button>
                      <button className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-pink-100 text-pink-700">❤️ 有興趣</button>
                      <button className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-rose-100 text-rose-700">❌ 不參加</button>
                    </>
                  )}
                  {role === 'member' && (
                    <>
                      <button className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-pink-100 text-pink-700">❤️ 有興趣</button>
                      <span className="text-[8px] text-slate-400 self-center">參加由家長確認</span>
                    </>
                  )}
                  {a.myStatus === 'registered' && a.myPaid !== 'confirmed' && (
                    <button className="text-[9px] font-bold py-1.5 px-3 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">💰 標記已付款</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ═══════════════════════════════════════
          過往活動（摺疊，只限內部已參加的）
          ═══════════════════════════════════════ */}
      {isParentOrMember && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <button onClick={() => setShowPast(!showPast)} className="w-full flex items-center justify-between text-left">
            <h3 className="font-bold text-xs text-slate-600 flex items-center gap-1.5">
              📁 過往參加的活動（旅團內部）
            </h3>
            <span className="text-slate-400 text-xs">{showPast ? '▲ 收起' : '▼ 展開'}</span>
          </button>
          {showPast && (
            <div className="space-y-1.5 mt-3">
              {PAST_ACTIVITIES.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                  <div>
                    <div className="text-[11px] font-bold">{p.title}</div>
                    <div className="text-[9px] text-slate-400">{p.date} · {p.location}</div>
                  </div>
                  <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">✓ 已參加</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
