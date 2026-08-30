'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
import { apiCreateMember, apiLinkParent, apiUpdateMember, apiDeleteMember } from '@/lib/api';
import { branches } from '@/lib/model';

function roleLabel(r?:string){return r==='leader'?'隊長':r==='deputy'?'副隊長':r==='member'?'隊員':'—'}
function branchName(id?:string){return branches.find(b=>b.id===id)?.short||id||'—'}

export default function Page(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const [adding,setAdding]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  // add form
  const [name,setName]=useState('');const [ym,setYm]=useState('');const [branch,setBranch]=useState('b3');
  const [patrol,setPatrol]=useState('');const [parent,setParent]=useState('');const [dob,setDob]=useState('');
  const [phone,setPhone]=useState('');const [emergencyName,setEmergencyName]=useState('');const [memberPw,setMemberPw]=useState('');
  const [specialRole,setSpecialRole]=useState('');
  // edit form
  const [eName,setEName]=useState('');const [eYm,setEYm]=useState('');const [eBranch,setEBranch]=useState('b3');
  const [ePatrol,setEPatrol]=useState('');const [eDob,setEDob]=useState('');const [ePhone,setEPhone]=useState('');
  const [eEmergencyName,setEEmergencyName]=useState('');const [eParent,setEParent]=useState('');const [ePw,setEPw]=useState('');
  const [eEmail,setEEmail]=useState('');const [eSpecialRole,setESpecialRole]=useState('');

  useEffect(()=>{loadState().then(setS).catch(e=>setErr(e.message))},[]);

  function patrolName(id?:string){return s?.patrols.find(p=>p.id===id)?.name||'不適用 / 未分隊'}

  async function add(){
    if(!name||!ym){setErr('請填姓名及 YMIS');return;}
    setErr('');setAdding(true);
    try{
      const fresh=await apiCreateMember({name,ymNumber:ym,branchId:branch,patrolId:patrol,specialRole:specialRole||undefined,dateOfBirth:dob,parentUserId:parent||undefined,emergencyContactPhone:phone,emergencyContactName:emergencyName,password:memberPw||ym});
      setS(fresh);setName('');setYm('');setPatrol('');setParent('');setDob('');setPhone('');setEmergencyName('');setMemberPw('');setSpecialRole('');setShowAdd(false);
    }catch(e:any){setErr(e.message)}finally{setAdding(false)}
  }

  function startEdit(id:string){
    const c=s?.members.find(x=>x.id===id);
    if(!c)return;
    setEditing(id);setEName(c.name);setEYm(c.ymNumber);setEBranch(c.branchId);
    setEPatrol(c.patrolId||'');setEDob(c.dateOfBirth||'');setEPhone(c.emergencyContactPhone||'');
    setEEmergencyName(c.emergencyContactName||'');setEParent(c.parentUserId||'');setEPw('');
    setEEmail(c.email||'');setESpecialRole(c.specialRole||'');
  }

  async function saveEdit(){
    if(!editing)return;
    setErr('');
    try{
      const fresh=await apiUpdateMember({
        memberId:editing,name:eName,ymNumber:eYm,branchId:eBranch,patrolId:ePatrol,
        dateOfBirth:eDob,emergencyContactPhone:ePhone,emergencyContactName:eEmergencyName,
        email:eEmail, specialRole:eSpecialRole,
        ...(ePw?{password:ePw}:{})
      });
      // parent link separately
      if(eParent!==undefined){
        await apiLinkParent(editing,eParent);
      }
      const final=await loadState();
      setS(final);setEditing(null);
    }catch(e:any){setErr(e.message)}
  }

  async function linkParent(mid:string,pid:string){
    setErr('');
    try{const fresh=await apiLinkParent(mid,pid);setS(fresh)}catch(e:any){setErr(e.message)}
  }

  async function del(id:string){
    if(!confirm('確定刪除此成員？'))return;
    setErr('');
    try{const f=await apiDeleteMember(id);setS(f);if(editing===id)setEditing(null)}catch(e:any){setErr(e.message)}
  }

  if(!s)return <div className="card">{err||'載入中...'}</div>;
  const parents=s.users.filter(u=>u.role==='parent');

  return <div className="stack">
    <section className="hero"><span className="badge gold">成員資料庫</span><h1>成員資料庫</h1><p>新增、編輯、刪除成員，指派支部 / 小隊，並連結家長。</p></section>
    {err&&<p className="badge red">{err}</p>}

    <div className="row"><button className="btn primary" onClick={()=>setShowAdd(!showAdd)}>{showAdd?'取消':'＋ 新增成員'}</button><a className="btn gold" href="/admin/users#bulk-onboard">📥 批量開戶 / 匯入成員</a></div>

    {showAdd&&<section className="card stack"><h3>新增成員</h3>
      <div className="grid">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="姓名 *"/>
        <input value={ym} onChange={e=>setYm(e.target.value)} placeholder="YMIS / 成員編號 *"/>
        <input value={memberPw} onChange={e=>setMemberPw(e.target.value)} placeholder="登入密碼（預設=編號）"/>
        <select value={branch} onChange={e=>{setBranch(e.target.value);setPatrol('')}}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select value={patrol} onChange={e=>setPatrol(e.target.value)}><option value="">不適用 / 未分隊</option>{s.patrols.filter(p=>p.branchId===branch&&p.enabled).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select value={specialRole} onChange={e=>setSpecialRole(e.target.value)}>
          <option value="">特別身份(無)</option>
          {branch === 'b4' && (
            <>
              <option value="執行委員會主席">執行委員會主席</option>
              <option value="執行委員會委員">執行委員會委員</option>
            </>
          )}
          {branch === 'b5' && (
            <>
              <option value="管理委員會主席">管理委員會主席</option>
              <option value="管理委員會委員">管理委員會委員</option>
            </>
          )}
        </select>
        <input type="date" value={dob} onChange={e=>setDob(e.target.value)} placeholder="出生日期"/>
        <input value={emergencyName} onChange={e=>setEmergencyName(e.target.value)} placeholder="緊急聯絡人姓名"/>
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="緊急聯絡電話"/>
        <select value={parent} onChange={e=>setParent(e.target.value)}><option value="">未連結家長</option>{parents.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      <button className="btn primary" disabled={adding} onClick={add}>{adding?'新增中...':'新增成員'}</button>
    </section>}

    <section className="card">
      <table className="table responsive">
        <thead><tr><th>姓名</th><th>YMIS</th><th>支部</th><th>小隊</th><th>特別身份</th><th>年齡</th><th>Email / 改密碼</th><th>家長連結</th><th>操作</th></tr></thead>
        <tbody>{s.members.map(c=>{
          const isEdit=editing===c.id;
          if(isEdit)return (
            <tr key={c.id}>
              <td><input value={eName} onChange={e=>setEName(e.target.value)} style={{width:80}}/></td>
              <td><input value={eYm} onChange={e=>setEYm(e.target.value)} style={{width:100}}/></td>
              <td><select value={eBranch} onChange={e=>{setEBranch(e.target.value);setEPatrol('')}} style={{width:80}}>{branches.map(b=><option key={b.id} value={b.id}>{b.short}</option>)}</select></td>
              <td><select value={ePatrol} onChange={e=>setEPatrol(e.target.value)} style={{width:80}}><option value="">不適用</option>{s.patrols.filter(p=>p.branchId===eBranch&&p.enabled).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
              <td>
                <select value={eSpecialRole} onChange={e=>setESpecialRole(e.target.value)} style={{width:100}}>
                  <option value="">(無)</option>
                  {eBranch === 'b4' && (
                    <>
                      <option value="執行委員會主席">主席</option>
                      <option value="執行委員會委員">委員</option>
                    </>
                  )}
                  {eBranch === 'b5' && (
                    <>
                      <option value="管理委員會主席">主席</option>
                      <option value="管理委員會委員">委員</option>
                    </>
                  )}
                  {!['b4', 'b5'].includes(eBranch) && <option value={eSpecialRole}>{eSpecialRole}</option>}
                  <option value="custom">自定義...</option>
                </select>
                {eSpecialRole === 'custom' && <input value={eSpecialRole} onChange={e=>setESpecialRole(e.target.value)} placeholder="輸入身份"/>}
              </td>
              <td>—</td>
              <td>
                <input value={eEmail} onChange={e=>setEEmail(e.target.value)} placeholder="Email" style={{width:100,display:'block',marginBottom:4}}/>
                <input value={ePw} onChange={e=>setEPw(e.target.value)} placeholder="改密碼" style={{width:100}}/>
              </td>
              <td><select value={eParent} onChange={e=>setEParent(e.target.value)} style={{width:80}}><option value="">未連結</option>{parents.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
              <td><button className="btn primary" onClick={saveEdit}>儲存</button> <button className="btn" onClick={()=>setEditing(null)}>取消</button></td>
            </tr>
          );
          return (
            <tr key={c.id}>
              <td data-label="姓名">{c.name}</td>
              <td data-label="YMIS">{c.ymNumber}</td>
              <td data-label="支部">{branchName(c.branchId)}</td>
              <td data-label="小隊">{patrolName(c.patrolId)}</td>
              <td data-label="身份">{c.specialRole || roleLabel(c.patrolRole)}</td>
              <td data-label="年齡">{c.age>0?c.age:'—'}</td>
              <td data-label="Email">{c.email || '—'}</td>
              <td data-label="家長連結"><select value={c.parentUserId||''} onChange={e=>linkParent(c.id,e.target.value)}><option value="">未連結</option>{parents.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
              <td data-label="操作"><button className="btn" onClick={()=>startEdit(c.id)}>✏️</button> <button className="btn" onClick={()=>del(c.id)}>🗑️</button></td>
            </tr>
          );
        })}</tbody>
      </table>
      {s.members.length===0&&<p className="muted">尚無成員。</p>}
    </section>
  </div>;
}
