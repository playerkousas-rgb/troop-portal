'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsoleHeader from '@/components/ui/ConsoleHeader';
import ToolGroup, { ConsoleTool } from '@/components/ui/ToolGroup';
import Panel from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import EventReplyRow from '@/components/ui/EventReplyRow';
import PluginIframeCard from '@/components/PluginCard';
import { AppState, loadStateSlice, visibleEventsForMember, replyStatus } from '@/lib/store';
import { apiSetReply } from '@/lib/api';
import { getSession } from '@/lib/session';
import { useConfirm, kv } from '@/components/ConfirmProvider';

export default function Member(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  const [loadingId,setLoadingId]=useState('');
  const { confirm } = useConfirm();
  // 按需載入：成員空間（visibleEventsForMember 用到 events/replies）
  useEffect(()=>{loadStateSlice(['patrols','members','plugins','pluginSettings','events','replies']).then(setS).catch(e=>setErr(e.message))},[]);
  const session=getSession();

  const tools: ConsoleTool[] = [
    { id: 'attendance', icon: '📝', label: '出席紀錄', desc: '日常集會及旅團自辦活動的出席紀錄。', href: '/attendance' },
    { id: 'equipment', icon: '📦', label: '借用物資', desc: '查看可借數量並申請借用，待領袖批核。', href: '/equipment' },
    { id: 'calendar', icon: '📅', label: '行事曆', desc: '旅團公開行事曆及集會時間。', href: '/calendar' },
  ];

  if(err)return <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4"><p className="text-sm text-rose-700 font-bold m-0 whitespace-pre-wrap leading-relaxed">{err}</p></div>;
  if(!s)return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-600">載入中...</div>;
  const member=s.members.find(m=>m.id===(session?.memberId))||s.members[0];
  if(!member)return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-600">找不到成員資料。</div>;
  const adult=member.age>=18;
  async function act(eid:string,type:'interested'|'registered'|'declined'){
    const ev=s?.events.find(e=>e.id===eid);
    const label={interested:'❤️ 有興趣',registered:'✅ 確定參加',declined:'❌ 婉拒不參加'}[type]||type;
    const ok=await confirm({title:'確認回覆活動',message:kv([['活動',ev?.title||eid],['回覆',label]]),confirmLabel:'確認回覆'});
    if(!ok)return;
    setLoadingId(eid+type);setErr('');
    try{const f=await apiSetReply({eventId:eid,memberId:member.id,type});setS(f)}catch(e:any){setErr(e.message)}finally{setLoadingId('')}
  }
  const events=visibleEventsForMember(s,member);

  // Filter plugins by role and branch if needed
  const visiblePlugins = s.plugins.filter(p => {
    // 點名已內建，避免舊 Plugins 表紀錄重複顯示。
    if (p.id === 'troop_attendance') return false;
    // Example: vs_badge_tracker only for Venture (b4)
    if (p.id === 'vs_badge_tracker' && member.branchId !== 'b4') return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <ConsoleHeader
        icon="👤"
        name={member.name}
        roleLabel={`成員${member.specialRole ? `（${member.specialRole}）` : ''}`}
        tone="emerald"
        tagline={adult ? '你已 18 歲或以上，可自行回覆活動 ✅ / ❌。' : '你未滿 18 歲，可按 ❤️ 表示有興趣；參加 / 不參加由家長決定。'}
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

      <Panel icon="📢" title="活動與集會" subtitle="回覆出席狀態" tone="blue" count={`${events.length} 個`}>
        <div className="grid gap-2">
          {events.length===0 ? (
            <EmptyState icon="🏕️" title="暫無可見活動" desc="領袖發布活動後，這裡會顯示可以報名的活動。" />
          ) : (
            events.map(e=>{
              const r=replyStatus(s,e.id,member.id);
              const isDuty = e.dutyPatrol && member.patrolId && s.patrols.find(p => p.id === member.patrolId)?.name === e.dutyPatrol;
              const badges = [];
              if (isDuty) badges.push({ text: '你的小隊值日', tone: 'violet' as const });
              else if (e.dutyPatrol) badges.push({ text: `${e.dutyPatrol} 值日`, tone: 'slate' as const });
              return (
                <EventReplyRow
                  key={e.id}
                  event={e}
                  status={r?.type}
                  badges={badges}
                  actions={[
                    { type: 'interested', idle: '❤️ 有興趣', active: '【已點選】❤️ 有興趣' },
                    ...(adult ? [
                      { type: 'registered' as const, idle: '✅ 參加', active: '【已報名】✅ 參加' },
                      { type: 'declined' as const, idle: '❌ 不參加', active: '【已婉拒】❌ 不參加' },
                    ] : []),
                  ]}
                  loading={!!loadingId && loadingId.startsWith(e.id)}
                  onAct={t => act(e.id, t)}
                />
              );
            })
          )}
        </div>
      </Panel>

      <ToolGroup icon="🧰" title="我的工具" subtitle="出席紀錄 · 借用物資 · 行事曆" tone="emerald" tools={tools} />

      {visiblePlugins.length > 0 && (
        <Panel icon="🧩" title="擴充元件" subtitle="旅團已啟用的 2／3 級元件" tone="violet" count={`${visiblePlugins.length} 個`} bodyClass="pt-3" defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visiblePlugins.map(p => (
              <PluginIframeCard
                key={p.id}
                plugin={p}
                unitCode={session?.troopCode || ''}
                settings={s.pluginSettings?.find(ps => ps.pluginId === p.id)}
              />
            ))}
          </div>
        </Panel>
      )}

      <Panel icon="🆘" title="個人緊急聯絡資料" subtitle="領袖及急救時使用" tone="rose" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { k: '聯絡人', v: member.emergencyContactName || '未設定' },
            { k: '電話', v: member.emergencyContactPhone || '未設定' },
            { k: '支部', v: member.branchId },
            { k: '小隊', v: s.patrols.find(p=>p.id===member.patrolId)?.name || '—' },
          ].map(item => (
            <div key={item.k} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-sm text-slate-500 font-bold">{item.k}</div>
              <div className="text-sm font-bold text-slate-800">{item.v}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex gap-2 flex-wrap">
        <Link href="/profile" className="no-underline text-sm font-bold bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition">我的資料 / 改密碼</Link>
        <Link href="/calendar" className="no-underline text-sm font-bold bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition">行事曆</Link>
      </div>
    </div>
  );
}
