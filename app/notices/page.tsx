'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppState, loadState, Bookmark } from '@/lib/store';
import { apiSaveConfig, apiUpdateBookmark, apiDeleteBookmark, apiUpdatePdfTags } from '@/lib/api';
import { getSession } from '@/lib/session';
import { branches } from '@/lib/model';

const ACTIVITY_TYPES = ['訓練班', '比賽', '服務', '工作坊', '活動', '其他'];
const AUDIENCE_OPTIONS = ['全旅', '領袖', '成年成員', '小童軍', '幼童軍', '童軍', '深資童軍', '樂行童軍', '家長'];

export default function Notices(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');const [ok,setOk]=useState('');
  const [folderId,setFolderId]=useState('');
  const [editingId,setEditingId]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const session=getSession();
  const isLeader=session&&['super_admin','troop_super','admin','group_leader','branch_leader','coach'].includes(session.role);

  const [eTitle,setETitle]=useState('');const [eActivityType,setEActivityType]=useState('');
  const [eBranches,setEBranches]=useState<string[]>([]);const [eAudience,setEAudience]=useState<string[]>([]);
  const [eMode,setEMode]=useState<'informational'|'troop_participation'>('informational');
  const [eInternalDeadline,setEInternalDeadline]=useState('');
  // PDF tag edit
  const [editingPdfId,setEditingPdfId]=useState<string|null>(null);
  const [pdfBranches,setPdfBranches]=useState<string[]>([]);
  const [pdfAudience,setPdfAudience]=useState<string[]>([]);

  useEffect(()=>{loadState().then(st=>{setS(st);setFolderId(st.config.ANNOUNCEMENT_FOLDER_ID||'')}).catch(e=>setErr(e.message))},[]);

  async function saveFolder(){setErr('');setOk('');try{const f=await apiSaveConfig('ANNOUNCEMENT_FOLDER_ID',folderId);setS(f);setOk('✅ 已儲存')}catch(e:any){setErr(e.message)}}
  async function reload(){setErr('');setOk('');try{const {loadState}=await import('@/lib/store');const f=await loadState();setS(f);setOk('✅ 已重新讀取')}catch(e:any){setErr(e.message)}}

  function startEdit(b:Bookmark){
    setEditingId(b.id);setETitle(b.title||'');setEActivityType(b.activityType||'');
    setEBranches(b.branchTags||[]);setEAudience(b.audienceTags||[]);setEMode(b.mode);setEInternalDeadline(b.internalDeadline||'');
  }

  async function saveEdit(){
    if(!editingId)return;setLoading(true);setErr('');
    try{
      await apiUpdateBookmark({bookmarkId:editingId,title:eTitle,activityType:eActivityType,
        branchTags:eBranches.join(',')||'全旅',audienceTags:eAudience.join(','),
        mode:eMode,internalDeadline:eInternalDeadline});
      const {loadState}=await import('@/lib/store');setS(await loadState());setEditingId(null);setOk('✅ 已更新');
    }catch(e:any){setErr(e.message)}finally{setLoading(false)}
  }

  function startEditPdf(pdf:any){
    setEditingPdfId(pdf.id);
    setPdfBranches(pdf.branchTags||['全旅']);
    setPdfAudience(pdf.audienceTags||[]);
  }

  async function savePdfTags(fileId:string){
    setLoading(true);setErr('');
    try{
      await apiUpdatePdfTags({
        fileId,
        branchTags: pdfBranches.length>0?pdfBranches.join(','):'全旅',
        audienceTags: pdfAudience.join(','),
      });
      const {loadState}=await import('@/lib/store');
      setS(await loadState());setEditingPdfId(null);setOk('✅ PDF 標籤已更新');
    }catch(e:any){setErr(e.message)}finally{setLoading(false)}
  }

  async function hidePdf(fileId:string,name:string){
    if(!confirm(`隱藏「${name}」？`))return;
    setLoading(true);setErr('');
    try{await apiUpdatePdfTags({fileId,status:'hidden'});const {loadState}=await import('@/lib/store');setS(await loadState());setOk('✅ 已隱藏')}catch(e:any){setErr(e.message)}finally{setLoading(false)}
  }

  async function showPdf(fileId:string){
    setLoading(true);setErr('');
    try{await apiUpdatePdfTags({fileId,status:'visible'});const {loadState}=await import('@/lib/store');setS(await loadState());setOk('✅ 已顯示')}catch(e:any){setErr(e.message)}finally{setLoading(false)}
  }

  async function del(id:string,title:string){
    if(!confirm(`確定隱藏「${title}」？可從 Sheet 復原。`))return;
    setLoading(true);setErr('');try{await apiDeleteBookmark(id);const {loadState}=await import('@/lib/store');setS(await loadState());setOk('✅ 已隱藏')}catch(e:any){setErr(e.message)}finally{setLoading(false)}
  }

  if(err&&!s)return <div className="card"><p className="badge red">{err}</p></div>;
  if(!s)return <div className="card">載入中...</div>;

  const pdfs=s.announcementPdfs||[];

  return (
    <div className="stack">
      <section className="hero">
        <span className="badge gold">公告 / 通告</span>
        <h1>公告 / 通告</h1>
        <p>旅團通告、外部引入通告及日常公告 PDF。</p>
        {isLeader&&<div className="row">
          <Link className="btn primary" href="/notices/upload">📄 上傳旅團通告</Link>
          <Link className="btn" href="/library/import">📚 通告圖書館引入</Link>
        </div>}
      </section>
      {ok&&<p className="badge green">{ok}</p>}

      {/* Bookmarks table */}
      <section className="card stack">
        <h2>通告（{s.bookmarks.length}）</h2>
        {s.bookmarks.length===0?
          <p className="muted">暫無通告。</p>
        :
        <table className="table">
          <thead><tr><th>標題</th><th>來源</th><th>類型</th><th>支部</th><th>對象</th><th>截止</th><th>費用</th><th>模式</th>{isLeader&&<th>操作</th>}</tr></thead>
          <tbody>{s.bookmarks.map(b=>
            editingId===b.id?(
              <tr key={b.id}>
                <td><input value={eTitle} onChange={e=>setETitle(e.target.value)} style={{width:150}}/></td>
                <td>{b.source||'—'}</td>
                <td><select value={eActivityType} onChange={e=>setEActivityType(e.target.value)} style={{width:80}}><option value="">—</option>{ACTIVITY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></td>
                <td><div style={{display:'flex',flexWrap:'wrap',gap:2}}>{branches.map(br=><button key={br.id} type="button" style={{fontSize:'0.75em',padding:'2px 6px',border:eBranches.includes(br.short)?'1px solid #2563eb':'1px solid #ccc',background:eBranches.includes(br.short)?'#2563eb':'#fff',color:eBranches.includes(br.short)?'#fff':'#333',borderRadius:4,cursor:'pointer'}} onClick={()=>setEBranches(prev=>prev.includes(br.short)?prev.filter(x=>x!==br.short):[...prev,br.short])}>{br.short}</button>)}</div></td>
                <td><div style={{display:'flex',flexWrap:'wrap',gap:2}}>{AUDIENCE_OPTIONS.map(a=><button key={a} type="button" style={{fontSize:'0.75em',padding:'2px 6px',border:eAudience.includes(a)?'1px solid #2563eb':'1px solid #ccc',background:eAudience.includes(a)?'#2563eb':'#fff',color:eAudience.includes(a)?'#fff':'#333',borderRadius:4,cursor:'pointer'}} onClick={()=>setEAudience(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])}>{a}</button>)}</div></td>
                <td><input type="date" value={eInternalDeadline} onChange={e=>setEInternalDeadline(e.target.value)} style={{width:120}}/></td>
                <td>{b.fee||'—'}</td>
                <td><select value={eMode} onChange={e=>setEMode(e.target.value as any)} style={{width:80}}><option value="informational">資訊性</option><option value="troop_participation">旅團參與</option></select></td>
                <td><button className="btn primary" disabled={loading} onClick={saveEdit}>儲存</button> <button className="btn" onClick={()=>setEditingId(null)}>取消</button></td>
              </tr>
            ):(
              <tr key={b.id}>
                <td>{b.title}</td>
                <td>{b.source||'—'}</td>
                <td>{b.activityType?`🏷️ ${b.activityType}`:'—'}</td>
                <td>{b.branchTags?.map((t,i)=><span key={i} className="badge blue" style={{marginRight:2,fontSize:'0.8em'}}>{t}</span>)||'全旅'}</td>
                <td>{b.audienceTags?.map((t,i)=><span key={i} className="badge gold" style={{marginRight:2,fontSize:'0.8em'}}>{t}</span>)||'—'}</td>
                <td>{b.internalDeadline||b.officialDeadline||'—'}</td>
                <td>{b.fee||'—'}</td>
                <td><span className={`badge ${b.mode==='troop_participation'?'purple':'gold'}`}>{b.mode==='troop_participation'?'旅團參與':'資訊性'}</span></td>
                {isLeader&&<td><button className="btn" style={{fontSize:'0.8em'}} onClick={()=>startEdit(b)}>✏️</button> <button className="btn" style={{fontSize:'0.8em',marginLeft:2,color:'#d93025'}} onClick={()=>del(b.id,b.title)}>🗑️</button></td>}
              </tr>
            )
          )}</tbody>
        </table>}
      </section>

      {/* PDF section — all users can see */}
      <section className="card stack">
        <h2>日常公告 PDF</h2>
        {pdfs.length===0?
          <p className="muted">暫無公告 PDF。</p>
        :
          <div className="grid-wide">{pdfs.map(pdf=>
            <div key={pdf.id} className="card" style={{position:'relative'}}>
              {pdf.visible===false&&<span className="badge red" style={{position:'absolute',top:4,right:4}}>已隱藏</span>}
              <span className="badge blue">PDF</span>
              <h3 style={{fontSize:'0.95em'}}>📄 {pdf.name}</h3>
              <p className="muted" style={{fontSize:'0.8em'}}>更新：{pdf.updatedAt||'—'} · {pdf.size||''}</p>
              {pdf.branchTags&&pdf.branchTags.length>0&&
                <div style={{marginTop:4}}>{pdf.branchTags.map((t:string,i:number)=><span key={i} className="badge blue" style={{marginRight:2,fontSize:'0.75em'}}>{t}</span>)}</div>
              }
              {pdf.audienceTags&&pdf.audienceTags.length>0&&
                <div style={{marginTop:2}}>{pdf.audienceTags.map((t:string,i:number)=><span key={i} className="badge gold" style={{marginRight:2,fontSize:'0.75em'}}>{t}</span>)}</div>
              }
              <a className="btn block" href={pdf.url} target="_blank" style={{marginTop:6}}>查看</a>
              {isLeader&&
                <div style={{marginTop:6,display:'flex',gap:4,flexWrap:'wrap'}}>
                  <button className="btn" style={{fontSize:'0.75em'}} onClick={()=>startEditPdf(pdf)}>🏷️ 標籤</button>
                  {pdf.visible!==false?
                    <button className="btn" style={{fontSize:'0.75em',color:'#d93025'}} onClick={()=>hidePdf(pdf.id,pdf.name)}>隱藏</button>
                  :
                    <button className="btn" style={{fontSize:'0.75em'}} onClick={()=>showPdf(pdf.id)}>顯示</button>
                  }
                </div>
              }
              {editingPdfId===pdf.id&&(
                <div style={{marginTop:8,padding:8,background:'#f8f9fa',borderRadius:6}}>
                  <div style={{marginBottom:6}}>
                    <strong style={{fontSize:'0.85em'}}>支部標籤：</strong>
                    <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:3}}>
                      {branches.map(b=><button key={b.id} type="button" style={{fontSize:'0.75em',padding:'2px 6px',border:pdfBranches.includes(b.short)?'1px solid #2563eb':'1px solid #ccc',background:pdfBranches.includes(b.short)?'#2563eb':'#fff',color:pdfBranches.includes(b.short)?'#fff':'#333',borderRadius:4,cursor:'pointer'}} onClick={()=>setPdfBranches(prev=>prev.includes(b.short)?prev.filter((x:string)=>x!==b.short):[...prev,b.short])}>{b.short}</button>)}
                    </div>
                  </div>
                  <div style={{marginBottom:6}}>
                    <strong style={{fontSize:'0.85em'}}>對象：</strong>
                    <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:3}}>
                      {AUDIENCE_OPTIONS.map(a=><button key={a} type="button" style={{fontSize:'0.75em',padding:'2px 6px',border:pdfAudience.includes(a)?'1px solid #2563eb':'1px solid #ccc',background:pdfAudience.includes(a)?'#2563eb':'#fff',color:pdfAudience.includes(a)?'#fff':'#333',borderRadius:4,cursor:'pointer'}} onClick={()=>setPdfAudience(prev=>prev.includes(a)?prev.filter((x:string)=>x!==a):[...prev,a])}>{a}</button>)}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    <button className="btn primary" style={{fontSize:'0.8em'}} disabled={loading} onClick={()=>savePdfTags(pdf.id)}>儲存</button>
                    <button className="btn" style={{fontSize:'0.8em'}} onClick={()=>setEditingPdfId(null)}>取消</button>
                  </div>
                </div>
              )}
            </div>
          )}</div>
        }
      </section>

      {/* Drive folder setting — leader only */}
      {isLeader&&<section className="card stack">
        <h2>Drive 資料夾設定</h2>
        <p className="muted">把集會安排 PDF 放入指定 Google Drive 資料夾，前端自動列出。資料夾需設為「知道連結的人都可檢視」。</p>
        <label>資料夾 ID 或完整 URL<input value={folderId} onChange={e=>setFolderId(e.target.value)} placeholder="https://drive.google.com/drive/folders/XXXX 或直接填 XXXX"/></label>
        <div className="row"><button className="btn primary" onClick={saveFolder}>儲存</button><button className="btn" onClick={reload}>重新讀取</button></div>
      </section>}
    </div>
  );
}
