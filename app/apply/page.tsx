'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { branches } from '@/lib/model';
import { apiApplyJoin } from '@/lib/api';

type ApplyType = 'parent' | 'leader' | 'member' | 'admin';

export default function Apply() {
  const [troop, setTroop] = useState<any>(null);
  const [type, setType] = useState<ApplyType>('parent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('b3');
  const [memberNumber, setMemberNumber] = useState('');
  const [childNumbers, setChildNumbers] = useState('');
  const [leaderRole, setLeaderRole] = useState<'group_leader'|'branch_leader'|'coach'>('branch_leader');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberDob, setMemberDob] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try { setTroop(JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null')); } catch {}
  }, []);

  async function submit() {
    setMsg('');
    if (!troop?.webAppUrl) { setMsg('請先在首頁選擇旅團。'); return; }
    if (!name.trim()) { setMsg('請填姓名。'); return; }
    if (type !== 'member' && !email.trim()) { setMsg('請填 Email。'); return; }
    if (type === 'member' && !memberNumber.trim()) { setMsg('請填 YMIS / 成員編號。'); return; }
    setLoading(true);
    try {
      const role = type === 'parent' ? 'parent' : type === 'leader' ? leaderRole : type === 'admin' ? 'admin' : 'member';
      const noteParts = [phone, memberEmail ? 'email:' + memberEmail : '', memberDob ? 'dob:' + memberDob : '', password ? 'pw:' + password : ''].filter(Boolean);
      const result = await apiApplyJoin({
        type, name, email, role,
        branchId: type === 'parent' || type === 'admin' ? '' : branchId,
        ymNumbers: type === 'parent' ? childNumbers : (type === 'member' ? memberNumber : ''),
        note: noteParts.join('; '),
      });
      if (result.success) {
        setMsg('✅ 申請已提交！旅團管理員審批後會建立你的帳號。');
        setName(''); setEmail(''); setPassword(''); setMemberNumber(''); setChildNumbers(''); setPhone(''); setMemberEmail(''); setMemberDob('');
      } else {
        setMsg('❌ ' + (result.error || '提交失敗'));
      }
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
      <Link className="btn primary" href="/">返回首頁</Link>
    </section>
  );

  return (
    <div className="stack">
      <section className="hero">
        <span className="badge gold">申請帳戶 · {troop.name}</span>
        <h1>申請加入旅團</h1>
        <p>提交申請後，旅團管理員會審批你的帳號。</p>
      </section>

      <section className="card stack">
        <div className="row">
          <button className={`btn ${type === 'parent' ? 'primary' : ''}`} onClick={() => { setType('parent'); }}>👨‍👩‍👧 家長</button>
          <button className={`btn ${type === 'leader' ? 'primary' : ''}`} onClick={() => setType('leader')}>🧭 領袖</button>
          <button className={`btn ${type === 'member' ? 'primary' : ''}`} onClick={() => setType('member')}>👤 成員</button>
          <button className={`btn ${type === 'admin' ? 'primary' : ''}`} onClick={() => setType('admin')}>⚙️ 管理員</button>
        </div>

        <label>姓名 *<input value={name} onChange={e => setName(e.target.value)} placeholder="姓名"/></label>

        {type !== 'member' && (
          <label>Email *<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"/></label>
        )}

        {type === 'member' && (
          <label>Email（選填）<input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="your@email.com"/></label>
        )}

        {type !== 'member' && (
          <label>密碼 *<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="設定你的登入密碼"/></label>
        )}

        <label>聯絡電話<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="91234567"/></label>

        {type !== 'parent' && type !== 'admin' && (
          <label>申請加入的支部
            <select value={branchId} onChange={e => setBranchId(e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}

        {type === 'parent' && (
          <label>子女 YMIS / 成員編號（多個用逗號分隔。如不清楚可留空，由領袖補上）
            <input value={childNumbers} onChange={e => setChildNumbers(e.target.value)} placeholder="例如：1234567890, 9876543210 或 2501, 2602"/>
          </label>
        )}

        {type === 'leader' && (
          <label>申請的身份
            <select value={leaderRole} onChange={e => setLeaderRole(e.target.value as any)}>
              <option value="group_leader">團長</option>
              <option value="branch_leader">支部領袖</option>
              <option value="coach">教練員</option>
            </select>
          </label>
        )}

        {type === 'member' && (
          <>
            <label>YMIS / 成員編號 *<input value={memberNumber} onChange={e => setMemberNumber(e.target.value)} placeholder="例如：1234567890 或 2501"/></label>
            <label>密碼 *<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="設定你的登入密碼"/></label>
            <label>出生日期 *<input type="date" value={memberDob} onChange={e => setMemberDob(e.target.value)} /></label>
          </>
        )}

        <button className="btn primary" disabled={loading} onClick={submit}>{loading ? '提交中...' : '提交申請'}</button>
        {msg && <p className={`badge ${msg.startsWith('✅') ? 'green' : 'red'}`}>{msg}</p>}
      </section>

      <section className="card"><p className="muted">已有帳號？<Link href="/login">前往登入</Link></p></section>
    </div>
  );
}
