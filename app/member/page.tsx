'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState, visibleEventsForMember, replyStatus } from '@/lib/store';
import { apiSetReply } from '@/lib/api';
import { getSession } from '@/lib/session';
import Collapsible from '@/components/Collapsible';
import PluginIframeCard from '@/components/PluginCard';
import Link from 'next/link';
import AttendanceCard from '@/components/AttendanceCard';

export default function Member(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  const [loadingId,setLoadingId]=useState('');
  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);
  const session=getSession();
  if(err)return <div className="card"><p className="badge red">{err}</p></div>;
  if(!s)return <div className="card">載入中...</div>;
  const member=s.members.find(m=>m.id===(session?.memberId))||s.members[0];
  if(!member)return <div className="card">找不到成員資料。</div>;
  const adult=member.age>=18;
  async function act(eid:string,type:'interested'|'registered'|'declined'){
    setLoadingId(eid+type);setErr('');
    try{const f=await apiSetReply({eventId:eid,memberId:member.id,type});setS(f)}catch(e:any){setErr(e.message)}finally{setLoadingId('')}
  }
  const events=visibleEventsForMember(s,member);
  
  // Filter plugins by role and branch if needed
  const visiblePlugins = s.plugins.filter(p => {
    // 點名已內建，避免舊 Plugins 表紀錄重複顯示。
    if (p.id === 'troop_attendance') return false;
    // Example: vs_badge_tracker only for Venture (b4)
    if (p.id === 'vs_badge_tracker' && member.branchId !== 'b4') return false;
    return true;
  });
  
  return (
    <div className="stack">
      <section className="card stack" style={{ background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)', color: '#fff' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>👤 {member.name}</h2>
              <p style={{ opacity: 0.9, margin: 0 }}>身份：成員 {member.specialRole ? `(${member.specialRole})` : ''}</p>
            </div>
            <div className="row">
              <Link href="/profile" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>個人設定 / 改密碼</Link>
            </div>
        </div>
      </section>

      <section className="hero">
        <span className="badge gold">成員空間</span>
        <p>已登入：{member.name}</p>
      </section>

      {err&&<p className="badge red">{err}</p>}

      <section className="grid" style={{ marginBottom: '2rem' }}>
          <AttendanceCard description="查看自己在日常集會及旅團自辦活動的出席紀錄。" />
          {visiblePlugins.map(p => (
            <PluginIframeCard 
              key={p.id} 
              plugin={p} 
              unitCode={session?.troopCode || ''} 
              settings={s.pluginSettings?.find(ps => ps.pluginId === p.id)}
            />
          ))}
        </section>

      <Collapsible title="📢 活動與集會" defaultOpen={true}>
        <p className="muted">{adult?'你已 18 歲或以上，可自行 ✅ / ❌。':'你未滿 18 歲，可按 ❤️ 表示有興趣；參加 / 不參加由家長決定。'}</p>
        <div className="stack">
          {events.length===0?<div className="card"><p className="muted">暫無可見活動。</p></div>:
            events.map(e=>{
              const r=replyStatus(s,e.id,member.id);
              const isDuty = e.dutyPatrol && member.patrolId && s.patrols.find(p => p.id === member.patrolId)?.name === e.dutyPatrol;
              return (
                <div className={`event-line ${isDuty ? 'event-purple' : 'event-blue'}`} key={e.id}>
                  <div>
                    <div className="row">
                      <strong>{e.title}</strong>
                      {isDuty && <span className="badge purple">你的小隊值日</span>}
                      {e.dutyPatrol && !isDuty && <span className="badge">{e.dutyPatrol} 值日</span>}
                    </div>
                    <div className="muted">
                      {e.date} · {e.location}{e.fee?` · ${e.fee}`:''}
                    </div>
                    {e.paymentUrl && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <a href={e.paymentUrl} target="_blank" rel="noopener noreferrer" className="btn gold" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>前往付款</a>
                      </div>
                    )}
                  </div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {(() => {
                      const st = r?.type;
                      if (st === 'registered') return <span className="badge green" style={{fontSize: '0.85rem', padding: '4px 8px', fontWeight: 'bold'}}>✅ 狀態：已報名參加</span>;
                      if (st === 'declined') return <span className="badge red" style={{fontSize: '0.85rem', padding: '4px 8px', fontWeight: 'bold'}}>❌ 狀態：已婉拒參加</span>;
                      if (st === 'interested') return <span className="badge gold" style={{fontSize: '0.85rem', padding: '4px 8px', fontWeight: 'bold'}}>❤️ 狀態：有興趣</span>;
                      return <span className="badge" style={{fontSize: '0.85rem', padding: '4px 8px', background: '#fff9c4', color: '#555', border: '1px solid #fbc02d'}}>⚠️ 狀態：尚未回覆</span>;
                    })()}
                    <button
                      className="btn"
                      disabled={loadingId===e.id+'interested'}
                      style={r?.type === 'interested' ? { background: '#e91e63', color: '#fff', border: '2px solid #880e4f', boxShadow: '0 0 8px rgba(233,30,99,0.5)', fontWeight: 'bold' } : { opacity: r?.type ? 0.65 : 1 }}
                      onClick={()=>act(e.id,'interested')}
                    >
                      {r?.type === 'interested' ? '【已點選】❤️ 有興趣' : '❤️ 有興趣'}
                    </button>
                    {adult&&<>
                      <button
                        className="btn"
                        disabled={loadingId===e.id+'registered'}
                        style={r?.type === 'registered' ? { background: '#2e7d32', color: '#fff', border: '2px solid #1b5e20', boxShadow: '0 0 8px rgba(46,125,50,0.5)', fontWeight: 'bold' } : { background: '#f5f5f5', color: '#333', border: '1px solid #ccc', opacity: r?.type ? 0.65 : 1 }}
                        onClick={()=>act(e.id,'registered')}
                      >
                        {r?.type === 'registered' ? '【已報名】✅ 參加' : '✅ 參加'}
                      </button>
                      <button
                        className="btn"
                        disabled={loadingId===e.id+'declined'}
                        style={r?.type === 'declined' ? { background: '#d32f2f', color: '#fff', border: '2px solid #b71c1c', boxShadow: '0 0 8px rgba(211,47,47,0.5)', fontWeight: 'bold' } : { background: '#f5f5f5', color: '#333', border: '1px solid #ccc', opacity: r?.type ? 0.65 : 1 }}
                        onClick={()=>act(e.id,'declined')}
                      >
                        {r?.type === 'declined' ? '【已婉拒】❌ 不參加' : '❌ 不參加'}
                      </button>
                    </>}
                  </div>
                </div>
              );
            })}
        </div>
      </Collapsible>

      <Collapsible title="🆘 個人緊急聯絡資料">
        <div className="stack card" style={{ background: '#f8f9fa' }}>
          <div className="row"><strong>聯絡人：</strong><span>{member.emergencyContactName || '未設定'}</span></div>
          <div className="row"><strong>電話：</strong><span>{member.emergencyContactPhone || '未設定'}</span></div>
          <div className="row"><strong>支部：</strong><span>{member.branchId}</span></div>
          <div className="row"><strong>小隊：</strong><span>{s.patrols.find(p=>p.id===member.patrolId)?.name || '—'}</span></div>
        </div>
      </Collapsible>

      <div className="row" style={{ marginTop: '2rem' }}>
        <Link className="btn" href="/profile">我的資料 / 改密碼</Link>
        <Link className="btn" href="/calendar">行事曆</Link>
      </div>
    </div>
  );
}
