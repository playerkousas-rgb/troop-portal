'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/session';
import { apiLogin, apiDiagnose } from '@/lib/api';
import { isMockMode, setMockMode, MOCK_TROOP, DEMO_ACCOUNTS, mockHandle } from '@/lib/mock';
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
      const data = mockHandle('login', { identifier: userId, loginType: 'account' });
      if (!data.success) throw new Error(data.error);
      const u = data.user;
      setSession({
        userId: u.userId, name: u.name, role: u.role,
        troopCode: MOCK_TROOP.id, troopName: MOCK_TROOP.name,
        branchId: u.branchId, memberId: u.memberId, age: u.age
      });
      router.push(dashboard);
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || String(e)));
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

      setSession({
        userId: sessionUserId, name: u.name, role: u.role,
        troopCode: t.id, troopName: t.name,
        branchId: u.branchId, memberId: u.memberId, age: u.age
      });
      router.push(u.dashboard || (u.role === 'parent' ? '/parent' : u.role === 'member' ? '/member' : u.role === 'admin' || u.role === 'super_admin' ? '/admin' : '/leader'));
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
    <div className="max-w-md mx-auto px-4 py-8 pb-24 space-y-5">
      {/* ── 品牌 ── */}
      <div className="text-center pt-4">
        <div className="text-6xl text-brand-600 mb-2" aria-hidden>⚜</div>
        <h1 className="text-2xl font-black text-brand-700 leading-tight m-0">2026 童軍系統</h1>
        <p className="text-[11px] text-slate-500 font-semibold mt-1 m-0">
          {mockOn ? '🎭 演示模式 · 全模擬資料' : `登入 ${effTroop.name}`}
        </p>
      </div>

      {/* ── 登入卡 ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-base text-slate-800 m-0">歡迎登入</h2>

        {/* 登入方式（後期功能，收進分段按鈕） */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([
            { id: 'account' as Tab, label: '領袖 / 家長' },
            { id: 'member' as Tab, label: '成員 YMIS' },
            { id: 'staffToken' as Tab, label: 'STAFF' },
          ]).map(t => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setIdentifier(''); setPassword(''); setMsg(''); }}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition ${tab === t.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'staffToken' ? (
          <label className="block">
            <span className="block text-[11px] font-bold text-slate-600 mb-1">STAFF_TOKEN（在 Sheet SystemConfig 找到）</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="sk_xxxxxxxx" />
          </label>
        ) : (
          <>
            <label className="block">
              <span className="block text-[11px] font-bold text-slate-600 mb-1">{tab === 'member' ? 'YMIS / 成員編號' : '電郵 / 帳號'}</span>
              <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={tab === 'member' ? '例如：1234567890 或 2501' : '輸入您的電郵或帳號'} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-slate-600 mb-1">密碼</span>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="輸入您的密碼" className="pr-20" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 bg-transparent border-0 cursor-pointer px-1 py-0.5">
                  {showPw ? '隱藏 🔒' : '顯示 👁'}
                </button>
              </div>
            </label>
          </>
        )}

        {msg && <p className="text-[11px] font-bold rounded-xl px-3 py-2 m-0 leading-relaxed whitespace-pre-wrap" style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#15803d' : '#b91c1c' }}>{msg}</p>}

        <button type="button" disabled={loading} onClick={submit} className="w-full bg-brand-600 text-white font-black text-base py-3 rounded-xl border-0 cursor-pointer hover:bg-brand-700 transition disabled:opacity-60">
          {loading ? '登入中...' : '登入'}
        </button>

        <div className="text-center">
          <button type="button" onClick={forgotPw} className="text-[12px] font-bold text-slate-600 bg-transparent border-0 cursor-pointer hover:text-brand-700">忘記密碼？</button>
        </div>
      </section>

      {/* ── 申請加入 ── */}
      <p className="text-center text-[12px] text-slate-600 m-0">
        未有帳號？<Link href="/apply" className="font-bold text-brand-700 underline underline-offset-2">申請加入</Link>
      </p>

      {/* ── 進階／除錯（後期功能，收合） ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button type="button" onClick={() => setShowAdv(!showAdv)} aria-expanded={showAdv} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition text-left cursor-pointer border-0">
          <span className="text-[11px] font-bold text-slate-600">🛠 進階：演示帳號／連線檢查</span>
          <span className={`text-[10px] text-slate-400 transition-transform ${showAdv ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {showAdv && (
          <div className="px-4 pb-4 space-y-3">
            {mockOn && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[11px] text-amber-800 font-bold m-0 mb-2">🎭 演示模式：真實帳號不會生效</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_ACCOUNTS.map(a => (
                    <button key={a.userId} type="button" onClick={() => demoLogin(a.userId, a.dashboard)} className="text-left text-[11px] font-bold bg-white border border-amber-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-amber-100">
                      {a.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={exitDemo} className="mt-2 w-full text-[11px] font-bold text-amber-800 bg-white border border-amber-300 rounded-lg py-1.5 cursor-pointer">退出演示模式</button>
              </div>
            )}
            <button type="button" disabled={diagRunning} onClick={runDiagnose} className="w-full text-[11px] font-bold text-slate-600 bg-slate-100 border-0 rounded-lg py-2 cursor-pointer hover:bg-slate-200 disabled:opacity-60">
              {diagRunning ? '檢查中…' : '🩺 連線檢查（登入失敗或頁面空白時按）'}
            </button>
            {diag && (
              <pre className="text-[11px] bg-slate-900 text-slate-100 rounded-xl p-3 m-0 whitespace-pre-wrap leading-relaxed">{`旅團：${diag.troopKey || '（未選擇）'}\nVercel API Key：${diag.apiKeySet === undefined ? '未知' : (diag.apiKeySet ? '已設定 ✅' : '未設定 ❌ → 設環境變數 ' + (diag.envVarName || 'TROOP_xxxx_APIKEY'))}\n後台 Apps Script：${diag.webAppOk ? '連線成功 ✅' : '連線失敗 ❌'}\n後台版本：${diag.version || '（讀不到）'}${diag.version && diag.version !== '3.0-live' ? ' ← 舊版，請重新部署 GS' : ''}\n${diag.error ? '錯誤：' + diag.error : ''}`}</pre>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
