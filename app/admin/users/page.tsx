'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
import { apiToggleUser, apiCreateUser, apiUpdateUserRole, apiDeleteUser, apiGrantFeature, apiRevokeFeature, apiGetUserFeatures, apiUpdateUserPermissions, apiBatchCreateUsers, apiBatchCreateMembers } from '@/lib/api';
import { ROLE_LABEL, branches, LEADER_ROLES } from '@/lib/model';
import { checkEditPermission, assignableRoles } from '@/lib/permissions';
import { getSession } from '@/lib/session';
import type { Role } from '@/lib/model';

const FEATURE_LABELS: Record<string,string> = {
  branches: '支部管理', members: '成員資料庫', applications: '審核 / 申請管理',
  events: '活動管理', registrations: '報名管理', attendance: '簽到／點名', library_import: '圖書館引入',
  notices: '通告管理', users: '使用者管理', settings: '系統設定',
  audit: '審核紀錄', calendar: '行事曆管理',
};

type BulkRow = {
  type: 'user' | 'member';
  name: string;
  email: string;
  ymNumber: string;
  password: string;
  role: Role;
  branchId: string;
  patrolId: string;
  patrolRole: string;
  specialRole: string;
  dateOfBirth: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  parentUserId: string;
  note: string;
};

const BULK_TEMPLATE = `type,name,email,ymNumber,password,role,branchId,patrolId,patrolRole,specialRole,dateOfBirth,emergencyContactName,emergencyContactPhone,parentUserId,note
member,王小明,wong.member@example.org,1234560001,,member,b3,p10,member,,2012-03-15,王太,91234567,,童軍成員，可用 YMIS 登入
member,李小美,lee.member@example.org,1234560002,,member,b2,p1,member,,2015-07-20,李太,98765432,,幼童軍成員
user,王家長,wong.parent@example.org,,changeme,parent,,,,,,,,,家長帳號
user,陳領袖,leader@example.org,,changeme,branch_leader,b3,,,,,,,,支部領袖帳號`;

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (quoted && next === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some(v => v.trim())) rows.push(row);
      row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cols => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => obj[h] = (cols[i] || '').trim());
    return obj;
  });
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

