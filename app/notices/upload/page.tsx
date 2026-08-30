'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { AppState, loadState } from '@/lib/store';
import { apiImportBookmark } from '@/lib/api';
import { parseNoticeText, ParsedNotice } from '@/lib/noticeParser';
import { branches } from '@/lib/model';
import { getSession } from '@/lib/session';

const NOTICE_TYPES = ['訓練班', '比賽', '服務', '工作坊', '活動', '其他'];

export default function NoticeUpload(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');
  const [msg,setMsg]=useState('');
  const [rawText,setRawText]=useState('');
  const [parsed,setParsed]=useState<ParsedNotice|null>(null);
  const [mode,setMode]=useState<'informational'|'troop_participation'>('troop_participation');
  const [noticeType,setNoticeType]=useState('');
  const [customType,setCustomType]=useState('');
  const [notes,setNotes]=useState('');
  const [selectedBranches,setSelectedBranches]=useState<string[]>([]);
  const [selectedAudience,setSelectedAudience]=useState<string[]>([]);
  const [internalDeadline,setInternalDeadline]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);

  const AUDIENCE_OPTIONS = ['全旅', '領袖', '成年成員', '小童軍', '幼童軍', '童軍', '深資童軍', '樂行童軍', '家長'];

  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);

  async function handleFile(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    setErr('');setMsg('');
    try{
      if(file.name.endsWith('.txt')||file.type==='text/plain'){
        const text=await file.text();
        setRawText(text);
        setParsed(parseNoticeText(text));
      }else if(file.name.endsWith('.docx')){
        const mammoth=await import('mammoth/mammoth.browser');
        const arrayBuffer=await file.arrayBuffer();
        const result=await mammoth.extractRawText({arrayBuffer});
        setRawText(result.value);
        setParsed(parseNoticeText(result.value));
      }else{
        setErr('請上傳 .docx 或 .txt 檔案。');
      }
    }catch(e:any){setErr('讀取檔案失敗：'+(e?.message||String(e)))}
  }

  function parseManual(){
    if(!rawText.trim()){setErr('請先貼上通告文字或上傳檔案。');return;}
    setParsed(parseNoticeText(rawText));
    setErr('');
  }

  async function save(){
    if(!parsed){setErr('請先抽取通告內容。');return;}
    setErr('');setMsg('');
    const session=getSession();
    try{
      const finalType = noticeType==='其他' ? customType : noticeType;
      const branchTags=selectedBranches.length>0?selectedBranches.map(id=>branches.find(b=>b.id===id)?.short||id).join(','):'全旅';
      const audienceTags=selectedAudience.join(',');
      if(mode==='troop_participation'){
        const { apiCreateEvent } = await import('@/lib/api');
        await apiCreateEvent({
          title:parsed.title||'未命名活動',
          scope:'troop',
          date:parsed.eventDate||internalDeadline||'',
          location:parsed.location||'待定',
          kind:'notice_troop_participation',
          status:'published',
          fee:parsed.fee||'',
          source:'旅團通告',
        });
      }
      await apiImportBookmark({
        title:parsed.title||'未命名通告',
        mode,
        source:'旅團通告',
        officialDeadline:parsed.officialDeadline||'',
        internalDeadline,
        fee:parsed.fee||'',
        eligibility:parsed.eligibility||'',
        activityType:finalType,
        branchTags,
        audienceTags,
        note:notes||'',
      });
      const updated=await loadState();
      setS(updated);
      setMsg(mode==='troop_participation'?'✅ 通告已轉成活動並加入行事曆！':'✅ 已加入資訊性通告。');
      setParsed(null);setRawText('');setNoticeType('');setCustomType('');setNotes('');
      setSelectedBranches([]);setSelectedAudience([]);setInternalDeadline('');
    }catch(e:any){setErr(e.message)}
  }

  if(err&&!s)return <div className="card"><p className="badge red">{err}</p></div>;
  if(!s)return <div className="card">載入中...</div>;

  return (
    <div className="stack">
      <section className="hero">
        <span className="badge gold">旅團通告上傳</span>
        <h1>上傳 Word 通告</h1>
        <p>上傳旅團自己出的通告。系統會自動抽取重點，領袖確認後加上分類標籤。</p>
      </section>
      {err&&<p className="badge red">{err}</p>}
      {msg&&<p className="badge green">{msg}</p>}

      <section className="card stack">
        <h2>① 上傳檔案或貼上文字</h2>
        <input type="file" ref={fileRef} accept=".docx,.txt" onChange={handleFile} />
        <details style={{marginTop:8}}>
          <summary className="muted" style={{cursor:'pointer'}}>或直接貼上通告文字</summary>
          <textarea rows={10} value={rawText} onChange={e=>setRawText(e.target.value)} placeholder="貼上通告文字..." style={{width:'100%',marginTop:8}} />
          <button className="btn" onClick={parseManual} style={{marginTop:8}}>抽取重點</button>
        </details>
        {rawText&&!parsed&&<button className="btn primary" onClick={parseManual} style={{marginTop:8}}>抽取重點</button>}
      </section>

      {parsed&&(
        <section className="card stack">
          <h2>② 抽取結果（請確認或修正）</h2>
          {parsed.warnings.length>0&&(
            <div style={{background:'#fff3cd',padding:8,borderRadius:8,marginBottom:8}}>
              <strong>⚠️ 提示：</strong>
              <ul>{parsed.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>
            </div>
          )}
          <div className="grid">
            <label>通告標題<input defaultValue={parsed.title||''} onChange={e=>{parsed.title=e.target.value}} /></label>
            <label>截止日期（已抽取，可修改）<input type="date" defaultValue={parsed.officialDeadline||parsed.internalDeadline||''} onChange={e=>{parsed.officialDeadline=e.target.value;setInternalDeadline(e.target.value)}} /></label>
            <label>活動日期<input defaultValue={parsed.eventDate||''} onChange={e=>{parsed.eventDate=e.target.value}} /></label>
            <label>集合時間<input defaultValue={parsed.gatherTime||''} /></label>
            <label>集合地點<input defaultValue={parsed.gatherLocation||''} /></label>
            <label>解散時間<input defaultValue={parsed.dismissTime||''} /></label>
            <label>解散地點<input defaultValue={parsed.dismissLocation||''} /></label>
            <label>活動地點<input defaultValue={parsed.location||''} /></label>
            <label>收費<input defaultValue={parsed.fee||''} /></label>
            <label>參加資格<input defaultValue={parsed.eligibility||''} /></label>
          </div>
        </section>
      )}

      {parsed&&(
        <section className="card stack">
          <h2>③ 分類與標籤</h2>
          <label>通告類型
            <select value={noticeType} onChange={e=>setNoticeType(e.target.value)}>
              <option value="">— 選擇 —</option>
              {NOTICE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {noticeType==='其他'&&<label>自訂類型<input value={customType} onChange={e=>setCustomType(e.target.value)} placeholder="輸入自訂類型" /></label>}
          
          <label>本旅截止日期<input type="date" value={internalDeadline} onChange={e=>setInternalDeadline(e.target.value)} /></label>

          <div>
            <strong>適用支部：</strong>
            <div className="row" style={{flexWrap:'wrap',gap:6,marginTop:4}}>
              {branches.map(b=><button key={b.id} type="button" className={`btn ${selectedBranches.includes(b.id)?'primary':''}`} onClick={()=>setSelectedBranches(prev=>prev.includes(b.id)?prev.filter(x=>x!==b.id):[...prev,b.id])} style={{fontSize:'0.85em'}}>{b.short}</button>)}
            </div>
            <p className="muted">不選 = 全旅。</p>
          </div>
          <div>
            <strong>對象標籤：</strong>
            <div className="row" style={{flexWrap:'wrap',gap:6,marginTop:4}}>
              {AUDIENCE_OPTIONS.map(v=><button key={v} type="button" className={`btn ${selectedAudience.includes(v)?'primary':''}`} onClick={()=>setSelectedAudience(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v])} style={{fontSize:'0.85em'}}>{v}</button>)}
            </div>
          </div>

          <label>接入模式
            <select value={mode} onChange={e=>setMode(e.target.value as any)}>
              <option value="informational">📢 資訊性（不加入行事曆）</option>
              <option value="troop_participation">🏕️ 旅團參與（加入行事曆 + 家長回覆）</option>
            </select>
          </label>

          <label>備註<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="額外資訊" /></label>

          <button className="btn primary" onClick={save}>確認儲存</button>
        </section>
      )}
    </div>
  );
}
