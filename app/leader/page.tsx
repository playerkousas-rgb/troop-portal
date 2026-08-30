'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState, computeStats, replyStatus } from '@/lib/store';
import { apiSetReply } from '@/lib/api';
import Auth from '@/components/Auth';
import { FeatureCard, SummaryCard } from '@/components/Cards';
import PluginIframeCard from '@/components/PluginCard';
import Collapsible from '@/components/Collapsible';
import { getSession } from '@/lib/session';
import { ROLE_LABEL } from '@/lib/model';
import Link from 'next/link';
import AttendanceCard from '@/components/AttendanceCard';

export default function Leader(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  const [loadingId,setLoadingId]=useState('');
  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);
  const stats=s?computeStats(s):{users:0,pending:0,activities:0,notices:0};
  const session = getSession();
  const myId = session?.userId || '';

  async function act(eid:string,type:'registered'|'declined'|'interested'){
    if(!myId)return;setErr('');setLoadingId(eid+type);
    try{const f=await apiSetReply({eventId:eid,memberId:myId,type});setS(f)}catch(e:any){setErr(e.message)}finally{setLoadingId('')}
  }

  const events = (s?.events || []).filter(e => e.status === 'published' && (e.scope === 'troop' || e.targetMemberIds.includes(myId) || e.branchId === session?.branchId));

  return <Auth roles={['super_admin','admin','group_leader','branch_leader','coach']}><div className="stack">
    <section className="card stack" style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)', color: '#fff' }}>
       <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>👤 {session?.name}</h2>
            <p style={{ opacity: 0.9, margin: 0 }}>角色：{ROLE_LABEL[session?.role || 'coach']}</p>
          </div>
          <div className="row">
            <Link href="/profile" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>個人設定 / 改密碼</Link>
          </div>
       </div>
    </section>

    <section className="hero"><span className="badge gold">領袖控制台</span><p>管理所屬支部的活動、成員及通告。</p></section>
    {err&&<p className="badge red">{err}</p>}
    <section className="grid">
      <SummaryCard label="活動" value={stats.activities} desc="已發布活動" tone="green"/>
      <SummaryCard label="待審批" value={stats.pending} desc="等待審批申請" tone="red"/>
      <SummaryCard label="通告" value={stats.notices} desc="圖書館引入通告" tone="gold"/>
    </section>

    {s?.plugins && s.plugins.length > 0 && (
      <section className="stack">
        <h3>擴充元件</h3>
        <div className="grid">
          {s.plugins.filter(p => p.id !== 'troop_attendance').map(p => (
            <PluginIframeCard 
              key={p.id} 
              plugin={p} 
              unitCode={session?.troopCode || ''} 
              settings={s.pluginSettings?.find(ps => ps.pluginId === p.id)}
            />
          ))}
        </div>
      </section>
    )}

    <Collapsible title="📢 待回覆與出席活動 (領袖個人報名與確認)" defaultOpen={true}>
      <p className="muted">作為領袖或統籌人員，你可在此點選出席旅團通告與集會活動，方便旅長與團隊掌握出席人力。</p>
      <div className="stack">
        {events.length===0?<div className="card"><p className="muted">暫無待確認或待出席的活動通告。</p></div>:
          events.map(e=>{
            const r=replyStatus(s,e.id,myId);
            return (
              <div className="event-line event-blue" key={e.id}>
                <div>
                  <strong>{e.title}</strong>
                  <div className="muted">{e.date} · {e.location}{e.fee?` · ${e.fee}`:''}</div>
                </div>
                <div className="row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {(() => {
                    const st = r?.type;
                    if (st === 'registered') return <span className="badge green" style={{fontSize: '0.85rem', padding: '4px 8px', fontWeight: 'bold'}}>✅ 狀態：確定出席</span>;
                    if (st === 'declined') return <span className="badge red" style={{fontSize: '0.85rem', padding: '4px 8px', fontWeight: 'bold'}}>❌ 狀態：不能出席</span>;
                    if (st === 'interested') return <span className="badge gold" style={{fontSize: '0.85rem', padding: '4px 8px', fontWeight: 'bold'}}>❤️ 狀態：有興趣出席</span>;
                    return <span className="badge" style={{fontSize: '0.85rem', padding: '4px 8px', background: '#fff9c4', color: '#555', border: '1px solid #fbc02d'}}>⚠️ 狀態：尚未確認</span>;
                  })()}
                  <button
                    className="btn"
                    disabled={loadingId===e.id+'registered'}
                    style={r?.type === 'registered' ? { background: '#2e7d32', color: '#fff', border: '2px solid #1b5e20', fontWeight: 'bold' } : {}}
                    onClick={()=>act(e.id,'registered')}
                  >
                    {r?.type === 'registered' ? '【已確認】✅ 確定出席' : '✅ 確定出席'}
                  </button>
                  <button
                    className="btn"
                    disabled={loadingId===e.id+'declined'}
                    style={r?.type === 'declined' ? { background: '#d32f2f', color: '#fff', border: '2px solid #b71c1c', fontWeight: 'bold' } : {}}
                    onClick={()=>act(e.id,'declined')}
                  >
                    {r?.type === 'declined' ? '【已婉拒】❌ 不能出席' : '❌ 不能出席'}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </Collapsible>

    <section className="grid" style={{ marginTop: '2rem' }}>
      <AttendanceCard />
      <FeatureCard title="成員資料庫" icon="👥" text="查看及管理所屬支部成員。" href="/admin/members"/>
      <FeatureCard title="活動管理" icon="🗓️" text="新增、發布及管理活動。" href="/admin/events"/>
      <FeatureCard title="報名管理" icon="📋" text="查看報名狀態及匯出。" href="/admin/registrations"/>
      <FeatureCard title="圖書館標記" icon="📚" text="引入通告。" href="/library/import"/>
      <FeatureCard title="行事曆" icon="📅" text="查看及管理行事曆。" href="/calendar"/>
      <FeatureCard title="審核" icon="✅" text="審核家長申請。" href="/admin/applications"/>
    </section>
  </div></Auth>;
}
