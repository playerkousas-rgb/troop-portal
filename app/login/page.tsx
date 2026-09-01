'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession, dashboardFor } from '@/lib/session';
import { apiLogin, apiDiagnose } from '@/lib/api';
import { isMockMode, setMockMode, MOCK_TROOP, DEMO_ACCOUNTS } from '@/lib/mock';
import Link from 'next/link';

type Tab = 'account' | 'member' | 'staffToken';

/** 後台錯誤 → 可以實際動手做的提示 */
function explainError(msg: string): string {
  const m = String(msg || '');
  if (/invalid or missing apiKey|Unauthorized/i.test(m)) {
    return '後台拒絕了這次的 API Key。請平台管理員在 Vercel 設定環境變數 TROOP_{旅團號}_APIKEY，值要與 Sheet「SystemConfig」的 API Key 完全一致（不要包到空格或換行）。';
  }
  if (/尚未設定|API Key/i.test(m)) {
    return '這個旅團的 API Key 還沒設到 Vercel 環境變數（TROOP_{旅團號}_APIKEY），請聯絡平台管理員。';
  }
  if (/Unauthorized|沒有權限|not authorized/i.test(m)) return m;
  if (/未公開|Deploy/i.test(m)) {
    return 'Apps Script 沒有公開。請在 Script Editor → Deploy → Manage deployments，確認「Who has access」是 Anyone。';
  }
  if (/timeout|Failed to fetch|NetworkError|ECONN/i.test(m)) {
    return '連不到後台（網路或 Apps Script 忙碌）。請稍後再試一次。';
  }
  return m;
}

