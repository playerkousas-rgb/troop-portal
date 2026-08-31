'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { activeTroops } from '@/lib/troops';
import { isMockMode, setMockMode, MOCK_TROOP } from '@/lib/mock';
import { getSession, clearSession, dashboardFor } from '@/lib/session';
import { ROLE_LABEL, Role } from '@/lib/model';

// 旅團登記表（MOCK 排最前，其餘旅團按旅團號碼由細到大排）
const TROOPS = [...activeTroops()].sort(
  (a, b) => (parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0)
);
const TROOP_KEY = 'scoutsystem2_selected_troop';

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  // 已登入 → 一開 APP 直接返回自己的帳戶（要登出才會再見到旅團選擇頁）
  const [resume, setResume] = useState<{ name: string; role: Role; troopName: string; dash: string } | null>(null);
  const [mockOn, setMockOn] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const s = getSession();
    if (s) {
      setResume({
        name: s.name,
        role: s.role,
        troopName: s.troopName,
        dash: s.dashboard || dashboardFor(s.role),
      });
      router.replace(s.dashboard || dashboardFor(s.role));
      return;
    }
    setMockOn(isMockMode());
    setReady(true);
  }, [router]);

  /** 一按旅團 → 直接進入「填帳戶／開帳戶」頁（該旅團的後台已連通） */
  function goTroop(t: { key: string; id: string; name: string }) {
    setMockMode(false);
    localStorage.setItem(TROOP_KEY, JSON.stringify({ key: t.key, id: t.id, name: t.name }));
    router.push('/login');
  }

  /** 演示旅團：直接進入 MOCK 控制台，不會誤入真實登入流程。 */
  function enterDemo() {
    setMockMode(true);
    localStorage.setItem(TROOP_KEY, JSON.stringify({ key: MOCK_TROOP.key, id: MOCK_TROOP.id, name: MOCK_TROOP.name }));
    router.push('/dashboard');
  }

  function exitDemo() {
    setMockMode(false);
    localStorage.removeItem(TROOP_KEY);
    setMockOn(false);
    setMsg('已退出演示模式');
  }

  function logoutAndStay() {
    clearSession();
    setResume(null);
    setMockOn(isMockMode());
    setReady(true);
  }

  /* ── 已登入：顯示返回中，並由 useEffect 導向自己的帳戶 ── */
  if (resume) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl text-brand-600 mb-3" aria-hidden>⚜</div>
        <h1 className="text-2xl font-black text-brand-700 m-0 mb-2">正在返回你的帳戶…</h1>
        <p className="text-sm text-slate-500 m-0 mb-6">
          {resume.name} · {ROLE_LABEL[resume.role] || resume.role} · {resume.troopName}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href={resume.dash} className="inline-flex items-center justify-center bg-brand-600 text-white font-bold px-6 py-3 rounded-xl no-underline hover:bg-brand-700 transition">繼續 →</Link>
          <button type="button" onClick={logoutAndStay} className="text-xs font-bold text-slate-500 bg-transparent border-0 cursor-pointer underline underline-offset-2">登出並選擇其他旅團</button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl text-brand-600 mb-3 animate-pulse" aria-hidden>⚜</div>
        <p className="text-sm text-slate-500 m-0">載入中…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-5">

      {/* 頁首（申請入口已放到最上方 Scout System 導覽列） */}
      <section className="text-center">
        <div className="text-5xl text-brand-600 mb-2" aria-hidden>⚜</div>
        <h1 className="text-2xl sm:text-3xl font-black text-brand-700 leading-tight m-0">2026 童軍系統</h1>
        <p className="text-[12px] text-slate-500 mt-2 mb-0 leading-relaxed">
          選擇你的旅團，即可查看公開行事曆及活動資訊；登入後可回覆活動及管理旅團事務。
        </p>
      </section>

      {/* ── 選擇旅團（MOCK 放前，其餘旅團排後面）── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h2 className="font-bold text-sm flex items-center gap-2 mt-0 mb-3">
          <span className="w-7 h-7 bg-brand-600 text-white rounded-lg flex items-center justify-center text-sm">🏠</span>
          選擇旅團
        </h2>

        <div className="grid gap-2">
          {/* MOCK 放最前 */}
          <button
            type="button"
            onClick={enterDemo}
            className={`text-left rounded-xl border-2 p-3.5 transition cursor-pointer hover:shadow-sm ${
              mockOn ? 'border-amber-400 bg-amber-50' : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🎭</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-amber-800">演示體驗 · 全模擬（MOCK）</span>
                <span className="block text-[11px] text-amber-700/80">7 種角色帳號 · 假資料 · 免後台 · 睇晒成個 UI</span>
              </span>
              <span className="text-amber-600 font-black text-base flex-shrink-0">→</span>
            </div>
          </button>
          {mockOn && (
            <div className="flex items-center gap-2 -mt-0.5 pl-1">
              <span className="text-[11px] font-bold text-amber-700">🎭 演示模式開啟中</span>
              <button type="button" onClick={exitDemo} className="text-[11px] text-slate-500 underline underline-offset-2 bg-transparent border-0 cursor-pointer">退出演示模式</button>
            </div>
          )}

          {/* 真實旅團（排喺 MOCK 後面） */}
          {TROOPS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => goTroop(t)}
              className="text-left rounded-xl border-2 border-slate-200 bg-white p-3.5 transition cursor-pointer hover:border-brand-400 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">⚜</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-slate-800">{t.name}</span>
                  <span className="block text-[11px] text-slate-500">編號 {t.id}</span>
                </span>
                <span className="text-slate-400 font-black text-base flex-shrink-0">→</span>
              </div>
            </button>
          ))}
        </div>

        {/* 公開內容（行事曆／公告／活動）唔使登入已經喺底部「選擇旅團」後可見，
            所以唔再放「只睇公開資料」按鈕；旅團管理員可以喺「系統設定」關閉公開瀏覽。 */}
        {msg && <p className="mt-3 text-[12px] text-slate-500 font-bold m-0">{msg}</p>}
        <p className="mt-3 text-[11px] text-slate-500 m-0">
          💡 揀咗旅團之後，公開行事曆／公告／活動唔使登入都可以睇（旅團可自行選擇關閉）。
          看不到你的旅團？代表尚未開通，請用右上角「新旅團申請及教學」。
        </p>
      </section>

      {/* 固定底部快捷列上方的版權資訊 */}
      <footer className="pt-5 pb-1 text-center">
        <p className="text-[11px] text-slate-500 m-0">© 2026 Scout System · 旅團管理系統</p>
      </footer>
    </div>
  );
}
