'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
import { apiSaveConfig } from '@/lib/api';
import Link from 'next/link';

const QUICK_CONTROLS = [
  { href: '/admin/users#bulk-onboard', icon: '📥', title: '批量開戶', text: '前端上傳 CSV / JSON，一次建立帳號及成員。' },
  { href: '/admin/branches', icon: '🏢', title: '支部 / 小隊', text: '設定支部、小隊、啟用狀態。' },
  { href: '/admin/members', icon: '👥', title: '成員資料', text: '新增、編輯、連結家長及更改密碼。' },
  { href: '/admin/events', icon: '🗓️', title: '活動', text: '建立、發布、更新活動及收款連結。' },
  { href: '/admin/calendar', icon: '📅', title: '行事曆', text: '管理恆常集會及取消集會。' },
  { href: '/admin/plugins', icon: '🧩', title: '元件', text: '前端設定 Tier 2 / Tier 3 元件 URL。' },
];

const FRIENDLY_LABELS: Record<string, string> = {
  TROOP_CODE: '旅團號碼',
  TROOP_NAME: '旅團名稱',
  ADMIN_EMAIL: '主要管理員 Email',
  ADMIN_DEFAULT_PASSWORD: '預設管理員密碼',
  ANNOUNCEMENT_FOLDER_ID: '公告 PDF Drive 資料夾 ID',
  REGISTRY_URL: '元件市場 Registry URL',
  STAFF_TOKEN: '首次登入 STAFF_TOKEN',
  system_locked: '系統鎖定（true / false）',
};

export default function Page(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');
  const [ok,setOk]=useState('');
  const [saving,setSaving]=useState('');
  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);

  async function save(k:string,v:string){
    setErr('');setOk('');setSaving(k);
    try{const f=await apiSaveConfig(k,v);setS(f);setOk('✅ 已由前端儲存 '+(FRIENDLY_LABELS[k]||k));}
    catch(e:any){setErr(e.message)}finally{setSaving('')}
  }

  async function toggleLock(){
    if(!s) return;
    const next = String(s.config.system_locked || '').toLowerCase()==='true' ? 'false' : 'true';
    await save('system_locked', next);
  }

  if(!s)return <div className="card">{err||'載入中...'}</div>;
  const locked = String(s.config.system_locked || '').toLowerCase()==='true';

  return <div className="stack"><section className="hero"><span className="badge gold">全前端控制</span><h1>系統設定 / 控制中心</h1><p>日常操作不需要打開 Google Sheet：開戶、成員、活動、行事曆、元件及 SystemConfig 都可在前端完成。</p></section>
    {err&&<p className="badge red">{err}</p>}{ok&&<p className="badge green">{ok}</p>}

    <section className="grid">
      <div className="card stack">
        <span className={`badge ${locked?'red':'green'}`}>{locked?'系統已鎖定':'系統開放中'}</span>
        <h3>服務開關</h3>
        <p className="muted">鎖定後一般用戶暫停登入；技術測試帳號仍可進入排查。</p>
        <button className={`btn ${locked?'primary':'gold'}`} disabled={!!saving} onClick={toggleLock}>{locked?'解除鎖定':'暫停服務 / 鎖定系統'}</button>
      </div>
      <div className="card stack">
        <span className="badge blue">小白友善</span>
        <h3>不用改 Sheet</h3>
        <p className="muted">如果要改資料，請優先使用下方前端入口；Sheet 保留作備份及進階修復。</p>
        <Link href="/admin/audit" className="btn">查看操作紀錄</Link>
      </div>
    </section>

    <section className="grid">
      {QUICK_CONTROLS.map(c=><Link key={c.href} href={c.href} className="card feature-card"><div style={{fontSize:28}}>{c.icon}</div><h3>{c.title}</h3><p className="muted">{c.text}</p></Link>)}
    </section>

    <section className="card stack">
      <div className="row" style={{justifyContent:'space-between'}}><h3>SystemConfig 前端編輯</h3><Link href="/admin/plugins" className="btn gold">⚙️ 單位元件設定</Link></div>
      <p className="muted">修改欄位後離開輸入框會自動儲存。API Key Hash 等敏感欄位如非必要請勿更改。</p>
      <div className="grid">
        {Object.entries(s.config).map(([k,v])=>(
          <label key={k} className="stack" style={{gap:6}}><span><b>{FRIENDLY_LABELS[k]||k}</b> <span className="muted">{k}</span></span><input key={k+v} defaultValue={v} disabled={saving===k} onBlur={e=>{if(e.target.value!==v)save(k,e.target.value)}}/></label>
        ))}
      </div>
    </section>
  </div>;
}
