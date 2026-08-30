'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsoleHeader from '@/components/ui/ConsoleHeader';
import ToolGroup, { ConsoleTool } from '@/components/ui/ToolGroup';
import Panel from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import EventReplyRow from '@/components/ui/EventReplyRow';
import { AppState, loadStateSlice, replyStatus } from '@/lib/store';
import { apiSetReply } from '@/lib/api';
import { getSession } from '@/lib/session';

export default function Parent(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  const [loadingId,setLoadingId]=useState('');
  // 按需載入：家長空間（replyStatus 用到 replies）
  useEffect(()=>{loadStateSlice(['users','members','events','replies']).then(setS).catch(e=>setErr(e.message))},[]);
  const session=getSession();

  const tools: ConsoleTool[] = [
    { id: 'attendance', icon: '📝', label: '子女出席紀錄', desc: '日常集會及旅團自辦活動的出席紀錄（點名與報名分開處理）。', href: '/attendance' },
    { id: 'calendar', icon: '📅', label: '行事曆', desc: '旅團公開行事曆及集會時間。', href: '/calendar' },
    { id: 'notices', icon: '📄', label: '通告', desc: '旅團通告及外間活動通告。', href: '/notices' },
  ];

  if(err)return <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4"><p className="text-xs text-rose-700 font-bold m-0 whitespace-pre-wrap leading-relaxed">{err}</p></div>;
  if(!s)return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-600">載入中...</div>;
  const parent=s.users.find(u=>u.id===(session?.userId))||s.users.find(u=>u.role==='parent');
  if(!parent)return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-600">找不到家長帳號。</div>;
  const children=s.members.filter(m=>(parent.childMemberIds||[]).includes(m.id)||m.parentUserId===parent.id);
  async function respond(eid:string,mid:string,type:'registered'|'declined'){
    setLoadingId(eid+mid);setErr('');
    try{const f=await apiSetReply({eventId:eid,memberId:mid,type,parentUserId:parent.id});setS(f)}catch(e:any){setErr(e.message)}finally{setLoadingId('')}
  }

  return (
    <div className="space-y-3">
      <ConsoleHeader
        icon="👨‍👩‍👧"
        name={parent.name}
        roleLabel="家長"
        tone="violet"
        tagline="管理子女活動報名與資訊。"
        action={
          <Link href="/profile" className="no-underline text-[11px] font-bold bg-white/95 text-slate-800 px-3 py-2 rounded-xl hover:bg-white transition whitespace-nowrap">
            👤 個人設定
          </Link>
        }
      />

      {err && (
        <section className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <p className="text-xs text-rose-700 font-bold m-0 whitespace-pre-wrap leading-relaxed">{err}</p>
        </section>
      )}

      {children.length===0 ? (
        <EmptyState
          icon="🧒"
          title="尚未連結任何子女"
          desc="請聯絡領袖在成員資料庫中連結你的帳號。"
        />
      ) : (
        children.map(c => {
          const events = s.events.filter(e => e.status === 'published' && e.targetMemberIds.includes(c.id));
          return (
            <Panel
              key={c.id}
              icon="📢"
              title={`${c.name} 的活動`}
              subtitle="為子女回覆參加 / 不參加"
              tone="blue"
              count={`${events.length} 個`}
            >
              <div className="grid gap-2">
                {events.length === 0 ? (
                  <EmptyState icon="🏕️" title="暫無待回覆活動" desc="領袖發布活動後，這裡會顯示需要你回覆的活動。" />
                ) : (
                  events.map(e => {
                    const r = replyStatus(s, e.id, c.id);
                    return (
                      <EventReplyRow
                        key={e.id}
                        event={e}
                        status={r?.type}
                        labels={{ registered: '✅ 狀態：已報名參加', declined: '❌ 狀態：已婉拒參加', interested: '❤️ 狀態：子女有興趣', unresponded: '⚠️ 狀態：尚未回覆' }}
                        actions={[
                          { type: 'registered', idle: '✅ 確認參加', active: '【已為子女確認】✅ 參加' },
                          { type: 'declined', idle: '❌ 不參加', active: '【已為子女婉拒】❌ 不參加' },
                        ]}
                        loading={loadingId === e.id + c.id}
                        onAct={t => respond(e.id, c.id, t as 'registered' | 'declined')}
                      />
                    );
                  })
                )}
              </div>
            </Panel>
          );
        })
      )}

      <ToolGroup icon="🧰" title="我的工具" subtitle="出席紀錄 · 行事曆 · 通告" tone="emerald" tools={tools} />

      <Panel icon="🆘" title="家庭聯絡資料" subtitle="家長及子女資料" tone="rose" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
            <div className="text-[11px] text-slate-500 font-bold">家長</div>
            <div className="text-sm font-bold text-slate-800">{parent.name}</div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
            <div className="text-[11px] text-slate-500 font-bold">Email</div>
            <div className="text-sm font-bold text-slate-800 break-all">{parent.email}</div>
          </div>
          {children.map(c => (
            <div key={c.id} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[11px] text-slate-500 font-bold">子女 · 支部</div>
              <div className="text-sm font-bold text-slate-800">{c.name}（{c.ymNumber}）· {c.branchId}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex gap-2 flex-wrap">
        <Link href="/profile" className="no-underline text-[11px] font-bold bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition">修改個人資料 / 改密碼</Link>
        <Link href="/calendar" className="no-underline text-[11px] font-bold bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition">行事曆</Link>
      </div>
    </div>
  );
}
