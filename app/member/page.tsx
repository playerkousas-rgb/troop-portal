'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsoleHeader from '@/components/ui/ConsoleHeader';
import ToolGroup, { ConsoleTool } from '@/components/ui/ToolGroup';
import Panel from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import EventReplyRow from '@/components/ui/EventReplyRow';
import StatStrip from '@/components/ui/StatStrip';
import { AppState, loadStateSlice, visibleEventsForMember, replyStatus, eventCategory, personActivityStats, emergencyContactFor } from '@/lib/store';
import { apiSetReply } from '@/lib/api';
import { getSession } from '@/lib/session';
import { useConfirm, kv } from '@/components/ConfirmProvider';

export default function Member(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  const [loadingId,setLoadingId]=useState('');
  const { confirm } = useConfirm();
  // 按需載入：成員空間（visibleEventsForMember 用到 events/replies；users 用嚟解析已連結家長）
  useEffect(()=>{loadStateSlice(['patrols','members','users','events','replies']).then(setS).catch(e=>setErr(e.message))},[]);
  const session=getSession();

  const tools: ConsoleTool[] = [
    { id: 'attendance', icon: '📝', label: '出席紀錄', desc: '日常集會及旅團活動的出席紀錄。', href: '/attendance' },
    { id: 'equipment', icon: '📦', label: '借用物資', desc: '查看可借數量並申請借用，待領袖批核。', href: '/equipment' },
    { id: 'badges', icon: '🎖️', label: '想考的章', desc: '登記想考的章，讓領袖安排及跟進。', href: '/profile?tab=badges' },
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
  const stats=personActivityStats(s,[member]);
  const ec=emergencyContactFor(s,member);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <ConsoleHeader
        icon="👤"
        name={member.name}
        roleLabel={`成員${member.specialRole ? `（${member.specialRole}）` : ''}`}
        tone="emerald"
        tagline={adult ? '你已 18 歲或以上，可自行回覆活動 ✅ / ❌。' : '你未滿 18 歲：❤️ 有興趣＝話畀家長及領袖知你想去（只表達意見，唔等於報名）；參加 / 不參加由家長決定。'}
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

      {/* 上方統計：而家有幾多個活動進行中、我報咗未、有冇未找數，
          以及外部（區地域總會）另外有幾多個活動可以自己去報。 */}
      <StatStrip stats={[
        { label: '進行中活動', value: stats.ongoing, desc: '旅團活動', tone: 'blue', href: '/activities' },
        { label: '已報名', value: stats.registered, desc: '確定參加', tone: 'green' },
        { label: '未回覆', value: stats.unresponded, desc: adult ? '等你回覆' : '等你／家長回覆', tone: stats.unresponded > 0 ? 'red' : 'slate' },
        { label: '未付款', value: stats.unpaid, desc: '已報名待付', tone: stats.unpaid > 0 ? 'gold' : 'slate' },
        { label: '區地域總會', value: stats.district, desc: '外部活動·自行報名', tone: 'violet', href: '/activities?tab=district' },
      ]} />

      <Panel icon="📢" title="活動與集會" subtitle="回覆出席狀態" tone="blue" count={`${events.length} 個`}>
        <div className="grid gap-2">
          {events.length===0 ? (
            <EmptyState icon="🏕️" title="暫無可見活動" desc="領袖發布活動後，這裡會顯示可以報名的活動。" />
          ) : (
            events.map(e=>{
              const r=replyStatus(s,e.id,member.id);
              const isDuty = e.dutyPatrol && member.patrolId && s.patrols.find(p => p.id === member.patrolId)?.name === e.dutyPatrol;
              // 區地域總會活動＝純通告，想報自己去報，旅團唔代收報名
              const isDistrict = eventCategory(e) === 'district';
              const badges: { text: string; tone: 'violet' | 'slate' | 'blue' }[] = [];
              if (isDistrict) badges.push({ text: '🗺️ 區地域總會通告（自行報名）', tone: 'violet' });
              if (e.status === 'archived') badges.push({ text: '🗂️ 已過期（紀錄保留）', tone: 'slate' });
              else if (e.lateRegistration) badges.push({ text: '🔓 已重開報名', tone: 'blue' });
              if (isDuty) badges.push({ text: '你的小隊值日', tone: 'violet' });
              else if (e.dutyPatrol) badges.push({ text: `${e.dutyPatrol} 值日`, tone: 'slate' });
              return (
                <EventReplyRow
                  key={e.id}
                  event={e}
                  status={r?.type}
                  badges={badges}
                  // ★ 未滿 18 歲：參加／不參加嘅掣照樣顯示，只係鎖住。
                  //   咁樣成員睇到嘅版面同家長一樣（同一個活動、同一組功能），
                  //   分別只在於「我冇權撳」，而唔係「呢個功能唔存在」。
                  actions={(isDistrict || e.status === 'archived') ? [] : [
                    // ❤️ 有興趣＝成員向家長及領袖表達意見，唔等於報名（家長端冇呢個掣）
                    { type: 'interested' as const, idle: '❤️ 有興趣（非報名）', active: '【已表達】❤️ 有興趣' },
                    { type: 'registered' as const, idle: '✅ 參加', active: '【已報名】✅ 參加',
                      lockedReason: adult ? undefined : '未滿 18 歲，參加／不參加須由家長代為決定（家長登入回覆＝已簽署）。' },
                    { type: 'declined' as const, idle: '❌ 不參加', active: '【已婉拒】❌ 不參加',
                      lockedReason: adult ? undefined : '未滿 18 歲，參加／不參加須由家長代為決定（家長登入回覆＝已簽署）。' },
                  ]}
                  loading={!!loadingId && loadingId.startsWith(e.id)}
                  onAct={t => act(e.id, t)}
                  footer={
                    <>
                    {isDistrict ? (
                    <p className="text-sm text-slate-500 m-0 leading-relaxed">
                      ℹ️ 此為區／地域／總會活動通告，旅團不代收報名及費用。有興趣請按上面的通告連結自行報名。
                    </p>
                  ) : null}
                    </>
                  }
                />
              );
            })
          )}
        </div>
      </Panel>

      <ToolGroup icon="🧰" title="我的工具" subtitle="出席紀錄 · 借用物資 · 想考的章" tone="emerald" tools={tools} />

      {/* 🆘 緊急聯絡資料：已連結家長帳戶就直接用家長資料（唔會再手動抄一次，
          家長改咗資料呢度即刻跟住變）。冇連結先顯示手動填寫嘅聯絡人。 */}
      <Panel
        icon="🆘"
        title="緊急聯絡資料"
        subtitle={ec.source === 'parent' ? '已連結家長帳戶 · 直接使用家長資料' : '領袖及急救時使用'}
        tone="rose"
        defaultOpen={false}
      >
        {ec.source === 'parent' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 mb-2">
            <p className="text-sm text-rose-800 font-bold m-0 leading-relaxed">
              ℹ️ 你已連結家長帳戶「{ec.parentName}」，緊急聯絡人自動就是家長，不需另外填寫。
            </p>
          </div>
        )}
        {ec.source === 'none' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 mb-2">
            <p className="text-sm text-amber-800 font-bold m-0 leading-relaxed">
              ⚠️ 尚未連結家長帳戶，亦未填寫緊急聯絡人。請聯絡領袖在成員資料庫連結家長，或在「個人設定」補回聯絡電話。
            </p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { k: ec.source === 'parent' ? '緊急聯絡人（家長）' : '緊急聯絡人', v: ec.name || '未設定' },
            { k: '電話', v: ec.phone || '未設定' },
            ...(ec.email ? [{ k: '家長 Email', v: ec.email }] : []),
            { k: '支部', v: member.branchId },
            { k: '小隊', v: s.patrols.find(p=>p.id===member.patrolId)?.name || '—' },
          ].map(item => (
            <div key={item.k} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-sm text-slate-500 font-bold">{item.k}</div>
              <div className="text-sm font-bold text-slate-800 break-all">{item.v}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
