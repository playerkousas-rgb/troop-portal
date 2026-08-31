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
  const [sending,setSending]=useState(false)
  const [sent,setSent]=useState<''|'ok'>('')
  const [resultMsg,setResultMsg]=useState('')

  const canSubmit = name && id && webAppUrl && apiKey

  // 平台管理員的申請接收端（管理員名下的 Apps Script Web App，與舊版 Scout Admin APP 同一個）。
  // 收到 POST 後寫入管理員的 Sheet「申請記錄」並 Email 通知管理員。
  // 這裡只有網址、沒有任何 email —— 旅團端界面上看不到管理員郵箱，
  // 且不會從旅團的 Google 帳號寄出任何信件。
  const ADMIN_RECEIVER_URL = 'https://script.google.com/macros/s/AKfycbxj5BDDGgjs559smkK4Z5aYImWYeXbN5af8U1ObON0z9WnsN6QJW4I1XWolhs5kQ_H-UQ/exec'

  async function submitOnboard(){
    if(!canSubmit || sending) return
    setSending(true); setSent(''); setResultMsg('')
    const noteFull = [note.trim(), email.trim() ? '聯絡人:' + email.trim() : ''].filter(Boolean).join('\n')
    try {
      // no-cors：瀏覽器讀不到回應（Apps Script 跨域限制），沒有拋錯即代表已送出
      await fetch(ADMIN_RECEIVER_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          troopId: id.trim(),
          troopName: name.trim(),
          backendUrl: webAppUrl.trim(),
          apiKey: apiKey.trim(),
          apps: ['scoutsystem'],
          note: noteFull
        })
      })
      setSent('ok')
      setResultMsg('接入資料已提交！管理員會盡快處理，開通後會通知你。')
    } catch (err: any) {
      setResultMsg('提交失敗：' + (err?.message || err) + '，請稍後再試一次。')
    } finally {
      setSending(false)
    }
  }

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
          <li>撳下面按鈕下載 GS 模組（全選複製，貼到 Apps Script）</li>
          <li>貼好後按儲存（💾 圖示）</li>
        </ol>
        <a className="btn primary" href="/downloads/SCOUTSYSTEM_2_SETUP.gs.txt" download>⬇️ 下載 GS 模組（必要）</a>
        <div className="row" style={{marginTop:10}}>
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
          <li>⚠️ <strong>彈窗會顯示 API Key — 只顯示一次！雙擊 key 複製，不要多帶任何字元！</strong></li>
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
          <button className="btn primary" onClick={()=>setStep(5)}>下一步：傳送接入資料 →</button>
        </div>
      </>
    },
    {
      title: '第 6 步：傳送接入資料',
      content: <>
        <p className="muted">填入以下資料後按「📧 傳送接入資料」，資料會直接提交到平台管理員的審核系統（由管理員後台記錄並通知管理員）。<strong>不會從你的 Google 帳號寄出任何信件</strong>，管理員開通後你就可以在首頁選擇旅團登入。</p>
        <label>旅團名稱<input placeholder="第82旅" value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>旅團號<input placeholder="0082" value={id} onChange={e=>setId(e.target.value)}/></label>
        <label>聯絡人 Email（選填，預設用你的 Google 帳號寄出）<input placeholder="admin@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Apps Script /exec 網址<input placeholder="https://script.google.com/macros/s/.../exec" value={webAppUrl} onChange={e=>setWebAppUrl(e.target.value)}/></label>
        <label>API Key<input placeholder="ak_xxxxxxxx（setup 彈窗顯示的 Key）" value={apiKey} onChange={e=>setApiKey(e.target.value)}/></label>
        <p className="muted" style={{fontSize:13}}>
          💡 API Key 在 setup 彈窗只顯示一次，雙擊 key 複製最保險。忘記了？到 Sheet 選單 → 2026 Scout System → 重新生成 API Key。
        </p>
        <label>備註<textarea rows={2} placeholder="（選填）" value={note} onChange={e=>setNote(e.target.value)}/></label>
        <button className={`btn primary${canSubmit?'':' disabled'}`}
          style={{opacity:canSubmit?1:0.5,pointerEvents:canSubmit?'auto':'none'}}
          onClick={submitOnboard} disabled={sending}>
          {sending ? '⏳ 正在傳送…' : '📧 傳送接入資料'}
        </button>
        {!canSubmit && <p className="muted" style={{fontSize:12,color:'#d93025'}}>請填寫所有必填欄位（旅團名稱、旅團號、/exec 網址、API Key）</p>}
        {sent==='ok' && <p className="muted" style={{fontSize:13,color:'#137333',fontWeight:600}}>✅ {resultMsg}</p>}
        {(sent==='' && resultMsg) && <p className="muted" style={{fontSize:13,color:'#d93025',fontWeight:600}}>⚠️ {resultMsg}</p>}
        <button className="btn" onClick={()=>setStep(4)}>← 上一步</button>
      </>
    }
  ]

  const current = steps[step]

  return <div className="stack">
    {/* 返回：唔使人估「撳右上 LOGO 先返到出去」 */}
    <Link href="/" style={{fontSize:12,fontWeight:700,textDecoration:'none',color:'#45556c'}}>← 返回首頁</Link>
    <section className="hero">
      <span className="badge gold">🧩 旅團接入</span>
      <h1>接入 2026 Scout System</h1>
      <p>照步驟完成，傳送接入資料後等平台管理員開通，即可使用。</p>
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
