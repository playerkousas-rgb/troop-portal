'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
import { apiToggleRegularMeeting, apiCreateRegularMeeting, apiCreateEvent, apiDeleteRegularMeeting, apiUpdateRegularMeeting } from '@/lib/api';
import { branches } from '@/lib/model';
import { getSession } from '@/lib/session';
const weekdays=['日','一','二','三','四','五','六'];

export default function Page(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');
  const [okMsg,setOkMsg]=useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Regular meeting form
  const [selBranches,setSelBranches]=useState<string[]>(['b3']);
  const [title,setTitle]=useState('');
  const [weekday,setWeekday]=useState('6');
  const [frequency,setFrequency]=useState('weekly');
  const [startTime,setStartTime]=useState('14:00');
  const [endTime,setEndTime]=useState('16:00');
  const [location,setLocation]=useState('本中心');

  // Edit form states
  const [eTitle, setETitle] = useState('');
  const [eWeekday, setEWeekday] = useState('6');
  const [eFrequency, setEFrequency] = useState('weekly');
  const [eStartTime, setEStartTime] = useState('14:00');
  const [eEndTime, setEEndTime] = useState('16:00');
  const [eLocation, setELocation] = useState('本中心');
  const [eBranchId, setEBranchId] = useState('');

  // Special event form
  const [showSpecial,setShowSpecial]=useState(false);
  const [spTitle,setSpTitle]=useState('');
  const [spDate,setSpDate]=useState('');
  const [spLocation,setSpLocation]=useState('');
  const [spBranches,setSpBranches]=useState<string[]>([]);
  const [spStartTime,setSpStartTime]=useState('');
  const [spEndTime,setSpEndTime]=useState('');

  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);

  function toggleBranch(id:string,setFn:(fn:(prev:string[])=>string[])=>void){setFn(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}

  async function toggle(id:string){setErr('');try{const f=await apiToggleRegularMeeting(id);setS(f)}catch(e:any){setErr(e.message)}}
  async function delRegular(id:string){if(!confirm('確定刪除此集會規則？'))return;setErr('');try{const f=await apiDeleteRegularMeeting(id);setS(f)}catch(e:any){setErr(e.message)}}

  function startEdit(r: any) {
    setEditingId(r.id);
    setETitle(r.title);
    setEWeekday(String(r.weekday));
    setEFrequency(r.frequency || 'weekly');
    setEStartTime(r.startTime);
    setEEndTime(r.endTime);
    setELocation(r.location);
    setEBranchId(r.branchId);
  }

  async function saveEdit() {
    if (!editingId) return;
    setErr('');
    try {
      const fresh = await apiUpdateRegularMeeting({
        meetingId: editingId,
        title: eTitle,
        weekday: eWeekday,
        frequency: eFrequency,
        startTime: eStartTime,
        endTime: eEndTime,
        location: eLocation,
        branchId: eBranchId
      });
      setS(fresh);
      setEditingId(null);
    } catch (e: any) { setErr(e.message) }
  }

  async function addRegular(){
    if(!title.trim()){setErr('請填標題');return;}
    if(selBranches.length===0){setErr('請至少選一個支部');return;}
    setErr('');
    try{
      for(const bid of selBranches){
        await apiCreateRegularMeeting({branchId:bid,title,weekday,frequency,startTime,endTime,location});
      }
      const {loadState}=await import('@/lib/store');
      setS(await loadState());
      setTitle('');
    }catch(e:any){setErr(e.message)}
  }

  async function addSpecial(){
    if(!spTitle.trim()){setErr('請填活動標題');return;}
    if(!spDate){setErr('請選日期');return;}
    setErr('');
    try{
      // 0 selected = 全旅; 1 = 支部; 2+ = 跨支部
      let scope = 'troop';
      let branchId = '';
      if(spBranches.length===1){scope='branch';branchId=spBranches[0];}
      else if(spBranches.length>=2){scope='troop';} // 跨支部設為全旅活動
      await apiCreateEvent({
        title:spTitle,
        scope:scope as any,
        branchId,
        date:spDate,
        location:spLocation||'待定',
        kind:'activity',
        status:'published',
        source:'特別集會',
      });
      const {loadState}=await import('@/lib/store');
      setS(await loadState());
      setOkMsg('✅ 特別集會已加入行事曆');
      setSpTitle('');setSpDate('');setSpLocation('');setSpBranches([]);setShowSpecial(false);
    }catch(e:any){setErr(e.message)}
  }

  if(!s)return <div className="card">{err||'載入中...'}</div>;

  return <div className="stack">
    <section className="hero">
      <span className="badge gold">行事曆設定</span>
      <h1>行事曆管理</h1>
      <p>設定恆常集會規則（每週固定）及特別集會（單次活動）。特別集會適合跨支部或深資/樂行的不定期活動。</p>
    </section>
    {err&&<p className="badge red">{err}</p>}
    {okMsg&&<p className="badge green">{okMsg}</p>}

    {/* Regular meetings */}
    <section className="card">
      <h3>恆常集會規則</h3>
      <table className="table">
        <thead><tr><th>支部</th><th>標題</th><th>頻率</th><th>星期</th><th>時間</th><th>地點</th><th>啟用</th><th>操作</th></tr></thead>
        <tbody>{(s.regularMeetings||[]).map(r=>{
          const isEditing = editingId === r.id;
          if (isEditing) return (
            <tr key={r.id}>
              <td><select value={eBranchId} onChange={e=>setEBranchId(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.short}</option>)}</select></td>
              <td><input value={eTitle} onChange={e=>setETitle(e.target.value)} style={{width:120}}/></td>
              <td>
                <select value={eFrequency} onChange={e=>setEFrequency(e.target.value)}>
                  <option value="weekly">每週</option>
                  <option value="biweekly">隔週</option>
                  <option value="monthly_1">月#1</option>
                  <option value="monthly_2">月#2</option>
                  <option value="monthly_3">月#3</option>
                  <option value="monthly_4">月#4</option>
                  <option value="monthly_last">月底</option>
                </select>
              </td>
              <td><select value={eWeekday} onChange={e=>setEWeekday(e.target.value)}>{weekdays.map((w,i)=><option key={i} value={i}>週{w}</option>)}</select></td>
              <td>
                <input value={eStartTime} onChange={e=>setEStartTime(e.target.value)} style={{width:60}}/> - 
                <input value={eEndTime} onChange={e=>setEEndTime(e.target.value)} style={{width:60}}/>
              </td>
              <td><input value={eLocation} onChange={e=>setELocation(e.target.value)} style={{width:100}}/></td>
              <td>—</td>
              <td>
                <button className="btn primary" onClick={saveEdit}>儲存</button>
                <button className="btn" onClick={()=>setEditingId(null)}>取消</button>
              </td>
            </tr>
          );

          return (
            <tr key={r.id}>
              <td>{branches.find(b=>b.id===r.branchId)?.short||r.branchId}</td>
              <td>{r.title}</td>
              <td><span className="badge">{r.frequency==='biweekly'?'隔週':r.frequency==='weekly'?'每週':r.frequency}</span></td>
              <td>星期{weekdays[r.weekday]}</td>
              <td>{r.startTime}-{r.endTime}</td>
              <td>{r.location}</td>
              <td>{r.enabled?<span className="badge green">啟用</span>:<span className="badge red">停用</span>}</td>
              <td>
                <button className="btn" onClick={()=>startEdit(r)}>✏️</button>
                <button className="btn" onClick={()=>toggle(r.id)}>{r.enabled?'停用':'啟用'}</button>
                <button className="btn red" onClick={()=>delRegular(r.id)}>🗑️</button>
              </td>
            </tr>
          );
        })}</tbody>
      </table>
      {(s.regularMeetings||[]).length===0&&<p className="muted">暫無恆常集會規則。</p>}
    </section>

    <section className="card stack">
      <h3>新增恆常集會規則</h3>
      <label>標題<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：童軍恆常集會"/></label>
      <div>
        <strong>適用支部：</strong>
        <div className="row" style={{flexWrap:'wrap',gap:6,marginTop:4}}>
          {branches.map(b=><button key={b.id} type="button" className={`btn ${selBranches.includes(b.id)?'primary':''}`} onClick={()=>toggleBranch(b.id,setSelBranches)} style={{fontSize:'0.85em'}}>{b.short}</button>)}
        </div>
        <p className="muted">可多選（例如同時為童軍+深資設定相同規則）。不選 = 全旅。</p>
      </div>
      <div className="grid">
        <select value={weekday} onChange={e=>setWeekday(e.target.value)}>{weekdays.map((w,i)=><option key={i} value={i}>星期{w}</option>)}</select>
        <select value={frequency} onChange={e=>setFrequency(e.target.value)}>
          <option value="weekly">每週一次</option>
          <option value="biweekly">隔週一次 (雙週)</option>
          <option value="monthly_1">每月第 1 個週</option>
          <option value="monthly_2">每月第 2 個週</option>
          <option value="monthly_3">每月第 3 個週</option>
          <option value="monthly_4">每月第 4 個週</option>
          <option value="monthly_last">每月最後一個週</option>
        </select>
        <input value={startTime} onChange={e=>setStartTime(e.target.value)} placeholder="14:00"/>
        <input value={endTime} onChange={e=>setEndTime(e.target.value)} placeholder="16:00"/>
        <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="本中心"/>
      </div>
      <button className="btn primary" onClick={addRegular}>新增恆常集會</button>
    </section>

    {/* Special events */}
    <section className="card stack">
      <h3>特別集會 / 單次活動</h3>
      <p className="muted">適合不定期活動、跨支部活動、深資/樂行的特別集會。加入後直接出現在行事曆。</p>
      {(s.events||[]).filter(e=>e.source==='特別集會').length>0&&(
        <table className="table">
          <thead><tr><th>標題</th><th>日期</th><th>地點</th><th>支部</th></tr></thead>
          <tbody>{(s.events||[]).filter(e=>e.source==='特別集會').map(e=><tr key={e.id}>
            <td>{e.title}</td><td>{e.date}</td><td>{e.location}</td>
            <td>{e.scope==='troop'?'全旅':branches.find(b=>b.id===e.branchId)?.short||e.branchId}</td>
          </tr>)}</tbody>
        </table>
      )}
      <button className="btn primary" onClick={()=>setShowSpecial(!showSpecial)}>{showSpecial?'取消':'＋ 新增特別集會'}</button>
    </section>

    {showSpecial&&(
      <section className="card stack">
        <label>活動標題<input value={spTitle} onChange={e=>setSpTitle(e.target.value)} placeholder="例如：深資特別集會"/></label>
        <div className="grid">
          <label>日期<input type="date" value={spDate} onChange={e=>setSpDate(e.target.value)}/></label>
          <label>開始時間<input value={spStartTime} onChange={e=>setSpStartTime(e.target.value)} placeholder="14:00"/></label>
          <label>結束時間<input value={spEndTime} onChange={e=>setSpEndTime(e.target.value)} placeholder="16:00"/></label>
          <label>地點<input value={spLocation} onChange={e=>setSpLocation(e.target.value)} placeholder="本中心"/></label>
        </div>
        <div>
          <strong>適用支部：</strong>
          <div className="row" style={{flexWrap:'wrap',gap:6,marginTop:4}}>
            {branches.map(b=><button key={b.id} type="button" className={`btn ${spBranches.includes(b.id)?'primary':''}`} onClick={()=>toggleBranch(b.id,setSpBranches)} style={{fontSize:'0.85em'}}>{b.short}</button>)}
          </div>
          <p className="muted">不選 = 全旅。選一個 = 支部活動。選多個 = 跨支部活動（全旅可見）。</p>
        </div>
        <button className="btn primary" onClick={addSpecial}>加入行事曆</button>
      </section>
    )}
  </div>;
}
