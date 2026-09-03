'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState, loadStateSlice } from '@/lib/store';
import { apiUpdateMember, apiUpdateUserField } from '@/lib/api';
import { getSession, setSession as persistSession, Session } from '@/lib/session';
import { branches, ROLE_LABEL, LEADER_ROLES } from '@/lib/model';
import Link from 'next/link';
import { useConfirm, kv } from '@/components/ConfirmProvider';

/* ═══════════════════════════════════════════════════
   個人資料 —— MOCK 乾淨版式：大頭像 + 白卡表單
   （姓名／密碼／Email／電話可自助更新；編制資料只讀）
   ═══════════════════════════════════════════════════ */

export default function Profile() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const { confirm } = useConfirm();
  // 不能在 render 期直接 getSession()：SSR 拿不到 localStorage 會渲染「請先登入」，
  // client 第一次 render 卻有 session → hydration mismatch（React error #425）。
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => { setSession(getSession()) }, []);

  // editable fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!session) return;
    loadStateSlice(['patrols', 'users', 'members']).then(st => {
      setS(st);
      if (session.role === 'member') {
        const m = st.members.find(x => x.id === session.memberId);
        const linkedUser = st.users.find(x => x.id === session.userId || x.memberId === session.memberId);
        if (m) {
          setName(m.name);
          setPhone(m.emergencyContactPhone || '');
          // Member.email 及 Users.email 係舊資料可能分開存在，優先顯示較新的
          // 成員資料，否則回退到登入帳戶 Email。
          setEmail(m.email || linkedUser?.email || '');
        }
      } else {
        const u = st.users.find(x => x.id === session.userId);
        if (u) { setName(u.name); if (!LEADER_ROLES.includes(session.role)) setEmail(u.email || '') }
      }
    }).catch(e => setErr(e.message))
  }, [session]);

  async function save() {
    const ok = await confirm({
      title: '確認儲存個人資料',
      message: kv([
        ['姓名', name],
        ...(password ? [['密碼', '（已輸入新密碼）'] as [string, string]] : []),
        ...(email ? [['Email', email] as [string, string]] : []),
        ...(phone ? [['電話', phone] as [string, string]] : []),
      ]),
      confirmLabel: '確認儲存',
    });
    if (!ok) return;
    setErr(''); setOk(''); setSaving(true);
    try {
      if (session?.role === 'member' && session.memberId) {
        if (!name.trim()) throw new Error('姓名不可留空。');
        const updates: Record<string, string> = {
          memberId: session.memberId,
          name: name.trim(),
          email: email.trim(),
          // 一律送出電話，先可以清除過期聯絡電話；後端白名單只容許安全欄位。
          emergencyContactPhone: phone.trim(),
        };
        if (password) updates.password = password;
        const fresh = await apiUpdateMember(updates);
        // 有 Users 對應列時同步 Email，忘記密碼才會寄到新地址；Members-only
        // 舊資料則保留在 Members，避免因為沒有 Users row 令整次儲存失敗。
        const linkedUser = fresh.users.find(u => u.id !== session.memberId && u.memberId === session.memberId);
        if (linkedUser && email.trim() !== linkedUser.email) {
          await apiUpdateUserField(linkedUser.id, 'email', email.trim());
        }
        setS(fresh);
      } else if (session?.userId) {
        if (!name.trim()) throw new Error('姓名不可留空。');
        if (name) await apiUpdateUserField(session.userId, 'name', name);
        if (password) await apiUpdateUserField(session.userId, 'password', password);
        if (!LEADER_ROLES.includes(session.role) && email) await apiUpdateUserField(session.userId, 'email', email);
        const { loadState } = await import('@/lib/store');
        setS(await loadState());
      }
      if (name.trim() && name.trim() !== session.name) {
        const next = { ...session, name: name.trim() };
        persistSession(next);
        setSession(next);
      }
      setOk('✅ 已儲存');
      setPassword('');
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  if (session === undefined) return <main className="max-w-2xl mx-auto px-4 py-8 pb-24 text-sm text-slate-600">載入中...</main>;
  if (!session) return <main className="max-w-2xl mx-auto px-4 py-8 pb-24 text-sm text-slate-600">請先登入。<Link href="/login" className="font-bold text-brand-700 underline underline-offset-4">登入</Link></main>;
  if (!s) return <main className="max-w-2xl mx-auto px-4 py-8 pb-24 text-sm text-slate-600">載入中...</main>;

  const myMember = session.role === 'member' ? s.members.find(m => m.id === session.memberId) : null;

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base bg-white';
  const labelCls = 'block text-sm font-bold text-slate-600 mb-1.5';

  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      {/* 身份頭卡 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3.5">
        <span className="w-14 h-14 bg-brand-100 text-brand-700 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" aria-hidden>👤</span>
        <div className="min-w-0">
          <h1 className="font-black text-lg text-slate-800 m-0 truncate">{session.name}</h1>
          <p className="text-sm text-slate-500 font-semibold m-0 mt-0.5">角色：{ROLE_LABEL[session.role]}</p>
        </div>
      </div>

      {err && <p className="text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-3 py-2.5 m-0 whitespace-pre-wrap">{err}</p>}
      {ok && <p className="text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2.5 m-0">{ok}</p>}

      {/* 資料表單 */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5">
        <h2 className="font-bold text-base text-slate-800 m-0">個人資料</h2>
        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <span className={labelCls}>姓名</span>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <span className={labelCls}>密碼</span>
            <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="留空 = 不改" />
          </div>
          {(session.role === 'member' || !LEADER_ROLES.includes(session.role)) && (
            <div>
              <span className={labelCls}>Email（用於找回密碼）</span>
              <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          )}
          {session.role === 'member' && (
            <div>
              <span className={labelCls}>電話</span>
              <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="聯絡電話" />
            </div>
          )}
        </div>
        {session.role === 'member' && myMember && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm text-slate-600">
            <span className="font-bold text-slate-700">編制資料（唯讀）</span>
            <span className="ml-2">{branches.find(b => b.id === myMember.branchId)?.name || myMember.branchId}</span>
            <span className="ml-2">· 小隊 {s.patrols.find(p => p.id === myMember.patrolId)?.name || '未分隊'}</span>
            <span className="ml-2">· YMIS {myMember.ymNumber || '—'}</span>
          </div>
        )}
        {LEADER_ROLES.includes(session.role) && (
          <p className="text-sm text-slate-500 m-0">領袖的 Email 如需更改，請聯絡管理員。</p>
        )}
        {session.role === 'member' && (
          <p className="text-sm text-slate-500 m-0">支部、小隊、隊內身份、出生日期和 YMIS 不可自行修改，如有需要請聯絡領袖。</p>
        )}
        <button className="w-full text-base font-black bg-brand-600 text-white py-3 rounded-xl border-0 cursor-pointer hover:bg-brand-700 transition disabled:opacity-60" disabled={saving} onClick={save}>
          {saving ? '儲存中...' : '儲存'}
        </button>
      </section>
    </main>
  );
}
