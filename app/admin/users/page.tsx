'use client';
import { useEffect, useState } from 'react';
import { AppState, loadStateSlice } from '@/lib/store';
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
  parentEmail: string;
  children: string[];
  childBranch: string;
  childDob: string;
  note: string;
  _merged?: boolean;
};

const BULK_TEMPLATE = `type,name,email,ymNumber,password,role,branchId,patrolId,patrolRole,specialRole,dateOfBirth,emergencyContactName,emergencyContactPhone,parentUserId,children,note
member,王小明,wong.member@example.org,1234560001,,member,b3,p10,member,,2012-03-15,王太,91234567,,,童軍成員，可用 YMIS 登入
member,李小美,lee.member@example.org,1234560002,,member,b2,p1,member,,2015-07-20,李太,98765432,,,幼童軍成員
user,王家長,wong.parent@example.org,,changeme,parent,,,,,,,,1234560001;李小美,家長帳號(子女填 SCOUT ID 或姓名,分號分隔)
user,陳領袖,leader@example.org,,changeme,branch_leader,b3,,,,,,,,支部領袖帳號`;

/** 簡化範本:對照 YMIS 自訂報表的中文欄位,領袖只需照樣貼上報表內容 */
const BULK_SIMPLE_TEMPLATE = `姓名,成員編號,出生日期,支部,小隊,家長電郵,緊急聯絡人,緊急聯絡電話
示例成員,3000000123,2012-03-15,童軍,WOLF,parent@example.org,王太,91234567
示例成員二,3000000456,2015-07-20,幼童軍,黃,,李太,98765432`;

/** 家長+子女範本:一位家長可佔多行(每位子女一行);小童軍未有 SCOUT ID 就只填姓名 */
const BULK_PARENT_TEMPLATE = `家長姓名,家長Email,子女SCOUT ID/姓名,子女支部,子女出生日期
王秀蘭,parent@example.org,3000000001,童軍,2010-06-12
王秀蘭,parent@example.org,王小明,小童軍,
李爸爸,lee.parent@example.org,3000000456,幼童軍,2015-07-20`;

/** 日期正規化:2012/3/5 → 2012-03-05 */
function normDate(v: string): string {
  const m = String(v || '').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return String(v || '').trim();
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

/** 自動偵測分隔符(逗號 / Tab / 空白),支援直接貼上 YMIS 報表 / PDF 複製的表格文字 */
function parseTable(text: string): string[][] {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trimEnd()).filter(l => l.trim());
  if (!lines.length) return [];
  const hasTab = lines.slice(0, 3).some(l => l.includes('\t'));
  const hasComma = lines.slice(0, 3).some(l => l.includes(','));
  if (hasTab) return lines.map(l => l.split('\t').map(c => c.trim()));
  if (hasComma) return lines.map(l => l.split(',').map(c => c.trim()));
  // 無逗號無 Tab:按空白切(PDF / 試算表複製的常見格式)
  return lines.map(l => l.split(/\s+/).map(c => c.trim()).filter(Boolean));
}

/** 認可的欄位名稱(英文 + 中文,含 YMIS 自訂報表常用欄) */
const HEADER_SET = new Set([
  'type', 'name', 'email', 'ymNumber', 'ymis', 'password', 'role', 'branchId', 'branch',
  'patrolId', 'patrol', 'squad', 'patrolRole', 'specialRole', 'dateOfBirth', 'dob',
  'emergencyContactName', 'emergencyContactPhone', 'parentUserId', 'parentEmail', 'children', 'childBranch', 'childDob', 'note',
  '類型', '姓名', '全名', '電郵', '邮箱', 'Email', '成員編號', '號碼', '成員號碼', 'YMIS', 'YMIS編號',
  '密碼', '角色', '支部', '單位', '小隊', '隊', '隊內身份', '特別身份', '出生日期', '生日',
  '緊急聯絡人', '聯絡人', '緊急聯絡電話', '電話', '家長ID', '家長電郵', '備註',
  '家長姓名', '家長Email', '子女SCOUT ID/姓名', '子女SCOUT ID', '子女編號/姓名', '子女支部', '子女出生日期',
]);

