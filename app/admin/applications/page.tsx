'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
import { apiDecideApplication } from '@/lib/api';
import { ROLE_LABEL, branches } from '@/lib/model';

export default function Page(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');
  const [popup,setPopup]=useState<{name:string;status:string}|null>(null);
  const [processingId,setProcessingId]=useState('');

  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);

  async function decide(id:string,name:string,status:'approved'|'rejected'){
    setErr('');setProcessingId(id);
    try{
      const fresh=await apiDecideApplication(id,status);
      setS(fresh);
      setPopup({name,status});
      setTimeout(()=>setPopup(null),4000);
    }catch(e:any){
      setErr(e.message);
    }finally{
      setProcessingId('');
    }
  }

  if(!s)return <div className="card">{err||'載入中...'}</div>;
  const pending=s.applications.filter(a=>a.status==='pending');
  const decided=s.applications.filter(a=>a.status!=='pending');

  return <div className="stack">
    <section className="hero">
      <span className="badge gold">申請管理</span>
      <h1>審核 / 申請管理</h1>
      <p>批核 / 拒絕申請。按批核後系統需要幾秒建立帳號，請稍候不要關閉頁面。</p>
    </section>

    {err&&<p className="badge red">{err}</p>}

    {popup&&(
      <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:popup.status==='approved'?'#34a853':'#d93025',color:'white',padding:'12px 24px',borderRadius:8,zIndex:9999,boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
        {popup.status==='approved'?`✅ 已批核 ${popup.name} 的申請，帳號已建立（預設密碼 changeme）`:`❌ 已拒絕 ${popup.name} 的申請`}
      </div>
    )}

    <section className="card">
      <table className="table">
        <thead><tr><th>姓名</th><th>類型</th><th>身份</th><th>支部</th><th>YMIS</th><th>Email</th><th>操作</th></tr></thead>
        <tbody>
          {pending.map(a=><tr key={a.id}>
            <td>{a.name}</td>
            <td>{a.type}</td>
            <td>{ROLE_LABEL[a.role]||a.role}</td>
            <td>{branches.find(b=>b.id===a.branchId)?.short||'-'}</td>
            <td>{a.ymNumbers||'-'}</td>
            <td>{a.email||'-'}</td>
            <td>
              {processingId===a.id?
                <span className="badge gold">處理中...</span>
              :
                <>
                  <button className="btn primary" onClick={()=>decide(a.id,a.name,'approved')}>批核</button>
                  <button className="btn" onClick={()=>decide(a.id,a.name,'rejected')}>拒絕</button>
                </>
              }
            </td>
          </tr>)}
        </tbody>
      </table>
      {pending.length===0&&<p className="muted">沒有待審批申請。</p>}
    </section>

    {decided.length>0&&(
      <section className="card">
        <h3>已處理</h3>
        <table className="table">
          <thead><tr><th>姓名</th><th>身份</th><th>結果</th><th>處理時間</th></tr></thead>
          <tbody>{decided.map(a=><tr key={a.id}>
            <td>{a.name}</td>
            <td>{ROLE_LABEL[a.role]||a.role}</td>
            <td><span className={`badge ${a.status==='approved'?'green':'red'}`}>{a.status==='approved'?'已批核':'已拒絕'}</span></td>
            <td>{a.decidedAt||'—'}</td>
          </tr>)}</tbody>
        </table>
      </section>
    )}
  </div>;
}
