'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { activeTroops } from '@/lib/troops';
import { isMockMode, setMockMode, MOCK_TROOP, DEMO_ACCOUNTS } from '@/lib/mock';
import { getSession, clearSession, dashboardFor, setSession } from '@/lib/session';
import { apiLogin } from '@/lib/api';
import { ROLE_LABEL, Role } from '@/lib/model';

// 旅團登記表（MOCK 排最前，其餘旅團按旅團號碼由細到大排）
const TROOPS = [...activeTroops()].sort(
  (a, b) => (parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0)
);
const TROOP_KEY = 'scoutsystem2_selected_troop';

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [resume, setResume] = useState<{ name: string; role: Role; troopName: string; dash: string } | null>(null);
  const [mockOn, setMockOn] = useState(false);
  const [msg, setMsg] = useState('');
  const [demoBusy, setDemoBusy] = useState('');

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

  function exitDemo() {
    setMockMode(false);
    localStorage.removeItem(TROOP_KEY);
    setMockOn(false);
    setMsg('已退出演示模式');
  }

  /** MOCK：直接喺首頁選身份登入（唔經登入頁） */
  async function demoLogin(userId: string, dashboard: string) {
    setDemoBusy(userId); setMsg('');
    // 確保走 MOCK 後台（troopKey = troop_demo）
    setMockMode(true);
    localStorage.setItem(TROOP_KEY, JSON.stringify({ key: MOCK_TROOP.key, id: MOCK_TROOP.id, name: MOCK_TROOP.name }));
    setMockOn(true);
    try {
      const data = await apiLogin({ identifier: userId, password: '', loginType: 'account' });
      if (!data.success) throw new Error(data.error || '登入失敗');
      const u = data.user;
      const dash = dashboard || dashboardFor(u.role);
      setSession({
        userId: u.userId, name: u.name, role: u.role,
        troopCode: MOCK_TROOP.id, troopName: MOCK_TROOP.name,
        branchId: u.branchId, memberId: u.memberId, age: u.age, dashboard: dash,
      });
      router.push(dash);
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || String(e)));
    } finally {
      setDemoBusy('');
    }
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
          <button type="button" onClick={logoutAndStay} className="text-sm font-bold text-slate-500 bg-transparent border-0 cursor-pointer underline underline-offset-2">登出並選擇其他旅團</button>
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
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 pb-28 space-y-5">

      {/* 頁首（大標題＋大圖示，用手機屏幕） */}
      <section className="text-center pt-3 sm:pt-6">
        <div className="text-7xl sm:text-8xl text-brand-600 mb-3" aria-hidden>⚜</div>
        <h1 className="text-3xl sm:text-5xl font-black text-brand-700 leading-tight m-0">2026 童軍系統</h1>
        <p className="text-base sm:text-lg text-slate-600 mt-3 mb-0 leading-relaxed font-semibold">
          選擇你的旅團，即可查看公開行事曆及活動資訊；登入後可回覆活動及管理旅團事務。
        </p>
      </section>

      {/* ── MOCK 演示：直接喺度選身份登入 ── */}
      <section className="bg-amber-50 border-2 border-amber-300 rounded-3xl shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-12 h-12 bg-amber-200 text-amber-800 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🎭</span>
          <div className="min-w-0">
            <h2 className="font-black text-xl sm:text-2xl text-amber-800 m-0 leading-tight">演示體驗（MOCK）</h2>
            <p className="text-sm sm:text-base text-amber-700/90 font-semibold m-0 mt-0.5">假資料 · 真前後端連線。直接喺度選身份登入，唔使去登入頁。</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {DEMO_ACCOUNTS.map(a => (
            <button
              key={a.userId}
              type="button"
              disabled={!!demoBusy}
              onClick={() => demoLogin(a.userId, a.dashboard)}
              className="text-left rounded-2xl border-2 border-amber-200 bg-white p-3 transition cursor-pointer hover:border-amber-400 hover:shadow-md disabled:opacity-60"
            >
              <div className="text-2xl leading-none" aria-hidden>{a.label.split(' ')[0]}</div>
              <div className="font-black text-base text-slate-800 mt-1.5 leading-tight">{a.label.replace(/^[^\s]+\s/, '')}</div>
              <div className="text-sm text-slate-500 mt-0.5 leading-snug">{a.desc}</div>
              <div className="text-amber-600 font-black text-base mt-1">{demoBusy === a.userId ? '登入中…' : '→ 登入'}</div>
            </button>
          ))}
        </div>

        {mockOn && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm font-bold text-amber-700">🎭 演示模式開啟中</span>
            <button type="button" onClick={exitDemo} className="text-sm text-slate-600 underline underline-offset-2 bg-transparent border-0 cursor-pointer">退出演示模式</button>
          </div>
        )}
        {msg && <p className="mt-3 text-sm text-slate-700 font-bold m-0 bg-white/70 border border-amber-200 rounded-xl px-3 py-2 whitespace-pre-wrap">{msg}</p>}
      </section>

      {/* ── 選擇旅團 ── */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h2 className="font-black text-lg sm:text-xl text-slate-800 flex items-center gap-2.5 mt-0 mb-3">
          <span className="w-11 h-11 bg-brand-600 text-white rounded-2xl flex items-center justify-center text-xl">🏠</span>
          選擇旅團
        </h2>

        <div className="grid gap-2.5">
          {TROOPS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => goTroop(t)}
              className="text-left rounded-2xl border-2 border-slate-200 bg-white p-4 transition cursor-pointer hover:border-brand-400 hover:shadow-md"
            >
              <div className="flex items-center gap-3.5">
                <span className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">⚜</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-black text-lg sm:text-xl text-slate-800 leading-tight">{t.name}</span>
                  <span className="block text-base text-slate-500 font-semibold">編號 {t.id}</span>
                </span>
                <span className="text-slate-400 font-black text-2xl flex-shrink-0">→</span>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-4 text-base text-slate-500 m-0 leading-relaxed">
          💡 揀咗旅團之後，公開行事曆／公告／活動唔使登入都可以睇（旅團可自行選擇關閉）。
          看不到你的旅團？代表尚未開通，請用右上角「新旅團申請及教學」。
        </p>
      </section>

      {/* 版權 */}
      <footer className="pt-4 pb-1 text-center">
        <p className="text-sm text-slate-500 m-0">© 2026 Scout System · 旅團管理系統</p>
      </footer>
    </div>
  );
}
