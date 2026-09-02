'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Auth from '@/components/Auth';
import ConsoleHeader from '@/components/ui/ConsoleHeader';
import StatStrip from '@/components/ui/StatStrip';
import ToolGroup, { ConsoleTool } from '@/components/ui/ToolGroup';
import Panel from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import EventReplyRow from '@/components/ui/EventReplyRow';
import PluginIframeCard from '@/components/PluginCard';
import { AppState, loadStateSlice, computeStats, replyStatus } from '@/lib/store';
import { apiSetReply } from '@/lib/api';
import { getSession } from '@/lib/session';
import { ROLE_LABEL } from '@/lib/model';
import { hasFeature } from '@/lib/permissions';
import { useConfirm, kv } from '@/components/ConfirmProvider';

// 領袖常用功能：全部歸入一張大卡（可收合）
// feature：對應後台 UserPermissions 權限鍵。顯示與否由管理員／團長
// 喺「使用者管理 → 授權」逐個帳號開關，唔再 hardcode 角色。
const LEADER_TOOLS: (ConsoleTool & { feature: string })[] = [
  { id: 'members', icon: '👥', label: '成員資料庫', desc: '查看及管理所屬支部成員。', href: '/admin/members', feature: 'members' },
  { id: 'events', icon: '🗓️', label: '活動管理', desc: '新增、發布及管理活動。', href: '/admin/events', feature: 'events' },
  { id: 'registrations', icon: '📊', label: '活動統計', desc: '自行舉辦／區地域總會活動統計及匯出。', href: '/admin/registrations', feature: 'registrations' },
  { id: 'equipment', icon: '📦', label: '物資借用管理', desc: '物資清單、批核借用、歸還回補庫存。', href: '/admin/equipment', feature: 'equipment' },
  { id: 'applications', icon: '✅', label: '審核申請', desc: '審核家長／成員申請。', href: '/admin/applications', feature: 'applications' },
  { id: 'library', icon: '🗺️', label: '區地域總會活動', desc: '引入區／地域／總會活動（原圖書館）。', href: '/library/import', feature: 'library_import' },
  { id: 'calendar', icon: '📅', label: '行事曆', desc: '查看及管理行事曆。', href: '/calendar', feature: 'calendar' },
];

