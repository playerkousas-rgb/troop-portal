'use client';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════
   模擬資料
   ═══════════════════════════════════════════════════ */

type Role = 'admin' | 'group_leader' | 'branch_leader' | 'coach' | 'parent' | 'member';
const ROLE_LABEL: Record<Role, string> = {
  admin: '管理員', group_leader: '團長', branch_leader: '支部領袖',
  coach: '教練員', parent: '家長', member: '成員',
};
const ROLE_COLOR: Record<Role, string> = {
  admin: 'bg-rose-100 text-rose-700', group_leader: 'bg-purple-100 text-purple-700',
  branch_leader: 'bg-blue-100 text-blue-700', coach: 'bg-amber-100 text-amber-700',
  parent: 'bg-emerald-100 text-emerald-700', member: 'bg-slate-100 text-slate-600',
};

type LeaderUser = {
  id: string; name: string; role: Role; branchId: string; branchName: string;
  email: string; active: boolean; crossBranchAccess?: { branchId: string; branchName: string; grantedBy: string }[];
};

// 領袖列表（管理者看到所有領袖，以便開放權限）
// 注意：林深資（深資團長）被李團長（童軍團長）邀請看童軍活動
// 林深資自己不能開放幼童軍，因為他根本沒有幼童軍的權限
const LEADERS: LeaderUser[] = [
  { id: 'u1', name: '陳大文', role: 'admin', branchId: 'all', branchName: '全旅', email: 'admin@scout82.org', active: true },
  { id: 'u2', name: '李團長', role: 'group_leader', branchId: 'b3', branchName: '童軍', email: 'lee@scout82.org', active: true, crossBranchAccess: [] },
  { id: 'u3', name: '黃支部', role: 'branch_leader', branchId: 'b3', branchName: '童軍', email: 'wong@scout82.org', active: true, crossBranchAccess: [] },
  { id: 'u4', name: '何教練', role: 'coach', branchId: 'b3', branchName: '童軍', email: 'ho@scout82.org', active: true },
  { id: 'u5', name: '林深資', role: 'group_leader', branchId: 'b4', branchName: '深資', email: 'lam@scout82.org', active: true,
    // 林深資被童軍團長邀請看童軍活動（正確方向：團長開放自己支部給別人看）
    crossBranchAccess: [{ branchId: 'b3', branchName: '童軍', grantedBy: '李團長' }]
  },
  { id: 'u6', name: '張幼童', role: 'group_leader', branchId: 'b2', branchName: '幼童軍', email: 'cheung@scout82.org', active: true, crossBranchAccess: [] },
];

// 支部內成員/家長（按支部篩選）
const BRANCH_MEMBERS = [
  { id: 'm1', name: '王小明', role: 'member' as Role, branchId: 'b3', branchName: '童軍', patrol: 'TIGER' },
  { id: 'm2', name: '李大文', role: 'member' as Role, branchId: 'b3', branchName: '童軍', patrol: 'SEAGULL' },
  { id: 'm3', name: '王爸爸', role: 'parent' as Role, branchId: 'b3', branchName: '童軍', patrol: '' },
  { id: 'm4', name: '張小芳', role: 'member' as Role, branchId: 'b2', branchName: '幼童軍', patrol: 'RED' },
];

