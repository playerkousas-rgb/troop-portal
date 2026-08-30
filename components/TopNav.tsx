'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getSession, Session } from '@/lib/session';
import { isAdmin } from '@/lib/model';

export default function TopNav(){
  const pathname = usePathname(); const router = useRouter();
  const [session,setSess]=useState<Session|null>(null);
  const [troop,setTroop]=useState<any>(null);
  useEffect(()=>{setSess(getSession()); try{setTroop(JSON.parse(localStorage.getItem('scoutsystem2_selected_troop')||'null'))}catch{setTroop(null)}},[pathname]);
  const logout=()=>{clearSession();setSess(null);router.push('/')};
  const dash = session?.role==='parent'?'/parent':session?.role==='member'?'/member':session?.role==='guest'?'/login':isAdmin(session?.role)?'/admin':'/leader';
  // 已選旅團但未登入 → 可看到行事曆(全)和活動
  const hasTroop = !!troop;
  return <header className="topbar"><div className="topbar-inner">
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
      <Link className="brand" href="/">ScoutSystem</Link>
      {session && (
        <div style={{ fontSize: '0.7rem', color: '#666', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
          👤 {session.name} <span style={{ opacity: 0.7 }}>({isAdmin(session.role) ? '管理員' : session.role})</span>
        </div>
      )}
    </div>
    <nav className="nav">
      {/* 已登入帳號 */}
      {session && <><Link className="btn" href="/calendar">行事曆</Link><Link className="btn" href="/activities">活動</Link><Link className="btn" href="/notices">公告</Link><Link className="btn" href="/library">圖書館</Link></>}
      {/* 已選旅團但未登入帳號 → 可看公開行事曆和活動 */}
      {!session && hasTroop && <><Link className="btn optional" href="/calendar">行事曆</Link><Link className="btn optional" href="/activities">活動</Link></>}
      {/* 未選旅團 */}
      {!session && !hasTroop && <><Link className="btn optional" href="/setup">接入</Link><Link className="btn optional" href="/downloads">下載</Link><Link className="btn optional" href="/updates">更新</Link><Link className="btn optional" href="/troops">使用旅團</Link></>}
      {/* 已選旅團 → 始終顯示接入相關 */}
      {!session && hasTroop && <><Link className="btn optional" href="/onboard">申請帳戶</Link><Link className="btn optional" href="/troops">使用旅團</Link></>}
      {session && isAdmin(session.role) && <><Link className="btn optional" href="/updates">更新</Link><Link className="btn optional" href="/marketplace">元件市場</Link></>}
      {session ? <><Link className="btn primary" href={dash}>控制台</Link><button className="btn" onClick={logout}>登出</button></> : <><span className="badge gold">{troop?`已選：${troop.name}`:'未選旅團'}</span><Link className="btn primary" href="/login">登入</Link></>}
    </nav>
  </div></header>
}
