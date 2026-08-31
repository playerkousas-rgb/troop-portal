'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isMockMode } from '@/lib/mock';
import { isAdmin, ROLE_LABEL, Role } from '@/lib/model';
import { clearSession } from '@/lib/session';

export default function TopNav() {
  const pathname = usePathname();
  const [troop, setTroop] = useState<{ name: string; id: string } | null>(null);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [mockOn, setMockOn] = useState(false);

  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null');
      if (t) setTroop({ name: t.name, id: t.id });
    } catch {}
    try {
      const u = JSON.parse(localStorage.getItem('scoutsystem2_current_user') || 'null');
      if (u) setUser({ name: u.name, role: u.role });
    } catch {}
    setMockOn(isMockMode());
  }, [pathname]);

  const admin = isAdmin(user?.role as Role);
  // 首頁（登入旅團頁）：頂欄只顯示 Scout System，右邊唔顯示登入／帳戶選單
  const isLanding = pathname === '/';

  // 已登入 → 回到該角色的真實控制台（不是 /dashboard 的 mock 展示樹）
  const home =
    user?.role === 'parent' ? '/parent' :
    user?.role === 'member' ? '/member' :
    admin || user?.role === 'group_leader' || user?.role === 'branch_leader' || user?.role === 'coach' ? '/admin' :
    '/calendar';

  function logout() {
    clearSession();
    window.location.href = '/';
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        {/* 左：身份 */}
        <Link href={user ? home : '/'} className="flex items-center gap-2 no-underline min-w-0">
          <div className="w-8 h-8 bg-scout-blue text-white rounded-xl flex items-center justify-center text-sm flex-shrink-0">⚜</div>
          {mockOn && (
            <span className="text-[11px] font-black bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-1.5 py-0.5 flex-shrink-0">🎭 DEMO</span>
          )}
          <div className="min-w-0">
            {user ? (
              <>
                <div className="font-bold text-xs text-slate-800 truncate">{user.name}</div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  {troop?.name || '旅團'} · {ROLE_LABEL[user.role as Role] || user.role}
                </div>
              </>
            ) : (
              <>
                <div className="font-bold text-xs text-scout-blue truncate">{isLanding ? 'Scout System' : troop?.name || '旅團管理系統'}</div>
                {!isLanding && <div className="text-[11px] text-slate-500 font-semibold">2026 Scout System</div>}
              </>
            )}
          </div>
        </Link>

        {/* 右：操作（首頁隱藏） */}
        {!isLanding && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {admin && (
            <>
              <Link href="/admin/settings" className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-600 transition" title="系統設定">
                <span className="text-sm">⚙️</span>
              </Link>
              <Link href="/admin/plugins" className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-600 transition" title="元件管理">
                <span className="text-sm">🧩</span>
              </Link>
            </>
          )}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
              >
                <span>⋮</span>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-50 min-w-[140px]">
                    <Link href="/equipment" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 no-underline" onClick={() => setShowMenu(false)}>
                      <span>📦</span> 借用物資
                    </Link>
                    <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 no-underline" onClick={() => setShowMenu(false)}>
                      <span>👤</span> 我的資料
                    </Link>
                    <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 no-underline" onClick={() => setShowMenu(false)}>
                      <span>🔑</span> 改密碼
                    </Link>
                    <Link href={home} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 no-underline" onClick={() => setShowMenu(false)}>
                      <span>🏠</span> 我的控制台
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 w-full text-left border-0 bg-transparent cursor-pointer"
                    >
                      <span>🚪</span> 登出
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-[11px] font-bold text-white bg-brand-600 px-2.5 py-1 rounded-lg hover:bg-brand-700 transition"
            >
              登入
            </Link>
          )}
        </div>
        )}
      </div>
    </header>
  );
}
