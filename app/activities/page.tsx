'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
import Link from 'next/link';
export default function Activities(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);
  if(err)return <div className="card"><p className="badge red">{err}</p></div>;
  if(!s)return <div className="card">載入中...</div>;
  const published=s.events.filter(e=>e.status==='published');
  return <div className="stack">
    <section className="hero">
      <span className="badge gold">活動</span>
      <h1>旅團 / 支部活動</h1>
      <p>活動是整個旅團或支部要報名參與的事項。登入後可回覆參加 / 不參加。</p>
      <Link className="btn primary" href="/login">登入查看詳情</Link>
    </section>
    <section className="grid-wide">{published.length===0?<div className="card"><p className="muted">暫無已發布活動。</p></div>:published.map(e=><div className="card" key={e.id}><span className={`badge ${e.kind==='notice_troop_participation'?'purple':'blue'}`}>{e.kind==='notice_troop_participation'?'圖書館轉入 · 旅團參與':'旅團 / 支部活動'}</span><h3>{e.title}</h3><p className="muted">{e.date} · {e.location||'待定'}</p><p className="muted">{e.source||'—'}{e.fee?` · ${e.fee}`:''}</p></div>)}</section>
  </div>;
}