export default function UsersPage() {
  const [filter, setFilter] = useState<'all' | Role>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [tab, setTab] = useState<'leaders' | 'members' | 'bulk' | 'permissions'>('leaders');

  // 篩選領袖
  const filteredLeaders = LEADERS.filter(l => {
    if (filter !== 'all' && l.role !== filter) return false;
    if (branchFilter !== 'all' && l.branchId !== branchFilter && l.branchId !== 'all') return false;
    return true;
  });

  // 篩選成員
  const filteredMembers = BRANCH_MEMBERS.filter(m => {
    if (branchFilter !== 'all' && m.branchId !== branchFilter) return false;
    if (filter !== 'all' && m.role !== filter) return false;
    return true;
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">👤 使用者管理</h1>

      {/* ── 分頁 ── */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { id: 'leaders' as const, label: '領袖列表' },
          { id: 'members' as const, label: '成員/家長' },
          { id: 'bulk' as const, label: '批量開戶' },
          { id: 'permissions' as const, label: '權限管理' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`text-[13px] px-3 py-1.5 rounded-full font-bold border transition ${
              tab === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 篩選列 ── */}
      <div className="flex gap-2 flex-wrap">
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          className="text-[13px] rounded-lg border border-slate-200 px-2 py-1.5 bg-white">
          <option value="all">全部支部</option>
          <option value="b1">小童軍</option>
          <option value="b2">幼童軍</option>
          <option value="b3">童軍</option>
          <option value="b4">深資</option>
          <option value="b5">樂行</option>
        </select>
        <select value={filter} onChange={e => setFilter(e.target.value as any)}
          className="text-[13px] rounded-lg border border-slate-200 px-2 py-1.5 bg-white">
          <option value="all">全部角色</option>
          <option value="admin">管理員</option>
          <option value="group_leader">團長</option>
          <option value="branch_leader">支部領袖</option>
          <option value="coach">教練員</option>
          <option value="parent">家長</option>
          <option value="member">成員</option>
        </select>
      </div>

      {/* ═══════════════════════════════════════════
          領袖列表（含跨支部授權）
          ═══════════════════════════════════════════ */}
      {tab === 'leaders' && (
        <section className="space-y-2">
          <p className="text-[13px] text-slate-500">
            顯示所有領袖。團長/支部領袖可開放自己支部給其他領袖查看。教練員需授權才能看資料。
          </p>
          {filteredLeaders.map(l => (
            <div key={l.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-sm">👤</div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      {l.name}
                      <span className={`text-[13px] px-1.5 py-0.5 rounded font-bold ${ROLE_COLOR[l.role]}`}>{ROLE_LABEL[l.role]}</span>
                    </div>
                    <div className="text-[13px] text-slate-500">{l.email} · {l.branchName}</div>
                  </div>
                </div>
                <span className={`text-[13px] px-2 py-0.5 rounded-full font-bold ${l.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {l.active ? '啟用' : '停用'}
                </span>
              </div>

              {/* 跨支部權限 — 此領袖已被其他團長開放看哪些支部 */}
              {l.role !== 'coach' && l.role !== 'admin' && (
                <div className="border-t border-slate-100 pt-2 mt-2 space-y-2">
                  {/* 他已被開放看其他支部 */}
                  {l.crossBranchAccess && l.crossBranchAccess.length > 0 && (
                    <div>
                      <span className="text-[13px] font-bold text-slate-500">👁️ 已獲授權查看</span>
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {l.crossBranchAccess.map((cb, i) => (
                          <span key={i} className="text-[13px] bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-lg font-bold">
                            {cb.branchName}（由 {cb.grantedBy} 開放）
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 開放自己支部給其他人看的按鈕 */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-slate-500">🔓 開放 {l.branchName} 給其他領袖</span>
                      <button className="text-[13px] bg-brand-600 text-white px-2 py-0.5 rounded font-bold">+ 邀請</button>
                    </div>
                    <span className="text-[13px] text-slate-500">邀請其他團長/領袖查看你的 {l.branchName} 活動及資料</span>
                  </div>

                  {/* 深資/樂行特殊設定：可指定成員看其他支部活動 */}
                  {['b4', 'b5'].includes(l.branchId) && l.crossBranchAccess && l.crossBranchAccess.length > 0 && (
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-2.5 mt-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-bold text-violet-700">🌟 指定成員查看外支部活動</span>
                        <button className="text-[13px] bg-violet-600 text-white px-2 py-0.5 rounded font-bold">+ 指定</button>
                      </div>
                      <p className="text-[13px] text-violet-600 mb-2">
                        你已獲授權查看其他支部。可指定你的成員也看到，讓他們知道有什麼活動可以幫忙。
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5 text-[13px]">
                          <span className="font-bold">張大偉 → 可看童軍活動</span>
                          <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">✓ 已指定</span>
                        </div>
                        <div className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5 text-[13px]">
                          <span className="font-bold">李美玲 → 可看幼童軍活動</span>
                          <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">✓ 已指定</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 教練員授權提示 */}
              {l.role === 'coach' && (
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <span className="text-[13px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg font-bold border border-amber-200">
                    ⚠️ 教練員需由支部/管理員授權才能查看資料
                  </span>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════
          成員/家長列表
          ═══════════════════════════════════════════ */}
      {tab === 'members' && (
        <section className="space-y-2">
          {filteredMembers.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-xs">
                  {m.role === 'parent' ? '👨‍👩‍👧' : '🧒'}
                </div>
                <div>
                  <div className="font-bold text-[13px]">{m.name}</div>
                  <div className="text-[13px] text-slate-500">{m.branchName} {m.patrol ? `· ${m.patrol}` : ''}</div>
                </div>
              </div>
              <span className={`text-[13px] px-2 py-0.5 rounded font-bold ${ROLE_COLOR[m.role]}`}>{ROLE_LABEL[m.role]}</span>
            </div>
          ))}
        </section>
      )}

      {/* ═══════════════════════════════════════════
          批量開戶
          ═══════════════════════════════════════════ */}
      {tab === 'bulk' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="font-bold text-sm">📥 批量開戶</h3>
          <p className="text-[13px] text-slate-500">下載 CSV 範本，填好後上傳，系統會自動建立帳號及成員。</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-brand-600 text-white py-2.5 rounded-xl text-xs font-bold">📥 下載 CSV 範本</button>
            <button className="bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold">📤 上傳 CSV</button>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          權限管理
          ═══════════════════════════════════════════ */}
      {tab === 'permissions' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="font-bold text-sm">🔐 權限管理</h3>
          <p className="text-[13px] text-slate-500">
            每位團長/支部領袖管理自己支部。可開放自己支部的活動給其他領袖查看。
          </p>
          <div className="space-y-2">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="font-bold text-[13px] mb-1">權限規則</div>
              <ul className="text-[13px] text-slate-600 space-y-1 list-disc pl-4">
                <li>管理員：可看全旅所有支部資料</li>
                <li>團長：可看所屬支部 + 開放自己支部給其他領袖</li>
                <li>支部領袖：可看所屬支部 + 授權教練員</li>
                <li>教練員：需由支部/管理員授權才能查看資料</li>
                <li>跨支部：A 團長可邀請 B 團長看 A 的活動（B 不能開放 A 的資料給 C，除非 A 也邀請了 C）</li>
                <li>範例：深資團長被童軍團長邀請看童軍活動 — 深資團長只看到童軍的活動卡片，但看不到幼童軍的</li>
              </ul>
            </div>
            {/* 深資/樂行特殊設定 */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
              <div className="font-bold text-[13px] text-violet-800 mb-1">🌟 深資 / 樂行特殊設定</div>
              <p className="text-[13px] text-violet-700 mb-2">深資和樂行成員年紀較大，經常被邀請到其他支部幫忙。</p>
              <div className="text-[13px] text-violet-700 space-y-1">
                <div className="flex gap-2">
                  <span className="font-bold text-violet-800 whitespace-nowrap">①</span>
                  <span>其他支部領袖（如幼童軍/童軍）開放自己的支部給深資/樂行領袖</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-violet-800 whitespace-nowrap">②</span>
                  <span>深資/樂行領袖看到後，指定自己的哪些成員也可以看到該支部活動</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-violet-800 whitespace-nowrap">③</span>
                  <span>被指定的成員便能看到該支部的活動，知道自己可以去幫忙</span>
                </div>
              </div>
              <p className="text-[13px] text-violet-700 mt-2">
                💡 因為深資/樂行領袖就是成員的領袖，所以不需要「雙方同意」— 領袖自己決定給誰看就行。
              </p>
            </div>
          </div>
        </section>
      )}

    </main>
  );
}
