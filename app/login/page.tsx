'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/session';
import { apiLogin } from '@/lib/api';
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

  useEffect(() => { try { setTroop(JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null')) } catch {} }, []);

  async function submit() {
    setMsg('');
    if (!troop?.key) { setMsg('請先在首頁選擇旅團。'); return; }
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
        troopCode: troop.id, troopName: troop.name,
        branchId: u.branchId, memberId: u.memberId, age: u.age
      });
      router.push(u.dashboard || (u.role === 'parent' ? '/parent' : u.role === 'member' ? '/member' : u.role === 'admin' || u.role === 'super_admin' ? '/admin' : '/leader'));
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  if (!troop) return (
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
        <span className="badge gold">登入 {troop.name}</span>
        <h1>登入旅團</h1>
        <p>領袖 / 家長 / 管理員用 Email + 密碼。成員用 YMIS + 密碼。首次管理員可用 STAFF_TOKEN。</p>
        <Link className="btn" href="/apply">未有帳號？申請加入</Link>
      </section>
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
