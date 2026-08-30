'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/session';
import { apiLogin } from '@/lib/api';
import { isMockMode, setMockMode, MOCK_TROOP, DEMO_ACCOUNTS, mockHandle } from '@/lib/mock';
import Link from 'next/link';

type Tab = 'account' | 'member' | 'staffToken';

export default function Login() {
  const router = useRouter();
  const [troop, setTroop] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('account');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockOn, setMockOn] = useState(false);

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

  async function submit() {
    setMsg('');
    const t = troop || (mockOn ? MOCK_TROOP : null);
    if (!t?.key) { setMsg('請先在首頁選擇旅團。'); return; }
    if (!identifier.trim() && tab !== 'staffToken') { setMsg('請填入登入資料。'); return; }
    if (tab === 'staffToken' && !password) { setMsg('請填 STAFF_TOKEN。'); return; }
    setLoading(true);
    try {
      const loginType = tab;
      const data = await apiLogin({
        identifier: tab === 'staffToken' ? 'STAFF_TOKEN' : identifier.trim(),
        password,
        loginType
      });
      if (!data.success) throw new Error(data.error || '登入失敗');
      const u = data.user;
      setSession({
        userId: u.userId || u.id, name: u.name, role: u.role,
        troopCode: t.id, troopName: t.name,
        branchId: u.branchId, memberId: u.memberId, age: u.age
      });
      router.push(u.dashboard || (u.role === 'parent' ? '/parent' : u.role === 'member' ? '/member' : u.role === 'admin' || u.role === 'super_admin' ? '/admin' : '/leader'));
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  const effTroop: any = troop || (mockOn ? MOCK_TROOP : null);

  if (!effTroop) return (
    <section className="hero">
      <span className="badge red">未選旅團</span>
      <h1>請先選擇旅團</h1>
      <p>請先到首頁選擇你的旅團。</p>
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
        {msg && <p className={`badge ${msg.startsWith('✅') ? 'green' : 'red'}`}>{msg}</p>}
        
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button className="btn" style={{ fontSize: '0.8rem', opacity: 0.7 }} onClick={forgotPw}>忘記密碼？</button>
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