export default function Leader(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  const [loadingId,setLoadingId]=useState('');
  const { confirm } = useConfirm();
  // 按需載入：領袖摘要（computeStats 用到 users/applications/events/bookmarks）+ 活動回覆
  useEffect(()=>{loadStateSlice(['events','plugins','pluginSettings','users','applications','bookmarks','replies','userFeatures']).then(setS).catch(e=>setErr(e.message))},[]);
  const stats=s?computeStats(s):{users:0,pending:0,activities:0,notices:0};
  const session = getSession();
  const myId = session?.userId || '';
  const canEvents = hasFeature(s?.userFeatures, 'events', session?.role);
  const canApplications = hasFeature(s?.userFeatures, 'applications', session?.role);
  const canUsers = hasFeature(s?.userFeatures, 'users', session?.role);

  async function act(eid:string,type:'registered'|'declined'|'interested'){
    if(!myId)return;
    const ev=s?.events.find(e=>e.id===eid);
    const label={registered:'✅ 確定參加',declined:'❌ 婉拒不參加',interested:'❤️ 有興趣'}[type]||type;
    const ok=await confirm({title:'確認回覆活動',message:kv([['活動',ev?.title||eid],['回覆',label]]),confirmLabel:'確認回覆'});
    if(!ok)return;
    setErr('');setLoadingId(eid+type);
    try{const f=await apiSetReply({eventId:eid,memberId:myId,type});setS(f)}catch(e:any){setErr(e.message)}finally{setLoadingId('')}
  }

  const events = (s?.events || []).filter(e => e.status === 'published' && (e.scope === 'troop' || e.targetMemberIds.includes(myId) || e.branchId === session?.branchId));
  const plugins = (s?.plugins || []).filter(p => p.id !== 'troop_attendance');

  return <Auth roles={['super_admin','troop_super','admin','group_leader','branch_leader','coach']}><div className="max-w-5xl mx-auto space-y-4">
    <ConsoleHeader
      icon="🧭"
      name={session?.name || '領袖'}
      roleLabel={ROLE_LABEL[session?.role || 'coach']}
      tone="blue"
      tagline="管理所屬支部的活動、成員及通告。"
      action={
        <Link href="/profile" className="no-underline text-sm font-bold bg-white/95 text-slate-800 px-3 py-2 rounded-xl hover:bg-white transition whitespace-nowrap">
          👤 個人設定
        </Link>
      }
    />

    {err && (
      <section className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
        <p className="text-sm text-rose-700 font-bold m-0 whitespace-pre-wrap leading-relaxed">{err}</p>
      </section>
    )}

    <StatStrip stats={[
      // 冇權限嘅功能只顯示數字，唔畀連結（避免撳咗變「需要合適權限」）
      { label: '活動', value: stats.activities, desc: '已發布活動', tone: 'green', ...(canEvents ? { href: '/admin/events' } : {}) },
      { label: '待審批', value: stats.pending, desc: '等待審批申請', tone: 'red', ...(canApplications ? { href: '/admin/applications' } : {}) },
      { label: '通告', value: stats.notices, desc: '圖書館引入通告', tone: 'gold', href: '/notices' },
      { label: '用戶', value: stats.users, desc: '總登記人數', tone: 'blue', ...(canUsers ? { href: '/admin/users' } : {}) },
    ]} />

    <Panel
      icon="📢"
      title="待回覆與出席活動"
      subtitle="領袖個人報名與確認"
      tone="blue"
      count={`${events.length} 個`}
    >
      <p className="text-sm text-slate-500 leading-relaxed mt-0 mb-3">
        作為領袖或統籌人員，你可在此點選出席旅團通告與集會活動，方便旅長與團隊掌握出席人力。
      </p>
      <div className="grid gap-2">
        {events.length === 0 ? (
          <EmptyState icon="🏕️" title="暫無待確認或待出席的活動通告" desc="領袖發布活動後，這裡會顯示需要你確認出席的活動。" />
        ) : (
          events.map(e => {
            const r = replyStatus(s!, e.id, myId);
            return (
              <EventReplyRow
                key={e.id}
                event={e}
                status={r?.type}
                labels={{ registered: '✅ 狀態：確定出席', declined: '❌ 狀態：不能出席', interested: '❤️ 狀態：有興趣出席', unresponded: '⚠️ 狀態：尚未確認' }}
                actions={[
                  { type: 'registered', idle: '✅ 確定出席', active: '【已確認】✅ 確定出席' },
                  { type: 'declined', idle: '❌ 不能出席', active: '【已婉拒】❌ 不能出席' },
                ]}
                loading={loadingId === e.id + 'registered' || loadingId === e.id + 'declined'}
                onAct={t => act(e.id, t)}
              />
            );
          })
        )}
      </div>
    </Panel>

    <ToolGroup icon="🧰" title="管理工具" subtitle="成員 · 活動 · 報名 · 物資 · 通告" tone="emerald" tools={LEADER_TOOLS.filter(t => hasFeature(s?.userFeatures, t.feature, session?.role))} />

    {plugins.length > 0 && (
      <Panel icon="🧩" title="擴充元件" subtitle="旅團已啟用的 2／3 級元件" tone="violet" count={`${plugins.length} 個`} bodyClass="pt-3" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {plugins.map(p => (
            <PluginIframeCard
              key={p.id}
              plugin={p}
              unitCode={session?.troopCode || ''}
              settings={s?.pluginSettings?.find(ps => ps.pluginId === p.id)}
            />
          ))}
        </div>
      </Panel>
    )}
  </div></Auth>;
}
