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
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockOn, setMockOn] = useState(false);
  const [diag, setDiag] = useState<any>(null);
  const [diagRunning, setDiagRunning] = useState(false);

  useEffect(() => {
    try { setTroop(JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null')) } catch {}
    setMockOn(isMockMode());
  }, []);

  /** 演示模式:一鍵登入示範帳號(mock 資料,不碰真實系統) */
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

    // 帳號／密碼前後空白是登入失敗最常見的人為原因；隱藏超管（sheep）亦容許大小寫。
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

      /**
       * 隱藏超管（sheep）：GS 3.0 登入後回傳 userId = 'SUPER_ADMIN'。
       * 但尚未重新部署的舊版 GS 的 buildDashboardCore_ 只認技術測試帳號
       * （TECH_TEST_ACCOUNTS_ = ['sheep','0728']），會把 'SUPER_ADMIN' 當成訪客
       * → 登入成功但每一頁都是空的。
       * 這裡改用實際輸入的帳號（sheep）作為 userId：新版 GS 視為技術測試帳號
       * （一樣是最高權限），舊版 GS 也能正確給出全部資料，不必等重新部署。
       */
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

  const effTroop: any = troop || (mockOn ? MOCK_TROOP : null);

  if (!effTroop) return (
    <section className="hero">
      <span className="badge red">未選旅團</span>
      <h1>請先選擇旅團</h1>
      <p>請先到首頁選擇你的旅團。所有帳號（包括超級管理員）都屬於某一個旅團的後台，必須先選旅團才能登入。</p>
      <Link className="btn primary" href="/">返回首頁</Link>
    </section>
  );

  return (
    <div className="stack">
      <section className="hero">
        {mockOn && <span className="badge gold">🎭 演示模式 · 全模擬資料</span>}
        <span className="badge gold">登入 {effTroop.name}</span>
        <h1>登入旅團</h1>
        <p>{mockOn
          ? '演示模式:下方示範帳號一鍵登入,或直接用任何密碼登入 mock 帳號。資料純前端模擬,不連接真實後台。'
          : '領袖 / 家長 / 管理員用 Email + 密碼。成員用 YMIS + 密碼。首次管理員可用 STAFF_TOKEN。'}</p>
        <div className="row">
          <Link className="btn" href="/apply">未有帳號？申請加入</Link>
          {mockOn && <button className="btn" onClick={exitDemo}>退出演示模式</button>}
        </div>
      </section>

      {mockOn && (
        <section className="card stack" style={{ borderColor: '#fcd34d' }}>
          <h2 style={{ marginTop: 0 }}>🎭 示範帳號(一鍵登入)</h2>
          <p className="muted">各角色對應真實流程:成員報名(含 18 歲以下需家長操作)、家長代報、領袖點名 / 建活動、管理員開戶 / 審核…資料存在瀏覽器記憶體,重新整理即重設,不會寫入任何真實系統。</p>
          <div className="grid">
            {DEMO_ACCOUNTS.map(a => (
              <button key={a.userId} className="card card-hover" style={{ textAlign: 'left', cursor: 'pointer', color: 'inherit' }} onClick={() => demoLogin(a.userId, a.dashboard)}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{a.label}</div>
                <div className="muted" style={{ fontSize: 12 }}>{a.desc}</div>
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#003366' }}>登入此帳號 →</div>
              </button>
            ))}
          </div>
        </section>
      )}
      {mockOn && (
        <section className="card" style={{ borderColor: '#fcd34d', background: '#fffbeb' }}>
          <h3 style={{ marginTop: 0, color: '#92400e' }}>🎭 正在演示模式：真實帳號（含超級管理員）不會生效</h3>
          <p className="muted" style={{ margin: 0 }}>
            瀏覽器目前記住的是演示模式，下面輸入任何帳號密碼都只會連到前端假資料，
            <b>不會</b>連到 Google Sheet 後台。要登入真實旅團（含超管），請先按右邊按鈕退出演示模式。
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={exitDemo}>退出演示模式，回到真實登入</button>
          </div>
        </section>
      )}
      <section className="card stack">
        <div className="row">
          <button className={`btn ${tab === 'account' ? 'primary' : ''}`} onClick={() => { setTab('account'); setIdentifier(''); setPassword(''); }}>領袖 / 家長</button>
          <button className={`btn ${tab === 'member' ? 'primary' : ''}`} onClick={() => { setTab('member'); setIdentifier(''); setPassword(''); }}>成員 YMIS</button>
          <button className={`btn ${tab === 'staffToken' ? 'primary' : ''}`} onClick={() => { setTab('staffToken'); setIdentifier(''); setPassword(''); }}>STAFF_TOKEN</button>
        </div>

        {tab === 'staffToken' ? (
          <label>STAFF_TOKEN（在 Sheet SystemConfig 找到）
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="sk_xxxxxxxx" />
          </label>
        ) : (
          <>
            <label>{tab === 'member' ? 'YMIS / 成員編號' : 'Email'}
              <input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={tab === 'member' ? '例如：1234567890 或 2501' : 'your@email.com'} />
            </label>
            <label>密碼
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密碼" />
            </label>
          </>
        )}

        <button className="btn primary" disabled={loading} onClick={submit}>{loading ? '登入中...' : '登入'}</button>
        {msg && <p className={`badge ${msg.startsWith('✅') ? 'green' : 'red'}`} style={{ display: 'block', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg}</p>}
        
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button className="btn" style={{ fontSize: '0.8rem', opacity: 0.7 }} onClick={forgotPw}>忘記密碼？</button>
        </div>

        {/* ── 連線診斷：登入不了／登入後沒資料時用 ── */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          <button className="btn ghost" style={{ fontSize: '0.8rem' }} disabled={diagRunning} onClick={runDiagnose}>
            {diagRunning ? '檢查中…' : '🩺 連線檢查（登入失敗或頁面空白時按這裡）'}
          </button>
          {diag && (
            <div className="code" style={{ marginTop: 10, fontSize: 12, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
{`旅團：${diag.troopKey || '（未選擇）'}
Vercel API Key：${diag.apiKeySet === undefined ? '未知' : (diag.apiKeySet ? '已設定 ✅' : '未設定 ❌ → 設環境變數 ' + (diag.envVarName || 'TROOP_xxxx_APIKEY'))}
後台 Apps Script：${diag.webAppOk ? '連線成功 ✅' : '連線失敗 ❌'}
後台版本：${diag.version || '（讀不到）'}${diag.version && diag.version !== '3.0-live' ? ' ← 舊版，超管權限需要 3.0-live，請重新部署 GS' : ''}
${diag.error ? '錯誤：' + diag.error : ''}`}
            </div>
          )}
          {diag && !diag.webAppOk && (
            <p className="muted" style={{ fontSize: 12 }}>
              修復順序：① 首頁選旅團 → ② Vercel 設好 API Key → ③ Google Sheet 的 Apps Script 重新部署（Deploy → Manage deployments → New version，Who has access = Anyone）→ ④ 按上方「連線檢查」確認版本是 3.0-live。
            </p>
          )}
        </div>
      </section>
    </div>
  );

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
}
