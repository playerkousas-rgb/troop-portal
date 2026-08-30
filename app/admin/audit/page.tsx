'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
export default function Page(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);
  if(!s)return <div className="card">{err||'載入中...'}</div>;
  return <div className="stack"><section className="hero"><span className="badge gold">審核紀錄</span><h1>操作紀錄</h1><p>所有批核、活動、報名等操作記錄，來自 AuditLogs Sheet。</p></section>
    <section className="card"><table className="table"><thead><tr><th>時間</th><th>使用者</th><th>動作</th><th>對象</th><th>內容</th></tr></thead><tbody>{s.audits.map(a=><tr key={a.id}><td>{a.createdAt}</td><td>{a.userId}</td><td>{a.action}</td><td>{a.entity}:{a.entityId}</td><td>{a.detail}</td></tr>)}</tbody></table>{s.audits.length===0&&<p className="muted">暫無紀錄。</p>}</section>
  </div>;
}
