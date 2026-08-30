'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppState, loadState, replyStatus, isMeetingCancelled } from '@/lib/store';
import { apiToggleMeetingCancel } from '@/lib/api';
import { getSession, Session } from '@/lib/session';
import Link from 'next/link';

function ic(t?:string){return t==='registered'?'✅':t==='declined'?'❌':t==='interested'?'❤️':''}
const weekdays=['日','一','二','三','四','五','六'];
function ymd(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function monthKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function addMonths(d:Date,n:number){const x=new Date(d);x.setMonth(x.getMonth()+n);return x}

const BRANCH_COLORS: Record<string, string> = {
  b1: '#ff9800', // 小童軍 Orange
  b2: '#ffeb3b', // 幼童軍 Yellow
  b3: '#4caf50', // 童軍 Green
  b4: '#f44336', // 深資 Red
  b5: '#2196f3', // 樂行 Blue
  troop: '#9c27b0' // 全旅 Purple
};

function getDotColor(branchId?: string) {
  return BRANCH_COLORS[branchId || 'troop'] || BRANCH_COLORS.troop;
}

function matchFrequency(r: any, d: Date) {
  if (d.getDay() !== r.weekday) return false;
  if (r.frequency === 'biweekly') {
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    if (weekNum % 2 !== 0) return false;
  } else if (r.frequency?.startsWith('monthly_')) {
    const weekOfMonth = Math.ceil(d.getDate() / 7);
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const isLastWeek = d.getDate() > lastDayOfMonth - 7;
    if (r.frequency === 'monthly_1' && weekOfMonth !== 1) return false;
    if (r.frequency === 'monthly_2' && weekOfMonth !== 2) return false;
    if (r.frequency === 'monthly_3' && weekOfMonth !== 3) return false;
    if (r.frequency === 'monthly_4' && weekOfMonth !== 4) return false;
    if (r.frequency === 'monthly_last' && !isLastWeek) return false;
  }
  return true;
}

const BRANCH_OPTIONS = [
  { id: 'all', label: '全部支部' },
  { id: 'troop', label: '全旅 / 跨支部' },
  { id: 'b1', label: '小童軍' },
  { id: 'b2', label: '幼童軍' },
  { id: 'b3', label: '童軍' },
  { id: 'b4', label: '深資童軍' },
  { id: 'b5', label: '樂行童軍' }
];

const TYPE_OPTIONS = [
  { id: 'all', label: '全部類型' },
  { id: 'meeting', label: '恆常集會' },
  { id: 'event', label: '特別活動' },
  { id: 'oneoff', label: '特別會議' }
];

function filterCalendarItems(items: any[], fBranch: string, fType: string) {
  return items.filter(it => {
    if (fBranch !== 'all') {
      const bid = it.branchId || 'troop';
      if (fBranch === 'troop' && bid !== 'troop' && bid !== '') return false;
      if (fBranch !== 'troop' && bid !== fBranch) return false;
    }
    if (fType !== 'all') {
      if (fType === 'meeting' && it.type !== 'meeting') return false;
      if (fType === 'event' && it.type !== 'event') return false;
      if (fType === 'oneoff' && it.type !== 'oneoff') return false;
    }
    return true;
  });
}

export default function Calendar(){
  const [s,setS]=useState<AppState|null>(null);
  const [session,setSessionState]=useState<Session|null>(undefined);
  const [err,setErr]=useState('');
  const [child,setChild]=useState('all');
  const [view,setView]=useState<'month'|'list'>('month');
  const [base,setBase]=useState(new Date());
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message));setSessionState(getSession())},[]);

  // Compute days (always called, no conditional hooks)
  const first=new Date(base.getFullYear(),base.getMonth(),1);
  const start=new Date(first);start.setDate(1-first.getDay());
  const days=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});

  if(session===undefined)return <div className="card">載入中...</div>;
  if(err&&!s)return <div className="card"><p className="badge red">{err}</p></div>;
  if(!s)return <div className="card">載入中...</div>;

  // ===== 公開行事曆（已選旅團但未登入）=====
  if(!session){
    try {
      const pubEvents=(s.events||[]).filter(e=>e.status==='published');
      const pubRegularMeetings=(s.regularMeetings||[]).filter(r=>r.enabled);
      const pubOneoffMeetings=(s.meetings||[]).filter(m=>m.status==='published');
      return (
        <div className="stack">
          <section className="hero">
            <span className="badge gold">📅 公開行事曆</span>
            <h1>旅團行事曆</h1>
            <p>登入後可查看個人化行事曆及回覆活動。</p>
            <Link className="btn primary" href="/login">登入</Link>
          </section>
          <section className="card stack" style={{padding: '12px 16px'}}>
            <div className="row" style={{flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
              <strong style={{minWidth: 50}}>🔍 支部：</strong>
              {BRANCH_OPTIONS.map(b => (
                <button
                  key={b.id}
                  className={`btn ${filterBranch === b.id ? 'primary' : ''}`}
                  style={{padding: '4px 10px', fontSize: '0.85rem'}}
                  onClick={() => setFilterBranch(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div className="row" style={{flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
              <strong style={{minWidth: 50}}>🏷️ 類型：</strong>
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t.id}
                  className={`btn ${filterType === t.id ? 'primary' : ''}`}
                  style={{padding: '4px 10px', fontSize: '0.85rem'}}
                  onClick={() => setFilterType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>
          <section className="card stack">
            <div className="row" style={{justifyContent:'space-between'}}>
              <button className="btn" onClick={()=>setBase(addMonths(base,-1))}>← 上月</button>
              <h2>{monthKey(base)}</h2>
              <button className="btn" onClick={()=>setBase(addMonths(base,1))}>下月 →</button>
            </div>
            <div className="month-grid">
              {weekdays.map(w=><div className="month-head" key={w}>星期{w}</div>)}
              {days.map(d=>{
                const date=ymd(d);
                let items:{type:string;title:string;time?:string;branchId?:string;purple:boolean}[]=[];
                pubEvents.filter(e=>e.date===date).forEach(e=>items.push({type:'event',title:e.title,branchId:e.branchId,purple:e.kind==='notice_troop_participation'}));
                pubOneoffMeetings.filter(m=>m.date===date).forEach(m=>items.push({type:'oneoff',time:m.startTime,title:m.title,branchId:m.branchId,purple:false}));
                pubRegularMeetings.forEach(r=>{
                  if(matchFrequency(r, d)){
                    try{
                      const c=isMeetingCancelled(s,r.branchId,date);
                      if(!c)items.push({type:'meeting',time:r.startTime,title:r.title,branchId:r.branchId,purple:false});
                    }catch(e){}
                  }
                });
                items = filterCalendarItems(items, filterBranch, filterType);
                return (
                  <div key={date} className={`month-cell ${d.getMonth()!==base.getMonth()?'dim':''}`}>
                    <div className="day-num">{d.getDate()}</div>
                    {items.slice(0,4).map((it,idx)=>(
                      <div key={idx} className={`mini-event ${it.purple?'purple':''}`} style={{ borderLeft: `4px solid ${getDotColor(it.branchId)}` }}>
                        {it.time ? `${it.time} ` : ''}{it.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      );
    } catch(e:any) {
      return <div className="card"><p className="badge red">行事曆載入失敗：{e?.message||String(e)}</p><Link className="btn primary" href="/login">登入</Link></div>;
    }
  }

  // ===== 已登入的個人化行事曆 =====
  const role=session.role;
  const canCancel=['super_admin','troop_super','admin','group_leader','branch_leader'].includes(role);
  const parent=role==='parent'?s.users.find(u=>u.id===session.userId):null;
  const children=parent?(s.members||[]).filter(m=>(parent.childMemberIds||[]).includes(m.id)||m.parentUserId===parent.id):[];

  function cancelDay(branchId:string,date:string,type:'cancelled'|'recess'='cancelled'){
    setErr('');
    apiToggleMeetingCancel(branchId,date,'領袖標記',type).then(f=>setS(f)).catch(e=>setErr(e.message))
  }

  function visibleEvent(e:any){
    if(role==='member'){const m=(s.members||[]).find(x=>x.id===session.memberId);return !!m&&e.targetMemberIds.includes(m.id)&&replyStatus(s,e.id,m.id)?.type!=='declined'}
    if(role==='parent'&&children.length>0){return children.some(c=>e.targetMemberIds.includes(c.id))}
    return true;
  }

  function rightForEvent(e:any){
    if(['super_admin','troop_super','admin','group_leader','branch_leader','coach'].includes(role)){
      const targets=(s.members||[]).filter(m=>e.targetMemberIds.includes(m.id));
      const counts:any={registered:0,interested:0,declined:0,unresponded:0};
      targets.forEach(m=>{const r=replyStatus(s,e.id,m.id);counts[r?.type||'unresponded']++});
      return `✅${counts.registered} ❤️${counts.interested} ⚠️${counts.unresponded}`;
    }
    if(role==='parent'){
      const cs=(child==='all'?children:children.filter(c=>c.id===child)).filter(c=>e.targetMemberIds.includes(c.id));
      return cs.map(c=>`${child==='all'?c.name:''}${ic(replyStatus(s,e.id,c.id)?.type)||'·'}`).join(' ')||'—';
    }
    if(role==='member'){const r=replyStatus(s,e.id,session.memberId||'');return `${ic(r?.type)} ${r?.type==='interested'?'等待家長確認':''}`}
    return '';
  }

  const pubEvents=(s.events||[]).filter(e=>e.status==='published');
  const visibleEvents=pubEvents.filter(visibleEvent);
  
  const calendarItems:any[]=[];
  visibleEvents.forEach(e=>calendarItems.push({type:'event',date:e.date,title:e.title,branchId:e.branchId,purple:e.kind==='notice_troop_participation',event:e}));
  
  (s.meetings||[]).filter(m=>m.status==='published').forEach(m=>{
    if(role==='member'){
      const mem = (s.members||[]).find(x=>x.id===session.memberId);
      if(m.branchId && mem && m.branchId !== mem.branchId) return;
    }
    calendarItems.push({type:'oneoff', date:m.date, time:m.startTime, title:m.title, branchId:m.branchId||'troop', oneoff:m});
  });

  (s.regularMeetings||[]).filter(r=>r.enabled).forEach(r=>{
    for(let i=-60;i<180;i++){
      const d=new Date(base);d.setDate(d.getDate()+i);
      const date=ymd(d);
      if(!matchFrequency(r, d)) continue;

      let cancelled=false;
      let cancelInfo:any = null;
      try{
        cancelInfo = s.cancelledMeetings.find(c => c.branchId === r.branchId && c.date === date);
        cancelled = !!cancelInfo;
      }catch(e){}
      if(cancelled && role==='member') continue;
      calendarItems.push({type:'meeting', date, time:r.startTime, title:r.title, branchId:r.branchId, cancelled, cancelType:cancelInfo?.type, meeting:r});
    }
  });

  return (
    <div className="stack">
      <section className="hero">
        <span className="badge gold">📅 行事曆</span>
        <h1>{role==='member'?'我的行事曆':role==='parent'?'子女行事曆':'領袖行事曆'}</h1>
        <p>以月曆為主、清單為輔。領袖可標記不用集會；成員不會看到已取消的集會。</p>
        <div className="row">
          <button className={`btn ${view==='month'?'primary':''}`} onClick={()=>setView('month')}>月曆</button>
          <button className={`btn ${view==='list'?'primary':''}`} onClick={()=>setView('list')}>清單</button>
        </div>
      </section>
      {err&&<p className="badge red">{err}</p>}
      {role==='parent'&&children.length>0&&
        <section className="card row">
          <strong>子女：</strong>
          <button className={`btn ${child==='all'?'primary':''}`} onClick={()=>setChild('all')}>全部</button>
          {children.map(c=><button key={c.id} className={`btn ${child===c.id?'primary':''}`} onClick={()=>setChild(c.id)}>{c.name}</button>)}
        </section>
      }
      <section className="card stack" style={{padding: '12px 16px'}}>
        <div className="row" style={{flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
          <strong style={{minWidth: 50}}>🔍 支部：</strong>
          {BRANCH_OPTIONS.map(b => (
            <button
              key={b.id}
              className={`btn ${filterBranch === b.id ? 'primary' : ''}`}
              style={{padding: '4px 10px', fontSize: '0.85rem'}}
              onClick={() => setFilterBranch(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="row" style={{flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
          <strong style={{minWidth: 50}}>🏷️ 類型：</strong>
          {TYPE_OPTIONS.map(t => (
            <button
              key={t.id}
              className={`btn ${filterType === t.id ? 'primary' : ''}`}
              style={{padding: '4px 10px', fontSize: '0.85rem'}}
              onClick={() => setFilterType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>
      {view==='month'?
        <section className="card stack">
          <div className="row" style={{justifyContent:'space-between'}}>
            <button className="btn" onClick={()=>setBase(addMonths(base,-1))}>← 上月</button>
            <h2>{monthKey(base)}</h2>
            <button className="btn" onClick={()=>setBase(addMonths(base,1))}>下月 →</button>
          </div>
          <div className="month-grid">
            {weekdays.map(w=><div className="month-head" key={w}>星期{w}</div>)}
            {days.map(d=>{
              const date=ymd(d);
              const its=filterCalendarItems(calendarItems.filter(i=>i.date===date), filterBranch, filterType);
              return (
                <div key={date} className={`month-cell ${d.getMonth()!==base.getMonth()?'dim':''}`}>
                  <div className="day-num">{d.getDate()}</div>
                  {its.slice(0,4).map((it,idx)=>(
                    <div key={idx} className={`mini-event ${it.purple?'purple':''} ${it.cancelled?'cancelled':''}`} style={{ borderLeft: `4px solid ${getDotColor(it.branchId)}` }}>
                      {it.time ? `${it.time} ` : ''}{it.title}
                      {it.type==='meeting'&&canCancel&& (
                        <div style={{float:'right'}}>
                          {it.cancelled ? (
                            <button style={{border:0,background:'transparent',cursor:'pointer'}} onClick={()=>cancelDay(it.meeting.branchId,it.date)}>↺</button>
                          ) : (
                            <>
                              <button title="標記取消" style={{border:0,background:'transparent',cursor:'pointer'}} onClick={()=>cancelDay(it.meeting.branchId,it.date,'cancelled')}>✕</button>
                              <button title="標記休會" style={{border:0,background:'transparent',cursor:'pointer'}} onClick={()=>cancelDay(it.meeting.branchId,it.date,'recess')}>💤</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      :
        <section className="card stack">
          <h2>清單</h2>
          {filterCalendarItems(calendarItems, filterBranch, filterType).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,60).map((it,idx)=>(
            <div key={idx} className={`event-line`} style={{ borderLeft: `8px solid ${getDotColor(it.branchId)}` }}>
              <div>
                <strong>{it.cancelled? (it.meeting?.type==='recess'?'休會：':'已取消：') : ''} {it.title}</strong>
                <div className="muted">{it.date}{it.type==='event'?` · ${it.event?.location||'待定'} · ${it.event?.source||''}`:it.type==='oneoff'?` · ${it.oneoff?.startTime||''}-${it.oneoff?.endTime||''} · ${it.oneoff?.location||''}`:` · ${it.meeting?.startTime||''}-${it.meeting?.endTime||''} · ${it.meeting?.location||''}`}</div>
              </div>
              <div className="row">
                {it.type==='event'?<span>{rightForEvent(it.event)}</span>:<span className={`badge ${it.cancelled?'red':'green'}`}>{it.cancelled?(it.meeting?.type==='recess'?'休會':'取消'):it.type==='oneoff'?'特別會議':'恆常'}</span>}
                {it.type==='meeting'&&canCancel&& (
                  <>
                    {it.cancelled ? (
                      <button className="btn" onClick={()=>cancelDay(it.meeting.branchId,it.date)}>恢復</button>
                    ) : (
                      <>
                        <button className="btn red" onClick={()=>cancelDay(it.meeting.branchId,it.date,'cancelled')}>✕ 取消</button>
                        <button className="btn" onClick={()=>cancelDay(it.meeting.branchId,it.date,'recess')}>💤 休會</button>
                      </>
                    )}
                  </>
                )}
                {it.type==='event'&&['super_admin','troop_super','admin','group_leader','branch_leader','coach'].includes(role)&&<a className="btn" href={`/admin/registrations?eventId=${it.event.id}`}>查看→</a>}
              </div>
            </div>
          ))}
        </section>
      }
    </div>
  );
}
