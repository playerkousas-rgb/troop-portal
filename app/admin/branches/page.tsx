'use client';
import { branches } from '@/lib/model';
import { AppState, loadState } from '@/lib/store';
import { apiCreatePatrol, apiTogglePatrol, apiDeletePatrol } from '@/lib/api';
import { useEffect, useState } from 'react';
function branchHint(id:string){ if(id==='b1') return '小童軍預設沒有分隊。'; if(id==='b2') return '幼童軍按九種顏色分隊（紅、黃、藍、白、灰、綠、棕、黑、橙）。'; if(id==='b3') return '童軍按動物名稱小隊。'; return '此支部預設沒有分隊，如需要可自行新增。'; }
export default function Page(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  const [loadingId,setLoadingId]=useState('');
  const [selected,setSelected]=useState('b3');const [name,setName]=useState('');const [short,setShort]=useState('');
  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);
  function memberName(id?:string){return s?.members.find(m=>m.id===id)?.name||'未指定'}
  async function add(){if(!name.trim())return;setErr('');setLoadingId('add');try{const f=await apiCreatePatrol({branchId:selected,name,short});setS(f);setName('');setShort('')}catch(e:any){setErr(e.message)}finally{setLoadingId('')}}
  async function toggle(id:string){setErr('');setLoadingId(id);try{const f=await apiTogglePatrol(id);setS(f)}catch(e:any){setErr(e.message)}finally{setLoadingId('')}}
  async function del(id:string,pname:string){if(!confirm(`確定要刪除小隊「${pname}」嗎？`))return;setErr('');setLoadingId(id+'del');try{const f=await apiDeletePatrol(id);setS(f)}catch(e:any){setErr(e.message)}finally{setLoadingId('')}}
  if(!s)return <div className="card">{err||'載入中...'}</div>;
  const ps=s.patrols.filter(p=>p.branchId===selected);
  return <div className="stack"><section className="hero"><span className="badge gold">支部管理</span><h1>支部與小隊設定</h1><p>新增、啟用／停用及刪除各支部小隊。</p></section>
    {err&&<p className="badge red">{err}</p>}
    <section className="grid">{branches.map(b=><button className={`card ${selected===b.id?'notice-mode active':''}`} key={b.id} onClick={()=>setSelected(b.id)} style={{textAlign:'left'}}><span className="badge blue">{b.id}</span><h3>{b.name}</h3><p className="muted">{branchHint(b.id)}</p></button>)}</section>
    <section className="grid-wide"><div className="card stack"><h2>{branches.find(b=>b.id===selected)?.name} · 小隊設定</h2><p className="muted">{branchHint(selected)}</p>
      {ps.length===0?<div className="card" style={{boxShadow:'none',background:'#f8fafc'}}><strong>此支部目前沒有分隊。</strong></div>:
      <table className="table"><thead><tr><th>名稱</th><th>簡稱</th><th>隊長</th><th>成員數</th><th>狀態</th><th>操作</th></tr></thead><tbody>{ps.map((p)=><tr key={p.id}><td>{p.name}</td><td>{p.short}</td><td>{memberName(p.leaderMemberId)}</td><td>{s.members.filter(m=>m.patrolId===p.id).length}</td><td>{p.enabled?<span className="badge green">啟用</span>:<span className="badge red">停用</span>}</td><td>
        <button className="btn" disabled={loadingId===p.id} onClick={()=>toggle(p.id)}>{loadingId===p.id?'⏳ 中...':(p.enabled?'停用':'啟用')}</button>{' '}
        <button className="btn red" disabled={loadingId===p.id+'del'} onClick={()=>del(p.id,p.name)}>{loadingId===p.id+'del'?'⏳ 刪除中...':'🗑️ 刪除'}</button>
      </td></tr>)}</tbody></table>}
      <div className="grid"><input value={name} onChange={e=>setName(e.target.value)} placeholder="新增名稱，例如 RED / TIGER"/><input value={short} onChange={e=>setShort(e.target.value)} placeholder="簡稱"/></div>
      <button className="btn primary" disabled={loadingId==='add'} onClick={add}>{loadingId==='add'?'⏳ 處理寫入中...':'＋ 新增小隊'}</button></div>
      <div className="card"><h3>統計用途</h3><p className="muted">報名管理可按小隊統計參與、興趣及未回覆人數。</p></div></section>
  </div>;
}