export default function Page(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const [showBulk,setShowBulk]=useState(false);
  const [bulkText,setBulkText]=useState(BULK_TEMPLATE);
  const [bulkRows,setBulkRows]=useState<BulkRow[]>([]);
  const [bulkErrors,setBulkErrors]=useState<string[]>([]);
  const [search,setSearch]=useState('');
  const [filterRole,setFilterRole]=useState('all');
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [pw,setPw]=useState('changeme');
  const [role,setRole]=useState<Role>('parent');const [branchId,setBranchId]=useState('');
  const [loading,setLoading]=useState(false);
  const [ok,setOk]=useState('');
  const [permsUserId,setPermsUserId]=useState<string|null>(null);
  const [perms,setPerms]=useState<any[]>([]);
  const [isMemberPerms, setIsMemberPerms] = useState(false);
  const session=getSession();

  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);
  useEffect(()=>{
    if (s && typeof window !== 'undefined' && window.location.hash === '#bulk-onboard') {
      setShowBulk(true);
      window.history.replaceState(null, '', window.location.pathname);
      setTimeout(()=>previewBulk(),0);
    }
  },[s]);

  async function toggle(id:string){setErr('');try{const f=await apiToggleUser(id);setS(f)}catch(e:any){setErr(e.message)}}
  async function changeRole(userId:string,newRole:Role){setErr('');try{const f=await apiUpdateUserRole(userId,newRole);setS(f)}catch(e:any){setErr(e.message)}}
  async function del(id:string,userName:string){if(!confirm(`確定刪除 ${userName}？`))return;setErr('');try{const f=await apiDeleteUser(id);setS(f)}catch(e:any){setErr(e.message)}}
  async function add(){
    if(!name||!email){setErr('請填姓名及 Email');return;}
    setErr('');setLoading(true);
    try{const f=await apiCreateUser({name,email,password:pw,role,branchId:LEADER_ROLES.includes(role)?branchId:''});setS(f);setShowAdd(false);setName('');setEmail('')}catch(e:any){setErr(e.message)}finally{setLoading(false)}
  }

  function normaliseBranchId(input?: string) {
    const v = (input || '').trim();
    if (!v) return '';
    return branches.find(b => b.id === v || b.short === v || b.name === v)?.id || v;
  }

  function normalisePatrolId(input: string, branchId: string) {
    const v = (input || '').trim();
    if (!v || !s) return '';
    return s.patrols.find(p => p.id === v || (p.branchId === branchId && (p.name === v || p.short === v)))?.id || v;
  }

  function normaliseBulkRows(rawRows: Record<string, any>[]) {
    const rows: BulkRow[] = [];
    const errors: string[] = [];
    const seenEmails = new Set(s?.users.map(u => (u.email || '').toLowerCase()).filter(Boolean));
    const seenYm = new Set(s?.members.map(m => m.ymNumber).filter(Boolean));

    rawRows.forEach((raw, idx) => {
      const rowNo = idx + 1;
      const name = String(raw.name || raw.姓名 || '').trim();
      const email = String(raw.email || raw.Email || raw['電郵'] || '').trim();
      const ymNumber = String(raw.ymNumber || raw.ymis || raw.YMIS || raw['成員編號'] || '').trim();
      const branchId = normaliseBranchId(raw.branchId || raw.branch || raw['支部']);
      const type = String(raw.type || raw['類型'] || (ymNumber ? 'member' : 'user')).toLowerCase().includes('member') || String(raw.type || '').includes('成員') ? 'member' : 'user';
      const roleValue = String(raw.role || raw['角色'] || (type === 'member' ? 'member' : 'parent')).trim() as Role;
      const roleSafe = (assignable.includes(roleValue) || ['parent','member','coach','branch_leader','group_leader','admin','troop_super'].includes(roleValue)) ? roleValue : 'parent';
      const patrolId = normalisePatrolId(String(raw.patrolId || raw.patrol || raw.squad || raw['小隊'] || ''), branchId);
      const item: BulkRow = {
        type, name, email, ymNumber,
        password: String(raw.password || raw['密碼'] || '').trim(),
        role: roleSafe as Role, branchId, patrolId,
        patrolRole: String(raw.patrolRole || raw.squad_role || raw['隊內身份'] || '').trim(),
        specialRole: String(raw.specialRole || raw['特別身份'] || '').trim(),
        dateOfBirth: String(raw.dateOfBirth || raw.dob || raw['出生日期'] || '').trim(),
        emergencyContactName: String(raw.emergencyContactName || raw['緊急聯絡人'] || '').trim(),
        emergencyContactPhone: String(raw.emergencyContactPhone || raw.phone || raw['緊急聯絡電話'] || '').trim(),
        parentUserId: String(raw.parentUserId || raw['家長ID'] || '').trim(),
        note: String(raw.note || raw['備註'] || '').trim(),
      };

      if (!name) errors.push(`第 ${rowNo} 行：缺少姓名`);
      if (type === 'user') {
        if (!email) errors.push(`第 ${rowNo} 行：帳號缺少 Email`);
        if (email && seenEmails.has(email.toLowerCase())) errors.push(`第 ${rowNo} 行：Email 已存在 (${email})`);
        if (email) seenEmails.add(email.toLowerCase());
      } else {
        if (!ymNumber) errors.push(`第 ${rowNo} 行：成員缺少 YMIS / 成員編號`);
        if (!branchId) errors.push(`第 ${rowNo} 行：成員缺少支部 branchId`);
        if (ymNumber && seenYm.has(ymNumber)) errors.push(`第 ${rowNo} 行：YMIS 已存在 (${ymNumber})`);
        if (ymNumber) seenYm.add(ymNumber);
      }
      rows.push(item);
    });
    setBulkRows(rows);
    setBulkErrors(errors);
  }

  function previewBulk(text = bulkText) {
    setErr(''); setOk('');
    try {
      const raw = text.trim().startsWith('[') || text.trim().startsWith('{')
        ? (Array.isArray(JSON.parse(text)) ? JSON.parse(text) : [JSON.parse(text)])
        : parseCsv(text);
      normaliseBulkRows(raw);
    } catch (e: any) {
      setBulkRows([]); setBulkErrors(['格式錯誤：' + (e.message || String(e))]);
    }
  }

  async function submitBulk() {
    if (!bulkRows.length) { previewBulk(); return; }
    if (bulkErrors.length > 0) { setErr('請先修正批量資料錯誤。'); return; }
    const userRows = bulkRows.filter(r => r.type === 'user').map(r => ({
      name: r.name, email: r.email, password: r.password || 'changeme', role: r.role,
      branchId: LEADER_ROLES.includes(r.role) ? r.branchId : '', approved: true,
    }));
    const memberRows = bulkRows.filter(r => r.type === 'member').map(r => ({
      name: r.name, ymNumber: r.ymNumber, email: r.email, password: r.password || r.ymNumber,
      branchId: r.branchId, patrolId: r.patrolId, patrolRole: r.patrolRole,
      specialRole: r.specialRole, dateOfBirth: r.dateOfBirth, parentUserId: r.parentUserId,
      emergencyContactName: r.emergencyContactName, emergencyContactPhone: r.emergencyContactPhone, note: r.note,
    }));
    if (!confirm(`確定批量開戶？\n帳號：${userRows.length} 個\n成員：${memberRows.length} 名`)) return;
    setLoading(true); setErr(''); setOk('');
    try {
      let fresh: AppState | null = null;
      if (userRows.length) fresh = await apiBatchCreateUsers(userRows as any);
      if (memberRows.length) fresh = await apiBatchCreateMembers(memberRows as any);
      if (fresh) setS(fresh);
      setOk(`✅ 批量開戶已完成：帳號 ${userRows.length} 個、成員 ${memberRows.length} 名。`);
      setShowBulk(false); setBulkRows([]);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function loadBulkFile(file?: File) {
    if (!file) return;
    const text = await file.text();
    setBulkText(text);
    previewBulk(text);
  }

  async function openPerms(userId:string, isMember = false){
    setPermsUserId(userId);
    setIsMemberPerms(isMember);
    setLoading(true);
    try{
      const result=await apiGetUserFeatures(userId);
      if(result.success) setPerms(result.features||[]);
    }catch(e:any){setErr(e.message)}finally{setLoading(false)}
  }

  function toggleFeatureLocal(feature: string, enabled: boolean) {
    setPerms(prev => prev.map(p => p.feature === feature ? { ...p, enabled, overridden: true } : p));
  }

  async function savePermsBatch() {
    if (!permsUserId) return;
    setLoading(true); setErr(''); setOk('');
    try {
      const enabledFeatures = perms.filter(p => p.enabled).map(p => p.feature);
      const freshState = await apiUpdateUserPermissions(permsUserId, enabledFeatures);
      setOk('✅ 授權設定已完整批次寫入！');
      setS(freshState);
      setPermsUserId(null);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function toggleFeature(userId:string,feature:string,enabled:boolean){
    setLoading(true);setErr('');
    try{
      if(enabled){
        await apiGrantFeature(userId,feature,true);
      }else{
        await apiRevokeFeature(userId,feature);
      }
      // Reload perms
      const result=await apiGetUserFeatures(userId);
      if(result.success) setPerms(result.features||[]);
      setOk('✅ 已更新權限');
    }catch(e:any){setErr(e.message)}finally{setLoading(false)}
  }

  if(!s)return <div className="card">{err||'載入中...'}</div>;
  const myRole=session?.role||'guest';
  const myBranchId=session?.branchId||'';
  const myUserId=session?.userId||'';
  const assignable=assignableRoles(myRole);

  const filtered=s.users.filter(u=>{
    if(filterRole!=='all'&&u.role!==filterRole)return false;
    if(search&&!u.name.toLowerCase().includes(search.toLowerCase())&&!u.email.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  return <div className="stack">
    <section className="hero"><span className="badge gold">使用者管理</span><h1>使用者管理</h1><p>管理帳號、角色、功能權限。上級可授權下級額外功能。</p></section>
    {err&&<p className="badge red">{err}</p>}
    {ok&&<p className="badge green">{ok}</p>}

    <section className="card row">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜尋姓名或 Email" style={{flex:1}}/>
      <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
        <option value="all">全部角色</option>
        <option value="troop_super">超管</option><option value="admin">管理員</option>
        <option value="group_leader">團長</option><option value="branch_leader">支部領袖</option>
        <option value="coach">教練員</option><option value="parent">家長</option><option value="member">成員</option>
      </select>
      <button className="btn gold" onClick={()=>{setShowBulk(!showBulk); if(!showBulk) setTimeout(()=>previewBulk(),0)}}>{showBulk?'關閉批量':'📥 批量開戶'}</button>
      <button className="btn primary" onClick={()=>setShowAdd(!showAdd)}>{showAdd?'取消':'＋ 新增'}</button>
    </section>

    {showBulk&&<section className="card stack" id="bulk-onboard">
      <div className="row" style={{justifyContent:'space-between'}}>
        <div><h3>📥 批量開戶（全前端匯入）</h3><p className="muted">下載範本、貼上 CSV / JSON 或直接上傳檔案。前端會先檢查重複 Email / YMIS，再一次寫入後台。</p></div>
        <span className="badge green">手機可用</span>
      </div>
      <div className="row">
        <button className="btn" onClick={()=>downloadText('scoutsystem_bulk_accounts.csv', BULK_TEMPLATE)}>⬇️ 下載 CSV 範本</button>
        <label className="btn">📤 上傳 CSV / JSON<input type="file" accept=".csv,.json,text/csv,application/json" onChange={e=>loadBulkFile(e.target.files?.[0])} style={{display:'none'}}/></label>
        <button className="btn gold" onClick={()=>previewBulk()}>🔎 預覽及檢查</button>
      </div>
      <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} rows={8} placeholder="貼上 CSV 或 JSON 陣列" style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:12}}/>
      {bulkErrors.length>0&&<div className="card" style={{borderColor:'#fca5a5',background:'#fff5f5'}}>
        <b className="danger">需要修正：</b>
        <ul>{bulkErrors.slice(0,8).map((e,i)=><li key={i}>{e}</li>)}</ul>
        {bulkErrors.length>8&&<p className="muted">另有 {bulkErrors.length-8} 項錯誤未顯示。</p>}
      </div>}
      {bulkRows.length>0&&<div className="table-card-list">
        <p className="muted">預覽：帳號 {bulkRows.filter(r=>r.type==='user').length} 個、成員 {bulkRows.filter(r=>r.type==='member').length} 名</p>
        <table className="table responsive"><thead><tr><th>類型</th><th>姓名</th><th>Email</th><th>YMIS</th><th>角色/支部</th><th>密碼</th></tr></thead>
          <tbody>{bulkRows.slice(0,20).map((r,i)=><tr key={i}>
            <td data-label="類型"><span className={`badge ${r.type==='user'?'blue':'green'}`}>{r.type==='user'?'帳號':'成員'}</span></td>
            <td data-label="姓名">{r.name||'—'}</td>
            <td data-label="Email">{r.email||'—'}</td>
            <td data-label="YMIS">{r.ymNumber||'—'}</td>
            <td data-label="角色/支部">{r.type==='user'?ROLE_LABEL[r.role]:branches.find(b=>b.id===r.branchId)?.short||r.branchId}</td>
            <td data-label="密碼">{r.password|| (r.type==='member'?'預設=YMIS':'changeme')}</td>
          </tr>)}</tbody></table>
        {bulkRows.length>20&&<p className="muted">只顯示前 20 行，其餘會一併匯入。</p>}
      </div>}
      <button className="btn primary" disabled={loading||bulkRows.length===0||bulkErrors.length>0} onClick={submitBulk}>{loading?'寫入中...':'🚀 確認批量開戶'}</button>
    </section>}

    {showAdd&&<section className="card stack"><h3>新增使用者</h3>
      <div className="grid">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="姓名 *"/>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email *"/>
        <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="密碼"/>
        <select value={role} onChange={e=>setRole(e.target.value as Role)}>
          {assignable.map(r=><option key={r} value={r}>{ROLE_LABEL[r as Role]}</option>)}
          {assignable.length===0&&<option value="member">成員</option>}
        </select>
        {LEADER_ROLES.includes(role)&&<select value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">選擇支部</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>}
      </div>
      <button className="btn primary" disabled={loading} onClick={add}>{loading?'建立中...':'建立'}</button>
    </section>}

    {/* Permission panel */}
    {permsUserId&&(
      <section className="card stack" style={{ border: '2px solid #f9ab00', background: '#fffde7' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>🔑 功能權限 — {isMemberPerms ? s.members.find(m=>m.id===permsUserId)?.name : s.users.find(u=>u.id===permsUserId)?.name}</h3>
          <span className="badge gold">暫存編輯模式</span>
        </div>
        <p className="muted">請在下方勾選或取消所需功能，調整完畢後請務必點選底部的「💾 一鍵儲存並寫入授權」。</p>
        <div className="grid">
          {perms.map(f=>(
            <label key={f.feature} style={{display:'flex',alignItems:'center',gap:6, padding: '4px 8px', background: '#fff', borderRadius: '4px', border: '1px solid #ddd'}}>
              <input type="checkbox" checked={f.enabled} onChange={e=>toggleFeatureLocal(f.feature, e.target.checked)} disabled={loading}/>
              <span style={{ fontWeight: f.enabled ? 'bold' : 'normal' }}>{FEATURE_LABELS[f.feature]||f.feature}</span>
              {f.isDefault&&!f.overridden&&<span className="badge blue" style={{fontSize:'0.7em'}}>預設</span>}
              {f.overridden&&<span className="badge gold" style={{fontSize:'0.7em'}}>自訂</span>}
            </label>
          ))}
        </div>
        <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn" disabled={loading} onClick={()=>setPermsUserId(null)}>取消關閉</button>
          <button className="btn primary" disabled={loading} style={{ background: '#2e7d32', borderColor: '#1b5e20', fontSize: '1rem', padding: '8px 16px' }} onClick={savePermsBatch}>
            {loading ? '⏳ 寫入試算表中...' : '💾 一鍵儲存並批次寫入'}
          </button>
        </div>
      </section>
    )}

    <section className="card">
      <div className="row" style={{marginBottom:'1rem'}}><h3>領袖與管理員</h3></div>
      <table className="table responsive">
        <thead><tr><th>姓名</th><th>Email</th><th>角色</th><th>支部</th><th>狀態</th><th>操作</th></tr></thead>
        <tbody>{filtered.filter(u => u.role !== 'member' && u.role !== 'parent').map(u=>{
          const perm=checkEditPermission(myRole,myBranchId,myUserId,u.role,u.branchId||'',u.id);
          const canChangeRole=perm.canChangeRole&&assignable.includes(u.role);
          const locked=u.techTest||u.role==='troop_super';
          return <tr key={u.id}>
            <td data-label="姓名">{u.name}{u.techTest&&<span className="badge blue" style={{marginLeft:4}}>技術</span>}{u.role==='troop_super'&&<span className="badge gold" style={{marginLeft:4}}>超管</span>}</td>
            <td data-label="Email">{u.email||'—'}</td>
            <td data-label="角色">
              {locked && <span className="badge blue">{ROLE_LABEL[u.role as Role]||u.role}</span>}
              {!locked && canChangeRole && <select value={u.role} onChange={e=>changeRole(u.id,e.target.value as Role)} style={{fontSize:"0.9em"}}><option value={u.role}>{ROLE_LABEL[u.role as Role]}</option>{assignable.filter(r=>r!==u.role).map(r=><option key={r} value={r}>{ROLE_LABEL[r as Role]}</option>)}</select>}
              {!locked && !canChangeRole && <span className="badge blue">{ROLE_LABEL[u.role as Role]||u.role}</span>}
            </td>
            <td data-label="支部">{branches.find(b=>b.id===u.branchId)?.short||'-'}</td>
            <td data-label="狀態">{u.approved?<span className="badge green">啟用</span>:<span className="badge red">停用</span>}</td>
            <td data-label="操作">
              {perm.canEdit?<>
                {!locked&&<button className="btn" style={{fontSize:'0.8em',marginRight:4}} onClick={()=>openPerms(u.id)}>🔑 權限</button>}
                <button className="btn" style={{fontSize:'0.8em'}} onClick={()=>toggle(u.id)}>{u.approved?'停用':'啟用'}</button>
                <button className="btn" style={{fontSize:'0.8em',marginLeft:4,color:'#d93025'}} onClick={()=>del(u.id,u.name)}>刪除</button>
              </>:<span className="muted" style={{fontSize:'0.8em'}}>無權</span>}
            </td>
          </tr>;
        })}</tbody>
      </table>
    </section>

    {/* Semi-Leaders (Members with specialRole) */}
    {['super_admin','admin','troop_super','group_leader','branch_leader'].includes(myRole) && (
      <section className="card stack">
        <div className="row" style={{marginBottom:'1rem'}}><h3>特別身份成員 (執委/管委)</h3></div>
        <p className="muted">深資、樂行童軍具備特別身份者，可由支部領袖授予特定的管理權限。</p>
        <table className="table responsive">
          <thead><tr><th>姓名</th><th>YMIS</th><th>支部</th><th>特別身份</th><th>操作</th></tr></thead>
          <tbody>{s.members.filter(m => (m.branchId === 'b4' || m.branchId === 'b5') && m.specialRole).map(m => (
            <tr key={m.id}>
              <td data-label="姓名">{m.name}</td>
              <td data-label="YMIS">{m.ymNumber}</td>
              <td data-label="支部">{branches.find(b=>b.id===m.branchId)?.short}</td>
              <td data-label="特別身份"><span className="badge gold">{m.specialRole}</span></td>
              <td data-label="操作">
                <button className="btn" style={{fontSize:'0.8em'}} onClick={() => openPerms(m.id, true)}>🔑 授權</button>
              </td>
            </tr>
          ))}
          {s.members.filter(m => (m.branchId === 'b4' || m.branchId === 'b5') && m.specialRole).length === 0 && <tr><td colSpan={5} className="muted" style={{textAlign:'center'}}>暫無具備特別身份的成員。</td></tr>}
          </tbody>
        </table>
      </section>
    )}

    <section className="card">
      <div className="row" style={{marginBottom:'1rem'}}><h3>家長及一般成員</h3></div>
      <table className="table responsive">
        <thead><tr><th>姓名</th><th>角色</th><th>狀態</th><th>操作</th></tr></thead>
        <tbody>{filtered.filter(u => u.role === 'member' || u.role === 'parent').map(u => (
          <tr key={u.id}>
            <td data-label="姓名">{u.name}</td>
            <td data-label="角色">{ROLE_LABEL[u.role]||u.role}</td>
            <td data-label="狀態">{u.approved?<span className="badge green">啟用</span>:<span className="badge red">停用</span>}</td>
            <td data-label="操作">
              <button className="btn" style={{fontSize:'0.8em'}} onClick={()=>toggle(u.id)}>{u.approved?'停用':'啟用'}</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  </div>;
}
