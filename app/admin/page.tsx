'use client';
import { useEffect, useState } from 'react';
import Auth from '@/components/Auth';
import { FeatureCard, SummaryCard } from '@/components/Cards';
import { AppState, loadStateSlice, computeStats } from '@/lib/store';
import { isAdmin, ROLE_LABEL } from '@/lib/model';
import { getSession } from '@/lib/session';
import Link from 'next/link';
import AttendanceCard from '@/components/AttendanceCard';

// 功能定義：未來插件也會動態加入
const FEATURE_DEFS: Record<string,{title:string;icon:string;text:string;href:string}> = {
  branches:       { title:'支部管理', icon:'🏢', text:'管理支部及小隊。', href:'/admin/branches' },
  members:        { title:'成員資料庫', icon:'👥', text:'新增、編輯、連結家長。', href:'/admin/members' },
  applications:   { title:'審核 / 申請管理', icon:'✅', text:'審核申請，批核後自動建帳號。', href:'/admin/applications' },
  events:         { title:'活動管理', icon:'🗓️', text:'新增、編輯、發布活動。', href:'/admin/events' },
  registrations:  { title:'報名管理', icon:'📋', text:'旅團及外間活動的報名狀態、付款與匯出。', href:'/admin/registrations' },
  attendance:     { title:'簽到／點名', icon:'📝', text:'日常集會及旅團自辦活動的實際出席（P／A／L／E／S）。', href:'/attendance' },
  meetings:       { title:'會議管理', icon:'🤝', text:'會議議程及紀錄。', href:'/admin/meetings' },
  library_import: { title:'圖書館引入', icon:'📚', text:'由通告圖書館引入。', href:'/library/import' },
  notices:        { title:'通告管理', icon:'📄', text:'上傳通告、Drive PDF。', href:'/notices' },
  users:          { title:'使用者管理', icon:'👤', text:'帳號、角色、功能權限分配。', href:'/admin/users' },
  settings:       { title:'系統設定', icon:'⚙️', text:'SystemConfig。', href:'/admin/settings' },
  plugins:        { title:'元件管理', icon:'🧩', text:'設定 2/3 級元件網址與金鑰。', href:'/admin/plugins' },
  audit:          { title:'審核紀錄', icon:'📜', text:'所有操作紀錄。', href:'/admin/audit' },
  calendar:       { title:'行事曆管理', icon:'📅', text:'恆常集會、特別集會。', href:'/admin/calendar' },
};

export default function Admin(){
  const [s,setS]=useState<AppState|null>(null);
  const [err,setErr]=useState('');
  // 按需載入：管理摘要（computeStats 用到 users/applications/events/bookmarks）
  useEffect(()=>{loadStateSlice(['users','applications','events','bookmarks']).then(setS).catch(e=>setErr(e.message))},[]);
  const stats=s?computeStats(s):{users:0,pending:0,activities:0,notices:0};
  
  let features = s?.userFeatures || [];

  if (features.length === 0 && (s?.users[0]?.role === 'admin' || s?.users[0]?.role === 'super_admin' || s?.users[0]?.role === 'troop_super')) {
    features = Object.keys(FEATURE_DEFS);
  }

  function renderFeatureCards(){
    return features.map(f=>{
      const def=FEATURE_DEFS[f];
      if(!def) return null;
      // 點名有專用卡片，避免與內建 AttendanceCard 重複。
      if(f === 'attendance') return null;
      return <FeatureCard key={f} title={def.title} icon={def.icon} text={def.text} href={def.href}/>;
    }).filter(Boolean);
  }

  const session = typeof window === 'undefined' ? null : getSession();
  // 已登入、但後台什麼資料都沒給 → 幾乎一定是 GS 版本太舊（未重新部署）或 API Key 不符
  const emptyData = !!s && !err && (s.users || []).length === 0;

  return <Auth roles={['super_admin','troop_super','admin','group_leader','branch_leader','coach']}><div className="stack">
    <section className="card stack" style={{ background: 'linear-gradient(135deg, #7a4f01 0%, #a16207 100%)', color: '#fff' }}>
       <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>👤 {s?.users[0]?.name || '管理員'}</h2>
            <p style={{ opacity: 0.9, margin: 0 }}>角色：{ROLE_LABEL[s?.users[0]?.role || 'admin']}</p>
          </div>
          <div className="row">
            <Link href="/profile" className="btn" style={{ background: 'rgba(255,255,255,0.94)', color: '#0f2742' }}>個人設定 / 改密碼</Link>
          </div>
       </div>
    </section>

    <section className="hero"><span className="badge gold">管理控制台</span><p>功能卡片根據你的權限動態顯示。上級可授權下級額外功能。</p></section>
    {err&&<p className="badge red" style={{display:'block', lineHeight:1.7, whiteSpace:'pre-wrap'}}>{err}</p>}
    {emptyData&&(
      <section className="card" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
        <h3 style={{ marginTop: 0, color: '#991b1b' }}>⚠️ 已登入，但後台沒有回傳任何資料</h3>
        <p className="muted" style={{ margin: 0 }}>
          登入帳號是「{session?.userId || '—'}」，後台卻回傳空的 user 清單。這通常代表
          Google Sheet 的 Apps Script 還沒更新到 <b>3.0-live</b>（舊版不認得超管／STAFF_TOKEN 的身份，會把它當訪客）。
        </p>
        <ol className="muted" style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>把 <code className="code" style={{ padding: '1px 6px' }}>gs/SCOUTSYSTEM_2_SETUP.gs</code> 整份貼回 Script Editor</li>
          <li>Deploy → Manage deployments → 新增版本（Who has access = <b>Anyone</b>）</li>
          <li>回登入頁按「🩺 連線檢查」，確認「後台版本」是 3.0-live</li>
        </ol>
      </section>
    )}
    <section className="grid">
      <a href="/admin/users"><SummaryCard label="用戶" value={stats.users} desc="總登記人數"/></a>
      <a href="/admin/applications"><SummaryCard label="待審批" value={stats.pending} desc="等待審批" tone="red"/></a>
      <a href="/admin/events"><SummaryCard label="活動" value={stats.activities} desc="已發布" tone="green"/></a>
      <a href="/notices"><SummaryCard label="通告" value={stats.notices} desc="通告數" tone="gold"/></a>
    </section>
    <section className="grid">
      <AttendanceCard />
      {renderFeatureCards()}
    </section>
  </div></Auth>;
}
