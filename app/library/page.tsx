'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
import Link from 'next/link';
export default function Library(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);
  if(err)return <div className="card"><p className="badge red">{err}</p></div>;
  if(!s)return <div className="card">載入中...</div>;
  return <div className="stack"><section className="hero"><span className="badge gold">圖書館</span><h1>通告圖書館</h1><p>這裡顯示已引入 ScoutSystem 的通告。領袖可到圖書館標記頁引入新通告。</p><Link className="btn primary" href="/library/import">📚 引入新通告</Link></section>
    <section className="grid-wide">{s.bookmarks.length===0?<div className="card"><p className="muted">暫無已引入通告。</p></div>:s.bookmarks.map(b=><div className="card" key={b.id}><span className={`badge ${b.mode==='troop_participation'?'purple':'gold'}`}>{b.mode==='troop_participation'?'旅團參與':'資訊性'}</span><h3>{b.title}</h3><p className="muted">來源：{b.source||'—'}</p><p className="muted">原截止：{b.officialDeadline||'—'} · 本旅截止：{b.internalDeadline||'—'}</p><p className="muted">支部：{b.branchTags.join(', ')||'全旅'}</p></div>)}</section>
  </div>;
}
