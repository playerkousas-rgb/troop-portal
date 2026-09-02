'use client';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   MOCK 點名 —— 對照用戶定義：
   「領袖登入後應該看到下方 4 格：行事曆 · 最新消息 · 點名 · 管理中心」
   點名 = 恆常集會／活動的出席紀錄（P／A／L／E／S），與報名分開。
   有權限者直接喺呢一頁點名，唔使跳去管理工具。
   ═══════════════════════════════════════════════════ */

const STATUS = [
  { id: 'P', label: '出席', tone: 'att-status-P' },
  { id: 'A', label: '缺席', tone: 'att-status-A' },
  { id: 'L', label: '遲到', tone: 'att-status-L' },
  { id: 'E', label: '早退', tone: 'att-status-E' },
  { id: 'S', label: '病假', tone: 'att-status-S' },
] as const;

type Row = { id: string; name: string; branch: string; patrol: string; status: '' | 'P' | 'A' | 'L' | 'E' | 'S' };

const SEED: Row[] = [
  { id: 'm1', name: '王小明', branch: '童軍', patrol: 'TIGER', status: '' },
  { id: 'm2', name: '李大文', branch: '童軍', patrol: 'SEAGULL', status: '' },
  { id: 'm3', name: '張小芳', branch: '幼童軍', patrol: 'RED', status: '' },
  { id: 'm4', name: '陳偉強', branch: '深資', patrol: '', status: '' },
];

const SESSIONS = [
  { id: 's1', title: '恆常集會', date: '2026-09-07（一）', time: '19:00-21:00', location: '旅團部' },
  { id: 's2', title: '旅團露營（第 1 日）', date: '2026-09-20（日）', time: '09:00-22:00', location: '西貢白沙灣' },
];

export default function AttendancePage() {
  const [role, setRole] = useState('branch_leader');
  const [sessionId, setSessionId] = useState('s1');
  const [rows, setRows] = useState<Row[]>(SEED);
  const [msg, setMsg] = useState('');
  const [savedAt, setSavedAt] = useState('');

  const isLeader = ['admin', 'group_leader', 'branch_leader', 'coach'].includes(role);
  const session = SESSIONS.find(s => s.id === sessionId)!;

  function setStatus(id: string, s: Row['status']) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, status: r.status === s ? '' : s } : r)));
    setMsg('');
  }

  function save() {
    const marked = rows.filter(r => r.status).length;
    setSavedAt(`${marked}/${rows.length} 人已點名`);
    setMsg(`✅ 已儲存「${session.title}」點名（${marked} 人已標記）`);
  }

  const counts = STATUS.map(st => ({ ...st, n: rows.filter(r => r.status === st.id).length }));

  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      {/* Demo 角色 */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[13px] text-slate-500 mr-1">Demo：</span>
        {['member', 'branch_leader', 'admin'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`text-[13px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {r === 'member' ? '成員' : r === 'branch_leader' ? '支部領袖' : '管理員'}
          </button>
        ))}
        {isLeader && <span className="text-[13px] text-emerald-700 font-bold">· 你可直接喺本頁點名</span>}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-bold text-lg m-0">📝 點名</h1>
        {!isLeader && <span className="text-[13px] text-slate-500">你只可查看自己嘅出席紀錄</span>}
      </div>
      <p className="text-[13px] text-slate-500 m-0 -mt-2 leading-relaxed">
        點名＝出席紀錄（P／A／L／E／S），同「報名」分開：報名係「想唔想參加」，點名係「當日實際有冇嚟」。
        領袖開放點名後，成員／家長都可查看自己嘅出席紀錄。
      </p>

      {msg && <div className="text-[13px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">{msg}</div>}

      {/* 選擇場次 */}
      <div className="flex gap-1.5 flex-wrap">
        {SESSIONS.map(s => (
          <button key={s.id} onClick={() => { setSessionId(s.id); setMsg(''); }}
            className={`text-[13px] px-2.5 py-1.5 rounded-full font-bold border ${sessionId === s.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            {s.title}
          </button>
        ))}
      </div>
      <div className="text-[13px] text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">
        📅 {session.date} · ⏰ {session.time} · 📍 {session.location}
      </div>

      {/* 出席統計 */}
      <div className="grid grid-cols-5 gap-1.5">
        {counts.map(c => (
          <div key={c.id} className={`rounded-xl px-2 py-1.5 text-center ${c.n > 0 ? 'bg-white border border-slate-200' : 'bg-slate-50'}`}>
            <div className="text-[13px] font-extrabold">{c.id} · {c.n}</div>
            <div className="text-[13px] text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>

      {/* 名單 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-1.5">
        {rows.map(r => (
          <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[13px]">{r.name}</span>
                <span className="text-[13px] text-slate-500">{r.branch} · {r.patrol || '—'}</span>
              </div>
            </div>
            {isLeader ? (
              <div className="flex gap-1 flex-shrink-0">
                {STATUS.map(st => (
                  <button key={st.id} onClick={() => setStatus(r.id, st.id)}
                    className={`att-chip ${st.tone} ${r.status === st.id ? 'ring-2 ring-current' : 'opacity-60'}`}>
                    {st.id}
                  </button>
                ))}
              </div>
            ) : (
              <span className={`att-chip ${r.status ? `att-status-${r.status}` : 'bg-slate-200 text-slate-500'}`}>
                {r.status ? `已點名 ${r.status}` : '未點名'}
              </span>
            )}
          </div>
        ))}
        {isLeader && (
          <button onClick={save} className="w-full text-[12px] font-bold bg-brand-600 text-white py-2.5 rounded-xl">
            💾 儲存點名
          </button>
        )}
      </div>
    </main>
  );
}
