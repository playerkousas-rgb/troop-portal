'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
import { apiUpdateMember, apiUpdateUserField } from '@/lib/api';
import { getSession } from '@/lib/session';
import { branches, ROLE_LABEL, LEADER_ROLES } from '@/lib/model';
import Link from 'next/link';

export default function Profile(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');
  const [ok,setOk]=useState('');
  const [saving,setSaving]=useState(false);
  const session=getSession();

  // editable fields
  const [name,setName]=useState('');
  const [password,setPassword]=useState('');
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const [patrolId,setPatrolId]=useState('');
  const [patrolRole,setPatrolRole]=useState('');

  useEffect(()=>{
    loadState().then(st=>{
      setS(st);
      if(!session){return}
      if(session.role==='member'){
        const m=st.members.find(x=>x.id===session.memberId);
        if(m){setName(m.name);setPhone(m.emergencyContactPhone||'');setEmail('');setPatrolId(m.patrolId||'');setPatrolRole(m.patrolRole||'')}
      } else {
        const u=st.users.find(x=>x.id===session.userId);
        if(u){setName(u.name);if(!LEADER_ROLES.includes(session.role))setEmail(u.email||'')}
      }
    }).catch(e=>setErr(e.message))
  },[]);

  async function save(){
    setErr('');setOk('');setSaving(true);
    try{
      if(session?.role==='member'&&session.memberId){
        const updates:any={memberId:session.memberId,name};
        if(password)updates.password=password;
        if(phone)updates.emergencyContactPhone=phone;
        if(patrolId!==undefined)updates.patrolId=patrolId;
        if(patrolRole)updates.patrolRole=patrolRole;
        const fresh=await apiUpdateMember(updates);
        setS(fresh);
      } else if(session?.userId){
        if(name)await apiUpdateUserField(session.userId,'name',name);
        if(password)await apiUpdateUserField(session.userId,'password',password);
        if(!LEADER_ROLES.includes(session.role)&&email)await apiUpdateUserField(session.userId,'email',email);
        const {loadState}=await import('@/lib/store');
        setS(await loadState());
      }
      setOk('✅ 已儲存');
      setPassword('');
    }catch(e:any){setErr(e.message)}finally{setSaving(false)}
  }

  if(!session)return <div className="card"><p className="muted">請先登入。<Link href="/login">登入</Link></p></div>;
  if(!s)return <div className="card">載入中...</div>;

  const myMember = session.role==='member' ? s.members.find(m=>m.id===session.memberId) : null;
  const availablePatrols = myMember ? s.patrols.filter(p=>p.branchId===myMember.branchId&&p.enabled) : [];

  return <div className="stack">
    <section className="hero">
      <span className="badge gold">個人資料</span>
      <h1>{session.name}</h1>
      <p>角色：{ROLE_LABEL[session.role]}</p>
    </section>
    {err&&<p className="badge red">{err}</p>}
    {ok&&<p className="badge green">{ok}</p>}

    <section className="card stack">
      <label>姓名<input value={name} onChange={e=>setName(e.target.value)}/></label>

      <label>密碼<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="留空 = 不改"/></label>

      {(session.role==='member' || !LEADER_ROLES.includes(session.role)) && (
        <label>Email（用於找回密碼）<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      )}
      {LEADER_ROLES.includes(session.role) && (
        <p className="muted">領袖的 Email 如需更改，請聯絡管理員。</p>
      )}

      {session.role==='member' && (
        <>
          <label>電話<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="聯絡電話"/></label>
          <label>小隊
            <select value={patrolId} onChange={e=>setPatrolId(e.target.value)}>
              <option value="">不適用 / 未分隊</option>
              {availablePatrols.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>隊內身份
            <select value={patrolRole} onChange={e=>setPatrolRole(e.target.value)}>
              <option value="">隊員</option>
              <option value="leader">隊長</option>
              <option value="deputy">副隊長</option>
            </select>
          </label>
          <p className="muted">出生日期和 YMIS 不可自行修改，如有需要請聯絡領袖。</p>
        </>
      )}

      <button className="btn primary" disabled={saving} onClick={save}>{saving?'儲存中...':'儲存'}</button>
    </section>
  </div>;
}
