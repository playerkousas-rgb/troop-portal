'use client';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   模擬資料
   ═══════════════════════════════════════════════════ */

const LATEST_NEWS = [
  { id: 'n1', title: '9月旅團露營名額即將截止！', date: '2026-08-28', target: '全旅', urgent: true },
  { id: 'n2', title: '新學年第一次領袖會議', date: '2026-08-25', target: '領袖' },
  { id: 'n3', title: '幼童軍六長選舉結果公佈', date: '2026-08-20', target: '幼童軍' },
];

const NOTICES = [
  { id: 'p1', title: '9月集會安排', date: '2026-08-28', type: 'pdf' as const, branch: '全旅' },
  { id: 'p2', title: '旅團週年計劃 2026-27', date: '2026-08-15', type: 'pdf' as const, branch: '全旅' },
  { id: 'p3', title: '童軍支部露營須知', date: '2026-08-20', type: 'pdf' as const, branch: '童軍' },
];

export default function NoticesPage() {
  const [role, setRole] = useState('parent');
  const isLeader = ['admin', 'group_leader', 'branch_leader', 'coach'].includes(role);

  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">

      {/* Demo */}
      <div className="flex gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-500 mr-1 self-center">Demo：</span>
        {['parent', 'member', 'branch_leader'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {r === 'parent' ? '家長' : r === 'member' ? '成員' : '領袖'}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          最新消息（領袖可發，所有人看到）
          ═══════════════════════════════════════ */}
      <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-sm flex items-center gap-1.5">
            <span className="bg-amber-400 text-slate-900 text-[11px] font-extrabold px-2 py-0.5 rounded-lg">📣</span>
            最新消息
          </h2>
          {isLeader && (
            <button className="text-[11px] bg-amber-700 text-white px-2.5 py-1 rounded-lg font-bold">+ 發佈</button>
          )}
        </div>
        <div className="space-y-1.5">
          {LATEST_NEWS.map(n => (
            <div key={n.id} className={`rounded-xl px-3 py-2 flex items-center justify-between ${n.urgent ? 'bg-white border border-amber-200' : 'bg-white/60'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {n.urgent && <span className="text-[11px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-bold">急</span>}
                  <span className="font-bold text-[11px] truncate">{n.title}</span>
                </div>
                <div className="text-[11px] text-slate-500">{n.date} · {n.target}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          公告 PDF
          ═══════════════════════════════════════ */}
      <section>
        <h2 className="font-bold text-sm mb-2">📄 公告文件</h2>
        <div className="space-y-1.5">
          {NOTICES.map(n => (
            <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 card-hover">
              <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📄</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs truncate">{n.title}</div>
                <div className="text-[11px] text-slate-500">{n.date} · {n.branch}</div>
              </div>
              <span className="text-[11px] text-brand-600 font-bold flex-shrink-0">查看 →</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          領袖：通告管理
          ═══════════════════════════════════════ */}
      {isLeader && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-bold text-sm">📤 通告管理（領袖）</h2>
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-blue-600 text-white py-3 rounded-xl text-[11px] font-bold">
              📚 圖書館引入
              <div className="text-[11px] font-normal opacity-80 mt-0.5">外部通告接入</div>
            </button>
            <button className="bg-emerald-700 text-white py-3 rounded-xl text-[11px] font-bold">
              📝 自行上傳
              <div className="text-[11px] font-normal opacity-80 mt-0.5">Word 通告 + 標記資訊</div>
            </button>
          </div>
          {/* 手機上傳提示 */}
          <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
            <span className="text-sm">💻</span>
            <span className="text-[11px] text-slate-500">上傳文件建議使用電腦版，操作更方便。</span>
          </div>
        </section>
      )}
    </main>
  );
}
