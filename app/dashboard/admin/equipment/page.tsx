'use client';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   MOCK 物資管理 —— 對照用戶「管理中心：物資管理」
   物資清單 + 借用批核 + 庫存調整（與真實 /admin/equipment 對齊）。
   ═══════════════════════════════════════════════════ */

type Item = { id: string; name: string; category: string; unit: string; total: number; available: number; location: string };

const SEED: Item[] = [
  { id: 'eq1', name: '4 人營帳', category: '露營', unit: '頂', total: 8, available: 6, location: '旅部物資房' },
  { id: 'eq2', name: '營燈', category: '露營', unit: '盞', total: 10, available: 9, location: '旅部物資房' },
  { id: 'eq3', name: '急救包', category: '安全', unit: '套', total: 3, available: 3, location: '領袖室' },
];

type Loan = { id: string; item: string; member: string; branch: string; qty: number; borrow: string; due: string; status: 'pending' | 'approved' | 'rejected' | 'returned' };

const SEED_LOANS: Loan[] = [
  { id: 'l1', item: '4 人營帳', member: '王小明', branch: '童軍', qty: 2, borrow: '2026-09-18', due: '2026-09-21', status: 'pending' },
  { id: 'l2', item: '營燈', member: '李大文', branch: '童軍', qty: 3, borrow: '2026-09-18', due: '2026-09-21', status: 'approved' },
];

export default function EquipmentAdminPage() {
  const [role, setRole] = useState('admin');
  const [tab, setTab] = useState<'items' | 'loans'>('items');
  const [items, setItems] = useState<Item[]>(SEED);
  const [loans, setLoans] = useState<Loan[]>(SEED_LOANS);
  const [msg, setMsg] = useState('');

  const isLeader = ['admin', 'group_leader', 'branch_leader', 'coach'].includes(role);

  function decide(id: string, status: 'approved' | 'rejected' | 'returned') {
    setLoans(prev => prev.map(l => {
      if (l.id !== id) return l;
      if (status === 'approved') {
        setItems(prev2 => prev2.map(i => i.name === l.item ? { ...i, available: i.available - l.qty } : i));
        setMsg(`✅ 已批核「${l.item}」${l.qty}${items.find(i => i.name === l.item)?.unit || ''}，庫存已扣減`);
      } else if (status === 'returned') {
        setItems(prev2 => prev2.map(i => i.name === l.item ? { ...i, available: i.available + l.qty } : i));
        setMsg(`✅ 已確認歸還「${l.item}」，庫存已回補`);
      } else {
        setMsg(`❌ 已拒絕「${l.item}」借用申請`);
      }
      return { ...l, status };
    }));
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[13px] text-slate-500 mr-1">Demo：</span>
        {['member', 'branch_leader', 'admin'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`text-[13px] px-2 py-0.5 rounded-full border font-bold ${role === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {r === 'member' ? '成員' : r === 'branch_leader' ? '支部領袖' : '管理員'}
          </button>
        ))}
      </div>

      <h1 className="font-bold text-lg m-0">📦 物資管理</h1>

      <div className="flex gap-1.5">
        <button onClick={() => setTab('items')} className={`text-[13px] px-3 py-1.5 rounded-full font-bold border ${tab === 'items' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>🏠 物資清單</button>
        <button onClick={() => setTab('loans')} className={`text-[13px] px-3 py-1.5 rounded-full font-bold border ${tab === 'loans' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>📋 借用紀錄 ({loans.filter(l => l.status === 'pending').length})</button>
      </div>

      {msg && <div className="text-[13px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">{msg}</div>}

      {tab === 'items' && (
        <div className="space-y-2">
          {isLeader && (
            <button className="text-[13px] bg-brand-600 text-white px-3 py-1.5 rounded-lg font-bold">+ 新增物資</button>
          )}
          {items.map(it => (
            <div key={it.id} className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">{it.name}</span>
                <span className="text-[13px] text-slate-500">{it.category} · {it.location}</span>
              </div>
              <div className="text-[13px] text-slate-500">
                總數 {it.total} {it.unit} · 可借 <strong className="text-emerald-700">{it.available}</strong> {it.unit}
              </div>
              {isLeader && (
                <div className="flex gap-2 mt-2">
                  <button className="text-[13px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">＋ 入庫</button>
                  <button className="text-[13px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">－ 報廢</button>
                  <button className="text-[13px] text-slate-500 px-2 py-1 rounded hover:bg-slate-100">編輯</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'loans' && (
        <div className="space-y-2">
          {loans.map(l => (
            <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">📦 {l.item} × {l.qty}</span>
                <span className={`text-[13px] px-2 py-0.5 rounded-full font-bold ${
                  l.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  l.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {l.status === 'pending' ? '待批核' : l.status === 'approved' ? '已批核（未歸還）' : '已歸還'}
                </span>
              </div>
              <div className="text-[13px] text-slate-500">{l.member} · {l.branch} · {l.borrow} → {l.due}</div>
              {isLeader && l.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => decide(l.id, 'approved')} className="flex-1 text-[13px] font-bold py-1.5 rounded-lg bg-emerald-700 text-white">✅ 批核（扣庫存）</button>
                  <button onClick={() => decide(l.id, 'rejected')} className="flex-1 text-[13px] font-bold py-1.5 rounded-lg bg-rose-100 text-rose-700">❌ 拒絕</button>
                </div>
              )}
              {isLeader && l.status === 'approved' && (
                <button onClick={() => decide(l.id, 'returned')} className="mt-2 w-full text-[13px] font-bold py-1.5 rounded-lg bg-brand-600 text-white">✅ 已歸還（Tick，回補庫存）</button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
