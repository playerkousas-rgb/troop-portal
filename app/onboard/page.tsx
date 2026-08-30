'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function Onboard(){
  const [step,setStep]=useState(0)
  const [name,setName]=useState('')
  const [id,setId]=useState('')
  const [email,setEmail]=useState('')
  const [webAppUrl,setWebAppUrl]=useState('')
  const [apiKey,setApiKey]=useState('')
  const [note,setNote]=useState('')

  const canSubmit = name && id && email && webAppUrl && apiKey

  const mailSubject = encodeURIComponent('[ScoutSystem 旅團接入申請]')
  const mailBody = encodeURIComponent(
`旅團名稱：${name}
旅團號：${id}
聯絡人 Email：${email}
Apps Script URL：${webAppUrl}
API Key：${apiKey}
備註：${note}`)

  const steps = [
    {
      title: '第 1 步：建立 Google Sheet',
      content: <>
        <ol className="muted">
          <li>開 <a href="https://sheets.new" target="_blank">sheets.new</a>（空白 Google Sheet）</li>
          <li>改名為「ScoutSystem - 你的旅團名」</li>
        </ol>
        <button className="btn primary" onClick={()=>setStep(1)}>下一步 →</button>
      </>
    },
    {
      title: '第 2 步：貼上 Apps Script',
      content: <>
        <ol className="muted">
          <li>在 Google Sheet → 擴充功能 → Apps Script</li>
          <li>把預設代碼全部刪掉</li>
          <li>到 <Link href="/downloads">模板下載</Link> 下載 GS 模板</li>
          <li>打開它，全選複製，貼到 Apps Script</li>
          <li>按儲存（💾 圖示）</li>
        </ol>
        <div className="row">
          <button className="btn" onClick={()=>setStep(0)}>← 上一步</button>
          <button className="btn primary" onClick={()=>setStep(2)}>下一步 →</button>
        </div>
      </>
    },
    {
      title: '第 3 步：執行 Setup',
      content: <>
        <ol className="muted">
          <li>在 Apps Script 上方下拉選 <code>setupScoutSystem</code></li>
          <li>按「執行」</li>
          <li>第一次會問你授權 → 按允許</li>
          <li>⚠️ <strong>彈窗會顯示 API Key — 只顯示一次！立即複製！</strong></li>
        </ol>
        <div className="row">
          <button className="btn" onClick={()=>setStep(1)}>← 上一步</button>
          <button className="btn primary" onClick={()=>setStep(3)}>下一步 →</button>
        </div>
      </>
    },
    {
      title: '第 4 步：填寫旅團資料',
      content: <>
        <ul className="muted">
          <li>到黃色 <strong>SystemConfig</strong> 填 TROOP_CODE、TROOP_NAME、ADMIN_EMAIL</li>
          <li>到藍色 <strong>Members</strong> 輸入成員（ymNumber 必須 10 位數字）</li>
          <li>上方選單 → 2026 Scout System → 重新建立管理員帳號</li>
        </ul>
        <div className="row">
          <button className="btn" onClick={()=>setStep(2)}>← 上一步</button>
          <button className="btn primary" onClick={()=>setStep(4)}>下一步 →</button>
        </div>
      </>
    },
    {
      title: '第 5 步：部署 Web App',
      content: <>
        <ol className="muted">
          <li>在 Apps Script 右上方 → 部署 → 新增部署作業</li>
          <li>選「網頁應用程式」</li>
          <li>執行身分：<strong>我</strong></li>
          <li>誰可以存取：<strong>任何人</strong></li>
          <li>按「部署」→ 複製 <strong>/exec 網址</strong></li>
        </ol>
        <div className="row">
          <button className="btn" onClick={()=>setStep(3)}>← 上一步</button>
          <button className="btn primary" onClick={()=>setStep(5)}>下一步：提交申請 →</button>
        </div>
      </>
    },
    {
      title: '第 6 步：提交接入申請',
      content: <>
        <p className="muted">填入以下資料，提交後等平台管理員開通。開通後你就可以在首頁選擇旅團登入。</p>
        <label>旅團名稱<input placeholder="第82旅" value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>旅團號<input placeholder="0082" value={id} onChange={e=>setId(e.target.value)}/></label>
        <label>聯絡人 Email<input placeholder="admin@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Apps Script /exec 網址<input placeholder="https://script.google.com/macros/s/.../exec" value={webAppUrl} onChange={e=>setWebAppUrl(e.target.value)}/></label>
        <label>API Key<input placeholder="ak_xxxxxxxx（setup 彈窗顯示的 Key）" value={apiKey} onChange={e=>setApiKey(e.target.value)}/></label>
        <p className="muted" style={{fontSize:13}}>
          💡 API Key 在 setup 彈窗只顯示一次。忘記了？到 Sheet 選單 → 2026 Scout System → 重新生成 API Key。
        </p>
        <label>備註<textarea rows={2} value={note} onChange={e=>setNote(e.target.value)}/></label>
        <a className={`btn primary${canSubmit?'':' disabled'}`}
           style={{opacity:canSubmit?1:0.5,pointerEvents:canSubmit?'auto':'none'}}
           href={`mailto:ai@skwscout.org.hk?subject=${mailSubject}&body=${mailBody}`}>
          📧 提交申請
        </a>
        {!canSubmit && <p className="muted" style={{fontSize:12,color:'#d93025'}}>請填寫所有必填欄位</p>}
        <button className="btn" onClick={()=>setStep(4)}>← 上一步</button>
      </>
    }
  ]

  const current = steps[step]

  return <div className="stack">
    <section className="hero">
      <span className="badge gold">🧩 旅團接入</span>
      <h1>接入 2026 Scout System</h1>
      <p>照步驟完成，提交後等平台管理員開通，即可使用。</p>
    </section>

    <section className="card stack">
      <div className="row" style={{gap:4,flexWrap:'wrap',marginBottom:12}}>
        {[0,1,2,3,4,5].map(i=>
          <span key={i} className="badge" style={{
            background:i===step?'#1a73e8':i<step?'#34a853':'#e8eaed',
            color:i<=step?'#fff':'#666',fontSize:12,padding:'4px 10px',borderRadius:12
          }}>{i<step?'✓':i+1}</span>
        )}
      </div>
      <h2>{current.title}</h2>
      {current.content}
    </section>

    {step===5 && <section className="card">
      <h3>🛡️ 你的資料有多安全？</h3>
      <ul className="muted" style={{fontSize:13}}>
        <li>你的資料存在 <strong>Google 伺服器</strong>（Google Sheet），不是某台不知名的電腦</li>
        <li>API Key 只存在 <strong>Vercel 伺服器環境變數</strong>，不會出現在任何前端代碼</li>
        <li>Google Sheet 只存 API Key 的雜湊值，連管理員也無法從 Sheet 還原明文</li>
        <li>要取得你的資料，攻擊者要麼攻破 Google 伺服器，要麼攻破 Vercel 伺服器</li>
        <li>這比把資料存在自己家裡的電腦更安全</li>
      </ul>
    </section>}
  </div>
}