/** 無表頭時:按內容自動識別(10 位數字=YMIS、日期=出生日期、@=Email、支部名稱) */
function autoMapRow(cells: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const rest = [...cells];
  const take = (pred: (v: string) => boolean): string => {
    const i = rest.findIndex(pred);
    if (i >= 0) { const v = rest[i]; rest.splice(i, 1); return v; }
    return '';
  };
  out.ymNumber = take(v => /^\d{7,12}$/.test(v));
  out.dateOfBirth = normDate(take(v => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(v)));
  out.email = take(v => v.includes('@'));
  const branchCell = take(v => branches.some(b => v === b.name || v === b.short || v === b.id));
  if (branchCell) out.branchId = branchCell;
  out.name = take(v => v.length >= 1 && v.length <= 20 && !/^\d+$/.test(v));
  return out;
}

function gridToObjects(grid: string[][]): Record<string, string>[] {
  if (!grid.length) return [];
  const first = grid[0] || [];
  const matched = first.filter(c => HEADER_SET.has(c.trim())).length;
  if (matched >= 2) {
    const headers = first.map(h => h.trim());
    return grid.slice(1).map(cols => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { if (h) obj[h] = (cols[i] || '').trim(); });
      return obj;
    });
  }
  return grid.map(autoMapRow);
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
  const [bulkWarnings,setBulkWarnings]=useState<string[]>([]);
  const [search,setSearch]=useState('');
  const [filterRole,setFilterRole]=useState('all');
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [pw,setPw]=useState('changeme');
  const [role,setRole]=useState<Role>('parent');const [branchId,setBranchId]=useState('');
  const [childrenText,setChildrenText]=useState('');const [newChildBranch,setNewChildBranch]=useState('b1');
  const [loading,setLoading]=useState(false);
  const [ok,setOk]=useState('');
  const [permsUserId,setPermsUserId]=useState<string|null>(null);
  const [perms,setPerms]=useState<any[]>([]);
  const [isMemberPerms, setIsMemberPerms] = useState(false);
  const session=getSession();

  useEffect(()=>{loadStateSlice(['patrols','users','members']).then(setS).catch(e=>setErr(e.message))},[]);
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
    try{
      const children = role === 'parent' && childrenText.trim()
        ? childrenText.split(/[\n;；,，]+/).map(x => x.trim()).filter(Boolean).map(c => /^\d{7,12}$/.test(c) ? { ymNumber: c, branchId: newChildBranch || 'b1' } : { name: c, branchId: newChildBranch || 'b1' })
        : undefined;
      const res = await apiCreateUser({name,email,password:pw,role,branchId:LEADER_ROLES.includes(role)?branchId:'',children});
      setS(res.state);setShowAdd(false);setName('');setEmail('');setChildrenText('');
      setOk(children?.length ? `✅ 已建立 ${name} 的帳號 — 連結已有成員 ${res.linked.length} 名、新建成員紀錄(無登入帳號) ${res.created.length} 名。` : '✅ 帳號已建立。');
    }catch(e:any){setErr(e.message)}finally{setLoading(false)}
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
    const warnings: string[] = [];
    const seenEmails = new Set(s?.users.map(u => (u.email || '').toLowerCase()).filter(Boolean));
    const seenYm = new Set(s?.members.map(m => m.ymNumber).filter(Boolean));
    const findParentByEmail = (em: string) => s?.users.find(u => u.role === 'parent' && (u.email || '').toLowerCase() === (em || '').toLowerCase());

    rawRows.forEach((raw, idx) => {
      const rowNo = idx + 1;
      const name = String(raw.name || raw.姓名 || raw['全名'] || raw['家長姓名'] || '').trim();
      const email = String(raw.email || raw.Email || raw['電郵'] || raw['邮箱'] || raw['家長Email'] || '').trim();
      const ymNumber = String(raw.ymNumber || raw.ymis || raw.YMIS || raw['成員編號'] || raw['號碼'] || raw['成員號碼'] || raw['YMIS編號'] || '').trim();
      const branchId = normaliseBranchId(raw.branchId || raw.branch || raw['支部'] || raw['單位']);
      const type = String(raw.type || raw['類型'] || (ymNumber ? 'member' : 'user')).toLowerCase().includes('member') || String(raw.type || '').includes('成員') ? 'member' : 'user';
      const roleValue = String(raw.role || raw['角色'] || (type === 'member' ? 'member' : 'parent')).trim() as Role;
      const roleSafe = (assignable.includes(roleValue) || ['parent','member','coach','branch_leader','group_leader','admin','troop_super'].includes(roleValue)) ? roleValue : 'parent';
      const patrolId = normalisePatrolId(String(raw.patrolId || raw.patrol || raw.squad || raw['小隊'] || raw['隊'] || ''), branchId);
      const item: BulkRow = {
        type, name, email, ymNumber,
        password: String(raw.password || raw['密碼'] || '').trim(),
        role: roleSafe as Role, branchId, patrolId,
        patrolRole: String(raw.patrolRole || raw.squad_role || raw['隊內身份'] || '').trim(),
        specialRole: String(raw.specialRole || raw['特別身份'] || '').trim(),
        dateOfBirth: normDate(String(raw.dateOfBirth || raw.dob || raw['出生日期'] || raw['生日'] || '')),
        emergencyContactName: String(raw.emergencyContactName || raw['緊急聯絡人'] || raw['聯絡人'] || '').trim(),
        emergencyContactPhone: String(raw.emergencyContactPhone || raw.phone || raw['緊急聯絡電話'] || raw['電話'] || '').trim(),
        parentUserId: String(raw.parentUserId || raw['家長ID'] || '').trim(),
        parentEmail: String(raw.parentEmail || raw['家長電郵'] || '').trim(),
        children: [],
        childBranch: '',
        childDob: '',
        note: String(raw.note || raw['備註'] || '').trim(),
      };

      if (!name) errors.push(`第 ${rowNo} 行：缺少姓名`);
      if (type === 'user') {
        if (!email) errors.push(`第 ${rowNo} 行：帳號缺少 Email`);
        if (email && seenEmails.has(email.toLowerCase())) errors.push(`第 ${rowNo} 行：Email 已存在 (${email})`);
        if (email) seenEmails.add(email.toLowerCase());
        // 家長的子女(SCOUT ID 或中文姓名,; 或 , 分隔;多行重複家長 Email 會自動合併)
        item.children = String(raw.children || raw['子女SCOUT ID/姓名'] || raw['子女SCOUT ID'] || raw['子女編號/姓名'] || raw['子女'] || '').split(/[;；,，\n|]+/).map(x => x.trim()).filter(Boolean);
        item.childBranch = normaliseBranchId(raw.childBranch || raw['子女支部'] || '');
        item.childDob = normDate(String(raw.childDob || raw['子女出生日期'] || ''));
      } else {
        if (!ymNumber) errors.push(`第 ${rowNo} 行：成員缺少 YMIS / 成員編號`);
        if (!branchId) errors.push(`第 ${rowNo} 行：成員缺少支部(可填 童軍/幼童軍/深資/樂行/小童軍 或 b1~b5)`);
        if (!item.dateOfBirth) errors.push(`第 ${rowNo} 行：缺少出生日期(必填 — 無法計算年齡,影響 18 歲以下報名規則)`);
        if (ymNumber && seenYm.has(ymNumber)) errors.push(`第 ${rowNo} 行：YMIS 已存在 (${ymNumber})`);
        if (ymNumber) seenYm.add(ymNumber);

        // 選填個人資料:不擋開戶,只提示會影響什麼功能
        const dob = item.dateOfBirth ? new Date(item.dateOfBirth) : null;
        const age = dob && !isNaN(dob.getTime()) ? (() => {
          const now = new Date();
          let a = now.getFullYear() - dob.getFullYear();
          const m = now.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a--;
          return a;
        })() : null;
        const hasParent = !!(item.parentUserId || (item.parentEmail && findParentByEmail(item.parentEmail)));
        if (!hasParent) {
          if (item.parentEmail) warnings.push(`第 ${rowNo} 行(${name || ymNumber})：填了家長電郵 ${item.parentEmail} 但找不到該家長帳號 — 不會建立連結,請先開家長帳號`);
          else if (age !== null && age < 18) warnings.push(`第 ${rowNo} 行(${name || ymNumber})：未滿 18 歲且未連結家長 — 報名活動需家長操作,之後可於成員管理補建連結`);
        }
        if (!item.email) warnings.push(`第 ${rowNo} 行(${name || ymNumber})：無 Email — 不影響 YMIS 登入,但無法寄出密碼重設信`);
        if (!item.emergencyContactName && !item.emergencyContactPhone) warnings.push(`第 ${rowNo} 行(${name || ymNumber})：無緊急聯絡人 — 只影響成員頁「緊急聯絡資料」顯示`);
      }
      rows.push(item);
    });

    // 同一家長多行(每位子女一行)→ 合併到同一帳號
    const parentSeen: Record<string, number> = {};
    rows.forEach((r, i) => {
      if (r.type !== 'user' || !r.email) return;
      const k = r.email.toLowerCase();
      if (parentSeen[k] === undefined) { parentSeen[k] = i; return; }
      const first = rows[parentSeen[k]];
      r.children.forEach(c => { if (first.children.indexOf(c) < 0) first.children.push(c); });
      if (!first.childBranch && r.childBranch) first.childBranch = r.childBranch;
      if (!first.childDob && r.childDob) first.childDob = r.childDob;
      warnings.push(`第 ${i + 1} 行(${r.name || r.email})：家長 Email 重複 — 子女會合併到第 ${parentSeen[k] + 1} 行的帳號`);
      r._merged = true;
    });

    setBulkRows(rows);
    setBulkErrors(errors);
    setBulkWarnings(warnings);
  }

  function previewBulk(text = bulkText) {
    setErr(''); setOk('');
    try {
      const t = String(text || '').trim();
      const raw = t.startsWith('[') || t.startsWith('{')
        ? (Array.isArray(JSON.parse(t)) ? JSON.parse(t) : [JSON.parse(t)])
        : gridToObjects(parseTable(t));
      normaliseBulkRows(raw);
    } catch (e: any) {
      setBulkRows([]); setBulkErrors(['格式錯誤：' + (e.message || String(e))]); setBulkWarnings([]);
    }
  }

  async function submitBulk() {
    if (!bulkRows.length) { previewBulk(); return; }
    if (bulkErrors.length > 0) { setErr('請先修正批量資料錯誤。'); return; }
    const userRows = bulkRows.filter(r => r.type === 'user' && !r._merged).map(r => ({
      name: r.name, email: r.email, password: r.password || 'changeme', role: r.role,
      branchId: LEADER_ROLES.includes(r.role) ? r.branchId : '', approved: true,
      children: r.role === 'parent' && r.children.length
        ? r.children.map(c => /^\d{7,12}$/.test(c)
          ? { ymNumber: c, branchId: r.childBranch || 'b1', dateOfBirth: r.children.length === 1 ? r.childDob : '' }
          : { name: c, branchId: r.childBranch || 'b1', dateOfBirth: r.children.length === 1 ? r.childDob : '' })
        : undefined,
    }));
    const memberRows = bulkRows.filter(r => r.type === 'member').map(r => {
      // 家長電郵 → 對應家長帳號 ID(若已存在)
      let parentUserId = r.parentUserId;
      if (!parentUserId && r.parentEmail) {
        const pu = s?.users.find(u => u.role === 'parent' && (u.email || '').toLowerCase() === r.parentEmail.toLowerCase());
        if (pu) parentUserId = pu.id;
      }
      return {
        name: r.name, ymNumber: r.ymNumber, email: r.email, password: r.password || r.ymNumber,
        branchId: r.branchId, patrolId: r.patrolId, patrolRole: r.patrolRole,
        specialRole: r.specialRole, dateOfBirth: r.dateOfBirth, parentUserId,
        emergencyContactName: r.emergencyContactName, emergencyContactPhone: r.emergencyContactPhone, note: r.note,
      };
    });
    if (!confirm(`確定批量開戶？\n帳號：${userRows.length} 個\n成員：${memberRows.length} 名${bulkWarnings.length ? `\n(另有 ${bulkWarnings.length} 項選填提示)` : ''}`)) return;
    setLoading(true); setErr(''); setOk('');
    try {
      let fresh: AppState | null = null;
      if (userRows.length) fresh = await apiBatchCreateUsers(userRows as any);
      if (memberRows.length) fresh = await apiBatchCreateMembers(memberRows as any);
      if (fresh) setS(fresh);
      setOk(`✅ 批量開戶已完成：帳號 ${userRows.length} 個、成員 ${memberRows.length} 名。`);
      setShowBulk(false); setBulkRows([]); setBulkWarnings([]);
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
        <div><h3>📥 批量開戶（全前端匯入）</h3><p className="muted">下載範本、貼上 CSV / JSON、或直接複製 YMIS 自訂報表的表格(含出生日期)貼入。前端自動偵測格式、檢查重複 Email / YMIS，再一次寫入後台。<br/><b>必填：姓名、YMIS、支部、出生日期。</b>其餘個人資料(緊急聯絡、家長、Email 等)皆選填 — 不填不影響開戶,預覽會列出哪些功能會受限。</p></div>
        <span className="badge green">手機可用</span>
      </div>
      <div className="row" style={{flexWrap:'wrap'}}>
        <button className="btn" onClick={()=>downloadText('scoutsystem_bulk_parent_children.csv', BULK_PARENT_TEMPLATE)}>⬇️ 下載家長+子女範本</button>
        <button className="btn" onClick={()=>downloadText('scoutsystem_bulk_members_ymis.csv', BULK_SIMPLE_TEMPLATE)}>⬇️ 下載簡化範本(YMIS 報表式)</button>
        <button className="btn" onClick={()=>downloadText('scoutsystem_bulk_accounts.csv', BULK_TEMPLATE)}>⬇️ 下載完整範本(帳號+成員)</button>
        <label className="btn">📤 上傳 CSV / TXT / JSON<input type="file" accept=".csv,.txt,.json,text/csv,text/plain,application/json" onChange={e=>loadBulkFile(e.target.files?.[0])} style={{display:'none'}}/></label>
        <button className="btn gold" onClick={()=>previewBulk()}>🔎 預覽及檢查</button>
      </div>
      <p className="muted" style={{fontSize:12,margin:0}}>👨‍👩‍ 小童軍(未有 SCOUT ID)毋須開成員帳號 — 用「家長+子女」範本,子女只填姓名;家長帳號即可看資訊及代報名。同一家長可佔多行(每位子女一行)。</p>
      <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} rows={8} placeholder={"貼上 CSV / JSON,或直接複製 YMIS 報表內容(欄位含:姓名、成員編號、出生日期、支部…)。\n無表頭也可以 — 系統會自動識別 10 位 YMIS 編號及出生日期。\n必填:姓名、YMIS、支部、出生日期;其餘個人資料選填,缺了會列出受影響的功能。"} style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:12}}/>
      {bulkErrors.length>0&&<div className="card" style={{borderColor:'#fca5a5',background:'#fff5f5'}}>
        <b className="danger">需要修正(修正前無法開戶)：</b>
        <ul>{bulkErrors.slice(0,8).map((e,i)=><li key={i}>{e}</li>)}</ul>
        {bulkErrors.length>8&&<p className="muted">另有 {bulkErrors.length-8} 項錯誤未顯示。</p>}
      </div>}
      {bulkErrors.length===0&&bulkWarnings.length>0&&<div className="card" style={{borderColor:'#fcd34d',background:'#fffbeb'}}>
        <b style={{color:'#92400e'}}>⚠️ 選填項未填(不影響開戶,部分功能會受限)：</b>
        <ul>{bulkWarnings.slice(0,8).map((w,i)=><li key={i}>{w}</li>)}</ul>
        {bulkWarnings.length>8&&<p className="muted">另有 {bulkWarnings.length-8} 項提示未顯示。</p>}
        <p className="muted" style={{fontSize:12}}>可先開戶,之後隨時於「成員管理 / 使用者管理」補填。</p>
      </div>}
      {bulkRows.length>0&&<div className="table-card-list">
        <p className="muted">預覽：帳號 {bulkRows.filter(r=>r.type==='user').length} 個、成員 {bulkRows.filter(r=>r.type==='member').length} 名</p>
        <table className="table responsive"><thead><tr><th>類型</th><th>姓名</th><th>Email</th><th>YMIS</th><th>角色/支部</th><th>密碼</th></tr></thead>
          <tbody>{bulkRows.slice(0,20).map((r,i)=><tr key={i}>
            <td data-label="類型"><span className={`badge ${r.type==='user'?'blue':'green'}`}>{r.type==='user'?'帳號':'成員'}</span></td>
            <td data-label="姓名">{r.name||'—'}</td>
            <td data-label="Email">{r.email||'—'}</td>
            <td data-label="YMIS">{r.ymNumber||'—'}</td>
            <td data-label="角色/支部">{r.type==='user'?<>{ROLE_LABEL[r.role]}{r.children.length>0&&<span className="badge gold" style={{marginLeft:4}}>{r.children.length} 子女</span>}</>:branches.find(b=>b.id===r.branchId)?.short||r.branchId}</td>
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
      {role==='parent'&&<div className="stack" style={{marginTop:'0.5rem'}}>
        <label>連結子女(選填 — 每行一個:SCOUT ID 或中文姓名;小童軍未有 SCOUT ID 就只填姓名)
          <textarea value={childrenText} onChange={e=>setChildrenText(e.target.value)} rows={3} placeholder={'3000000001\n王小名'} style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:12}}/>
        </label>
        <label>新子女支部(只對「成員資料庫找不到」的子女生效)
          <select value={newChildBranch} onChange={e=>setNewChildBranch(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        </label>
        <p className="muted" style={{fontSize:12,margin:0}}>小童軍毋須開自己的登入帳號 — 家長帳號即可看資訊及代報名。找不到的子女會建成員紀錄(無登入)並連結到此帳號。</p>
      </div>}
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
