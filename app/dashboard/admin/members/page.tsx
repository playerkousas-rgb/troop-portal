'use client';
import { useState } from 'react';

const MEMBERS = [
  { id: 'm1', name: '王小明', ymNumber: '1234567890', branch: '童軍', patrol: 'TIGER', patrolRole: '隊長', age: 13, active: true, parentName: '王爸爸', parentEmail: 'w@ex.com' },
  { id: 'm2', name: '李大文', ymNumber: '2345678901', branch: '童軍', patrol: 'SEAGULL', patrolRole: '', age: 14, active: true, parentName: '李媽媽', parentEmail: 'l@ex.com' },
  { id: 'm3', name: '張小芳', ymNumber: '3456789012', branch: '幼童軍', patrol: 'RED', patrolRole: '六長', age: 9, active: true, parentName: '張爸爸', parentEmail: 'z@ex.com' },
  { id: 'm4', name: '陳偉強', ymNumber: '4567890123', branch: '深資', patrol: '', patrolRole: '', age: 16, active: false, parentName: '陳媽媽', parentEmail: 'c@ex.com' },
];

const PARENTS = [
  { id: 'p1', name: '王爸爸', email: 'w@ex.com', children: '王小明 (童軍)' },
  { id: 'p2', name: '李媽媽', email: 'l@ex.com', children: '李大文 (童軍)' },
  { id: 'p3', name: '張爸爸', email: 'z@ex.com', children: '張小芳 (幼童軍)' },
];

export default function MembersPage() {
  const [tab, setTab] = useState<'members' | 'parents' | 'patrols'>('members');
  const [branch, setBranch] = useState('all');

  const filtered = MEMBERS.filter(m => branch === 'all' || (branch === 'b3' && m.branch === '童軍') || (branch === 'b2' && m.branch === '幼童軍') || (branch === 'b4' && m.branch === '深資'));

  return (
    <main className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">🏢 支部管理</h1>

      <div className="flex gap-1.5 flex-wrap">
        {[{ id: 'members' as const, label: '👥 成員' }, { id: 'parents' as const, label: '👨‍👩‍👧 家長' }, { id: 'patrols' as const, label: '🎖️ 小隊' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`text-[13px] px-3 py-1.5 rounded-full font-bold border ${tab === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>{t.label}</button>
        ))}
        <select value={branch} onChange={e => setBranch(e.target.value)} className="text-[13px] rounded-lg border border-slate-200 px-2 py-1 bg-white ml-auto">
          <option value="all">全部支部</option>
          <option value="b2">幼童軍</option>
          <option value="b3">童軍</option>
          <option value="b4">深資</option>
        </select>
      </div>

      {tab === 'members' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-slate-500">{filtered.length} 位成員</span>
            <button className="text-[13px] bg-brand-600 text-white px-3 py-1 rounded-lg font-bold">+ 新增成員</button>
          </div>
          {filtered.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-sm flex-shrink-0">🧒</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs">{m.name}</span>
                  <span className={`text-[13px] px-1 py-0.5 rounded font-bold ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{m.active ? '活躍' : '停用'}</span>
                  {m.patrolRole && <span className="text-[13px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-bold">★{m.patrolRole}</span>}
                </div>
                <div className="text-[13px] text-slate-500">{m.branch} · {m.patrol || '無小隊'} · YMIS {m.ymNumber} · {m.age}歲</div>
                <div className="text-[13px] text-slate-500">家長：{m.parentName} ({m.parentEmail})</div>
              </div>
              <button className="text-[13px] text-brand-600 font-bold flex-shrink-0">編輯 →</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'parents' && (
        <div className="space-y-2">
          <span className="text-[13px] text-slate-500">{PARENTS.length} 位家長</span>
          {PARENTS.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-sm flex-shrink-0">👨‍👩‍👧</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs">{p.name}</div>
                <div className="text-[13px] text-slate-500">{p.email}</div>
                <div className="text-[13px] text-slate-500">子女：{p.children}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'patrols' && (
        <div className="space-y-2">
          {[
            { branch: '童軍', patrols: [{ name: 'TIGER', count: 10, leader: '王小明 ★', members: '10人' }, { name: 'SEAGULL', count: 9, leader: '李大文 ★', members: '9人' }, { name: 'WOLF', count: 9, leader: '黃偉 ★', members: '9人' }] },
            { branch: '幼童軍', patrols: [{ name: 'RED', count: 6, leader: '張小芳 ★', members: '6人' }, { name: 'YELLOW', count: 5, leader: '', members: '5人' }, { name: 'BLUE', count: 6, leader: '', members: '6人' }, { name: 'GREEN', count: 5, leader: '', members: '5人' }] },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="font-bold text-xs mb-2">{b.branch}</div>
              <div className="flex gap-1.5 flex-wrap">
                {b.patrols.map((p, j) => (
                  <div key={j} className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-[13px] border border-slate-100">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-slate-500 ml-1">{p.members}</span>
                    {p.leader && <div className="text-[13px] text-emerald-700">★ {p.leader}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
