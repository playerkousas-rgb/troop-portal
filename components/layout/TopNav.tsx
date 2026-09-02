'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isMockMode } from '@/lib/mock';
import { isAdmin, ROLE_LABEL, Role } from '@/lib/model';
import { clearSession, getSession } from '@/lib/session';
import { useConfirm, kv } from '@/components/ConfirmProvider';

/**
 * 頂部導覽列 —— 參考 reference APP 的右上角：
 *   顯示身份（姓名＋角色）・改密碼・登出／登入
 *   管理員額外有「⚙️ 系統設定」小圖示（點進去即系統設定）。
 */
export default function TopNav() {
  const pathname = usePathname();
  const [troop, setTroop] = useState<{ name: string; id: string } | null>(null);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [mockOn, setMockOn] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null');
      if (t) setTroop({ name: t.name, id: t.id });
    } catch {}
    const u = getSession();
    setUser(u ? { name: u.name, role: u.role } : null);
    setMockOn(isMockMode());
  }, [pathname]);

  const admin = isAdmin(user?.role as Role);
  const home =
    user?.role === 'parent' ? '/parent' :
    user?.role === 'member' ? '/member' :
    admin ? '/admin' :
    user?.role === 'group_leader' || user?.role === 'branch_leader' || user?.role === 'coach' ? '/leader' :
    '/calendar';

  const isMockPreview = pathname?.startsWith('/dashboard');
  const isHome = pathname === '/';
  const hideAuth =
    isHome ||
    isMockPreview ||
    pathname === '/login' ||
    pathname === '/setup' ||
    pathname === '/onboard';

  async function logout() {
    const ok = await confirm({
      title: '確認登出',
      message: kv([['注意', '登出後要重新選擇旅團及登入']]),
      confirmLabel: '確認登出',
    });
    if (!ok) return;
    clearSession();
    window.location.href = '/';
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        {/* 左：品牌／身份 */}
        <Link href={user ? home : '/'} className="flex items-center gap-2.5 no-underline min-w-0">
          <div className="w-9 h-9 bg-scout-blue text-white rounded-xl flex items-center justify-center text-lg flex-shrink-0">⚜</div>
          {mockOn && (
            <span className="text-sm font-black bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 flex-shrink-0">🎭 DEMO</span>
          )}
          <div className="min-w-0">
            {user ? (
              <>
                <div className="font-black text-base text-slate-800 truncate leading-tight">{user.name}</div>
                <div className="text-sm text-slate-500 font-bold leading-tight">
                  {troop?.name || '旅團'} · {ROLE_LABEL[user.role as Role] || user.role}
                </div>
              </>
            ) : (
              <>
                <div className="font-black text-base text-scout-blue truncate leading-tight">{hideAuth ? '2026 童軍系統' : troop?.name || '旅團管理系統'}</div>
                {!hideAuth && <div className="text-sm text-slate-500 font-bold leading-tight">選擇旅團後登入</div>}
              </>
            )}
          </div>
        </Link>

        {/* 右：身份・改密碼・登出／登入・系統設定 */}
        {(isHome || !hideAuth) && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isHome ? (
              <Link
                href="/setup"
                className="inline-flex items-center gap-1.5 no-underline text-sm font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-2 rounded-xl hover:bg-violet-100 transition whitespace-nowrap"
              >
                <span aria-hidden>📖</span> 新旅團申請及教學
              </Link>
            ) : (
              <>
                {user ? (
                  <>
                    {/* 身份顯示（點擊回控制台） */}
                    <Link href={home} title="我的控制台"
                      className="flex items-center gap-1.5 no-underline text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-2 rounded-xl transition">
                      <span className="text-base" aria-hidden>👤</span>
                      <span className="font-black text-sm max-w-[7.5rem] truncate">{user.name}</span>
                    </Link>
                    {/* 系統設定（右上小圖示，管理員） */}
                    {admin && (
                      <Link href="/admin/settings" title="系統設定"
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition">
                        <span className="text-lg" aria-hidden>⚙️</span>
                      </Link>
                    )}
                    {/* 改密碼 */}
                    <Link href="/profile" title="改密碼"
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition">
                      <span className="text-lg" aria-hidden>🔑</span>
                    </Link>
                    {/* 登出 */}
                    <button onClick={logout} title="登出"
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition bg-transparent border-0 cursor-pointer">
                      <span className="text-lg" aria-hidden>🚪</span>
                    </button>
                    {/* 更多（借用物資・元件市場・轉駁中心等） */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(o => !o)}
                        title="更多"
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition bg-transparent border-0 cursor-pointer"
                      >
                        <span className="text-lg" aria-hidden>⋯</span>
                      </button>
                      {showMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-50 min-w-[160px]">
                            <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-base text-slate-700 hover:bg-slate-50 no-underline" onClick={() => setShowMenu(false)}>
                              <span>👤</span> 我的資料
                            </Link>
                            {admin && (
                              <>
                                <Link href="/marketplace" className="flex items-center gap-2 px-4 py-2.5 text-base text-slate-700 hover:bg-slate-50 no-underline" onClick={() => setShowMenu(false)}>
                                  <span>🧩</span> 元件市場
                                </Link>
                                <Link href="/connectors" className="flex items-center gap-2 px-4 py-2.5 text-base text-slate-700 hover:bg-slate-50 no-underline" onClick={() => setShowMenu(false)}>
                                  <span>🔀</span> 轉駁中心
                                </Link>
                              </>
                            )}
                            <Link href={home} className="flex items-center gap-2 px-4 py-2.5 text-base text-slate-700 hover:bg-slate-50 no-underline" onClick={() => setShowMenu(false)}>
                              <span>🏠</span> 我的控制台
                            </Link>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                              onClick={logout}
                              className="flex items-center gap-2 px-4 py-2.5 text-base text-rose-600 hover:bg-rose-50 w-full text-left border-0 bg-transparent cursor-pointer"
                            >
                              <span>🚪</span> 登出
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="text-base font-black text-white bg-brand-600 px-4 py-2 rounded-xl hover:bg-brand-700 transition"
                  >
                    登入
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