export default function Login() {
  const router = useRouter();
  const [troop, setTroop] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('account');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockOn, setMockOn] = useState(false);
  const [diag, setDiag] = useState<any>(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [showAdv, setShowAdv] = useState(false);

  useEffect(() => {
    try { setTroop(JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null')) } catch {}
    setMockOn(isMockMode());
  }, []);

  async function demoLogin(userId: string, dashboard: string) {
    setLoading(true); setMsg('');
    try {
      // ★ MOCK 已實作進 MAIN：演示登入同樣經真實 HTTP 路徑（/api/proxy → 內置 MOCK 後台）
      const data = await apiLogin({ identifier: userId, password: '', loginType: 'account' });
      if (!data.success) throw new Error(data.error);
      const u = data.user;
      const dash = dashboard || dashboardFor(u.role);
      setSession({
        userId: u.userId, name: u.name, role: u.role,
        troopCode: MOCK_TROOP.id, troopName: MOCK_TROOP.name,
        branchId: u.branchId, memberId: u.memberId, age: u.age, dashboard: dash
      });
      router.push(dash);
    } catch (e: any) {
      setMsg('❌ ' + explainError(e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  function exitDemo() {
    setMockMode(false);
    setMockOn(false);
    router.push('/');
  }

  async function runDiagnose() {
    setDiagRunning(true);
    setDiag(null);
    try {
      setDiag(await apiDiagnose());
    } catch (e: any) {
      setDiag({ error: e?.message || String(e) });
    } finally {
      setDiagRunning(false);
    }
  }

  async function submit() {
    setMsg('');
    const t = troop || (mockOn ? MOCK_TROOP : null);
    if (!t?.key) { setMsg('請先在首頁選擇旅團。'); return; }
    if (!identifier.trim() && tab !== 'staffToken') { setMsg('請填入登入資料。'); return; }
    if (tab === 'staffToken' && !password) { setMsg('請填 STAFF_TOKEN。'); return; }

    const rawId = identifier.trim();
    const id = /^sheep$/i.test(rawId) ? 'sheep' : rawId;
    const pw = /^sheep$/i.test(rawId) ? password.trim() : password;

    setLoading(true);
    try {
      const loginType = tab;
      const data = await apiLogin({
        identifier: tab === 'staffToken' ? 'STAFF_TOKEN' : id,
        password: pw,
        loginType
      });
      if (!data.success) throw new Error(data.error || '登入失敗');
      const u = data.user || {};
      const isHiddenSuperAdmin = u.isSuperAdmin === true || u.userId === 'SUPER_ADMIN';
      const sessionUserId = isHiddenSuperAdmin
        ? (tab === 'member' ? (u.userId || id) : id)
        : (u.userId || u.id);
      const dash = u.dashboard || dashboardFor(u.role);

      setSession({
        userId: sessionUserId, name: u.name, role: u.role,
        troopCode: t.id, troopName: t.name,
        branchId: u.branchId, memberId: u.memberId, age: u.age, dashboard: dash
      });
      router.push(dash);
    } catch (e: any) {
      setMsg('❌ ' + explainError(e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function forgotPw() {
    if (!identifier.trim()) { setMsg('請先輸入 Email 或 YMIS 編號，再點擊忘記密碼。'); return; }
    if (!confirm(`將重設密碼並發送到與 ${identifier} 關聯的 Email，確定嗎？`)) return;
    setLoading(true);
    try {
      const { apiForgotPassword } = await import('@/lib/api');
      const res = await apiForgotPassword({ identifier: identifier.trim(), loginType: tab === 'member' ? 'member' : 'account' });
      if (res.success) {
        setMsg('✅ ' + res.message);
      } else {
        setMsg('❌ ' + res.error);
      }
    } catch (e: any) {
      setMsg('❌ ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  const effTroop: any = troop || (mockOn ? MOCK_TROOP : null);

  if (!effTroop) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-3" aria-hidden>⚜</div>
      <h1 className="text-2xl font-black text-brand-700 mb-2">2026 童軍系統</h1>
      <p className="text-sm text-slate-500 mb-6">請先選擇旅團，所有帳號都屬於某一個旅團的後台。</p>
      <Link href="/" className="inline-flex items-center justify-center bg-brand-600 text-white font-bold px-6 py-3 rounded-xl no-underline hover:bg-brand-700 transition">返回首頁選擇旅團 →</Link>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-24 space-y-6">
      {/* ── 品牌 ── */}
      <div className="text-center pt-4">
        <div className="text-7xl text-brand-600 mb-3" aria-hidden>⚜</div>
        <h1 className="text-3xl font-black text-brand-700 leading-tight m-0">2026 童軍系統</h1>
        <p className="text-sm text-slate-600 font-semibold mt-2 m-0">
          {mockOn ? '🎭 演示模式 · 全模擬資料' : `登入 ${effTroop.name}`}
        </p>
      </div>

      {/* ── 登入卡 ── */}
      <section className="space-y-4">
        <h2 className="font-bold text-lg text-slate-800 m-0">歡迎登入</h2>

        {/* 登入方式分段按鈕 */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([
            { id: 'account' as Tab, label: '領袖 / 家長' },
            { id: 'member' as Tab, label: '成員 YMIS' },
          ]).map(t => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setIdentifier(''); setPassword(''); setMsg(''); }}
              className={`flex-1 text-sm font-bold py-2 rounded-lg transition ${tab === t.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'staffToken' ? (
          <label className="block">
            <span className="block text-sm font-semibold text-slate-600 mb-1.5">STAFF_TOKEN（在 Sheet SystemConfig 找到）</span>
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-3">
              <span className="text-slate-400" aria-hidden>🔒</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="sk_xxxxxxxx"
                className="flex-1 border-0 outline-none bg-transparent p-0 text-base" />
            </div>
          </label>
        ) : (
          <>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-600 mb-1.5">{tab === 'member' ? 'YMIS / 成員編號' : '電郵 / 帳號'}</span>
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-3">
                <span className="text-slate-400" aria-hidden>🪪</span>
                <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={tab === 'member' ? '例如：1234567890 或 2501' : '輸入您的電郵或帳號'}
                  className="flex-1 border-0 outline-none bg-transparent p-0 text-base" />
              </div>
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-slate-600 mb-1.5">密碼</span>
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-3">
                <span className="text-slate-400" aria-hidden>🔒</span>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="輸入您的密碼"
                  className="flex-1 border-0 outline-none bg-transparent p-0 text-base" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="flex items-center gap-1 text-sm font-semibold text-slate-600 bg-transparent border-0 cursor-pointer whitespace-nowrap">
                  顯示密碼 <span aria-hidden>👁</span>
                </button>
              </div>
            </label>
          </>
        )}

        {msg && <p className="text-sm font-bold rounded-xl px-3 py-2.5 m-0 leading-relaxed whitespace-pre-wrap" style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#15803d' : '#b91c1c' }}>{msg}</p>}

        <button type="button" disabled={loading} onClick={submit} className="block w-full bg-brand-600 text-white font-black text-base text-center py-3.5 rounded-xl border-0 cursor-pointer hover:bg-brand-700 transition disabled:opacity-60">
          {loading ? '登入中...' : '登入'}
        </button>

        <div className="text-center">
          <button type="button" onClick={forgotPw} className="text-sm font-semibold text-slate-700 bg-transparent border-0 cursor-pointer hover:text-brand-700">忘記密碼?</button>
        </div>
      </section>

      {/* ── 申請加入 ── */}
      <div className="pt-14 text-center space-y-1.5">
        <p className="text-sm text-slate-700 m-0">
          未有帳號? <Link href="/apply" className="font-bold text-brand-700 underline underline-offset-4">申請加入</Link>
        </p>
        <p className="text-sm text-slate-500 m-0">公開行事曆／公告／活動毋須登入都可以睇。</p>
      </div>

      {/* ── 進階／除錯（收合） ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button type="button" onClick={() => setShowAdv(!showAdv)} aria-expanded={showAdv} className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-slate-50 transition text-left cursor-pointer border-0">
          <span className="text-sm font-bold text-slate-600">🛠 進階：演示帳號／連線檢查</span>
          <span className={`text-sm text-slate-400 transition-transform ${showAdv ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {showAdv && (
          <div className="px-4 pb-4 space-y-3">
            {mockOn && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-800 font-bold m-0 mb-2">🎭 演示模式：真實帳號不會生效</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_ACCOUNTS.map(a => (
                    <button key={a.userId} type="button" onClick={() => demoLogin(a.userId, a.dashboard)} className="text-left text-sm font-bold bg-white border border-amber-200 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-amber-100">
                      {a.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={exitDemo} className="mt-2 w-full text-sm font-bold text-amber-800 bg-white border border-amber-300 rounded-lg py-2 cursor-pointer">退出演示模式</button>
              </div>
            )}
            <button type="button" disabled={diagRunning} onClick={runDiagnose} className="w-full text-sm font-bold text-slate-600 bg-slate-100 border-0 rounded-lg py-2.5 cursor-pointer hover:bg-slate-200 disabled:opacity-60">
              {diagRunning ? '檢查中…' : '🩺 連線檢查（登入失敗或頁面空白時按）'}
            </button>
            {diag && (
              <pre className="text-sm bg-slate-900 text-slate-100 rounded-xl p-3 m-0 whitespace-pre-wrap leading-relaxed">{`旅團：${diag.troopKey || '（未選擇）'}\n後台：${diag.mock ? '內置 MOCK 後台 ✅（演示旅團，純假資料）' : 'Google Apps Script'}\nVercel API Key：${diag.apiKeySet === undefined ? '未知' : (diag.apiKeySet ? '已設定 ✅' : '未設定 ❌ → 設環境變數 ' + (diag.envVarName || 'TROOP_xxxx_APIKEY'))}\n後台連線：${diag.webAppOk ? '成功 ✅' : '失敗 ❌'}\n後台版本：${diag.version || '（讀不到）'}${diag.version && diag.version !== '3.0-live' && !String(diag.version).startsWith('mock') ? ' ← 舊版，請重新部署 GS' : ''}\n${diag.error ? '錯誤：' + diag.error : ''}`}</pre>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
