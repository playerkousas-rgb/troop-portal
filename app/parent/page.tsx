'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsoleHeader from '@/components/ui/ConsoleHeader';
import Panel from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import EventReplyRow from '@/components/ui/EventReplyRow';
import StatStrip from '@/components/ui/StatStrip';
import { AppState, loadStateSlice, replyStatus, eventCategory, visibleEventsForMember, personActivityStats, emergencyContactFor } from '@/lib/store';
import { apiSetReply, apiTogglePaid } from '@/lib/api';
import { getSession } from '@/lib/session';
import { useConfirm, kv } from '@/components/ConfirmProvider';

export default function Parent(){
  const [s,setS]=useState<AppState|null>(null);const [err,setErr]=useState('');
  const [loadingId,setLoadingId]=useState('');
  const { confirm } = useConfirm();
  // 按需載入：家長空間（replyStatus 用到 replies）
  useEffect(()=>{loadStateSlice(['users','members','events','replies']).then(setS).catch(e=>setErr(e.message))},[]);
  const session=getSession();

  if(err)return <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4"><p className="text-sm text-rose-700 font-bold m-0 whitespace-pre-wrap leading-relaxed">{err}</p></div>;
  if(!s)return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-600">載入中...</div>;
  const parent=s.users.find(u=>u.id===(session?.userId))||s.users.find(u=>u.role==='parent');
  if(!parent)return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-600">找不到家長帳號。</div>;
  const children=s.members.filter(m=>(parent.childMemberIds||[]).includes(m.id)||m.parentUserId===parent.id);
  const stats=personActivityStats(s,children);
  // 家長報名＝簽署：用家長帳戶登入回覆，無需再簽通告回條
  // ★ 家長只有「參加 / 不參加」。「❤️ 有興趣」係成員專用（成員向家長及領袖表達意見，
  //   唔等於報名），所以家長端只會睇到子女標示咗有興趣，唔會有呢個掣。
  async function respond(eid:string,mid:string,type:'registered'|'declined'){
    const ev=s?.events.find(e=>e.id===eid);
    const label={registered:'✅ 確定參加',declined:'❌ 婉拒不參加'}[type]||type;
    const ok=await confirm({title:'確認代子女回覆活動',message:kv([['活動',ev?.title||eid],['回覆',label]]),confirmLabel:'確認回覆'});
    if(!ok)return;
    setLoadingId(eid+mid);setErr('');
    try{const f=await apiSetReply({eventId:eid,memberId:mid,type,parentUserId:parent.id});setS(f)}catch(e:any){setErr(e.message)}finally{setLoadingId('')}
  }
  // 已付款 tick：只喺「已參加」時先會出現（不參加不用 tick）
  async function togglePaid(eid:string,mid:string){
    const ev=s?.events.find(e=>e.id===eid);
    const cur=!!replyStatus(s,eid,mid)?.paid;
    const ok=await confirm({title:'確認切換付款狀態',message:kv([['活動',ev?.title||eid],['變更後狀態',cur?'❌ 未付款':'💰 已付款']]),confirmLabel:'確認'});
    if(!ok)return;
    setLoadingId(eid+mid+'paid');setErr('');
    try{const f=await apiTogglePaid(eid,mid);setS(f)}catch(e:any){setErr(e.message)}finally{setLoadingId('')}
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <ConsoleHeader
        icon="👨‍👩‍👧"
        name={parent.name}
        roleLabel="家長"
        tone="violet"
        tagline="管理子女活動報名與資訊。用家長帳戶登入報名＝已簽署，無需再簽通告回條。「❤️ 有興趣」是子女表達意願（不等於報名），家長只需回覆 ✅ 參加 / ❌ 不參加。"
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

      {/* 上方統計：一眼睇到有幾多個活動進行中、子女報咗未、有冇未找數，
          以及外部（區地域總會）另外有幾多個活動可以自己去報。 */}
      {children.length > 0 && (
        <StatStrip stats={[
          { label: '進行中活動', value: stats.ongoing, desc: '旅團活動', tone: 'blue', href: '/activities' },
          { label: '已報名', value: stats.registered, desc: '子女人次', tone: 'green' },
          { label: '未回覆', value: stats.unresponded, desc: '等你決定', tone: stats.unresponded > 0 ? 'red' : 'slate' },
          { label: '未付款', value: stats.unpaid, desc: '已報名待付', tone: stats.unpaid > 0 ? 'gold' : 'slate' },
          { label: '區地域總會', value: stats.district, desc: '外部活動·自行報名', tone: 'violet', href: '/activities?tab=district' },
        ]} />
      )}

      {children.length===0 ? (
        <EmptyState
          icon="🧒"
          title="尚未連結任何子女"
          desc="請聯絡領袖在成員資料庫中連結你的帳號。"
        />
      ) : (
        children.map(c => {
          // ★ 單一來源：家長睇到嘅 = 子女本人睇到嘅，完全同一套規則。
          //   以後可見度規則點改，只需改 visibleEventsForMember 一個地方，兩邊自動同步，
          //   唔會再出現「仔女見到但家長見唔到」（或者相反）嘅情況。
          const events = visibleEventsForMember(s, c);
          return (
            <Panel
              key={c.id}
              icon="📢"
              title={`${c.name} 的活動`}
              subtitle="為子女回覆：參加 / 不參加，並標記付款（❤️ 有興趣是子女表達意願，不等於報名）"
              tone="blue"
              count={`${events.length} 個`}
            >
              <div className="grid gap-2">
                {events.length === 0 ? (
                  <EmptyState icon="🏕️" title="暫無待回覆活動" desc="領袖發布活動後，這裡會顯示需要你回覆的活動。用家長帳戶登入回覆＝已簽署。" />
                ) : (
                  events.map(e => {
                    const r = replyStatus(s, e.id, c.id);
                    // 區地域總會活動：領袖只係精選通告畀你睇，想報就自己按連結報名，
                    // 旅團唔會代收報名／代收錢，所以唔會有回覆掣同付款格。
                    const isDistrict = eventCategory(e) === 'district';
                    return (
                      <EventReplyRow
                        key={e.id}
                        event={e}
                        status={r?.type}
                        labels={{ registered: '✅ 狀態：已報名參加', declined: '❌ 狀態：已婉拒參加', interested: '❤️ 狀態：子女有興趣', unresponded: '⚠️ 狀態：尚未回覆' }}
                        badges={[
                          ...(isDistrict ? [{ text: '🗺️ 區地域總會通告（自行報名）', tone: 'violet' as const }] : []),
                          ...(e.status === 'archived' ? [{ text: '🗂️ 已過期（紀錄保留）', tone: 'slate' as const }]
                            : e.lateRegistration ? [{ text: '🔓 已重開報名', tone: 'blue' as const }] : []),
                        ]}
                        // 已封存＝報名已截止，只保留紀錄，唔再畀改
                        actions={(e.status === 'archived' || isDistrict) ? [] : [
                          { type: 'registered', idle: '✅ 參加', active: '【已報名】✅ 參加' },
                          { type: 'declined', idle: '❌ 不參加', active: '【已婉拒】❌ 不參加' },
                        ]}
                        loading={loadingId === e.id + c.id}
                        onAct={t => respond(e.id, c.id, t as 'registered' | 'declined')}
                        footer={
                          <>
                          {isDistrict ? (
                            <p className="text-sm text-slate-500 m-0 leading-relaxed">
                              ℹ️ 此為區／地域／總會活動通告，旅團不代收報名及費用。有興趣請按上面的通告連結自行報名。
                            </p>
                          ) :
                          // 💰 只有 tick 咗「參加」先出現付款格；未報名／婉拒／有興趣完全唔會顯示
                          r?.type === 'registered' ? (
                            <div className="grid gap-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-sm text-slate-500 font-semibold">💰 付款</span>
                                <button
                                  type="button"
                                  disabled={loadingId === e.id + c.id + 'paid'}
                                  onClick={() => togglePaid(e.id, c.id)}
                                  className={`text-sm font-bold px-3.5 py-2.5 rounded-lg border transition cursor-pointer disabled:opacity-60 ${
                                    r?.paid ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {r?.paid ? '✅ 已付款（點擊取消）' : '💰 標記已付款'}
                                </button>
                              </div>
                              {/* 領袖核實收款狀態：領袖喺自己嗰邊 tick 咗，家長就會見到「已確認收款」 */}
                              <div
                                className={`flex items-center justify-between gap-2 flex-wrap rounded-lg border px-3 py-2 ${
                                  r?.paymentConfirmed
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                <span className="text-sm font-bold">🧾 領袖收款確認</span>
                                <span className="text-sm font-bold">
                                  {r?.paymentConfirmed
                                    ? `✅ 領袖已確認收款${r.paymentConfirmedAt ? `（${r.paymentConfirmedAt}）` : ''}`
                                    : r?.paid
                                    ? '⏳ 等待領袖核實'
                                    : '—（先標記已付款）'}
                                </span>
                              </div>
                            </div>
                          ) : null}
                          </>
                        }
                      />
                    );
                  })
                )}
              </div>
            </Panel>
          );
        })
      )}

      {/* 家長唔需要「我的工具」（行事曆／活動同底部按鈕重覆）→ 直接換成子女出席紀錄 */}
      <Panel
        icon="📝"
        title="子女出席紀錄"
        subtitle="日常集會及旅團活動的出席情況"
        tone="emerald"
        count={`${children.length} 名子女`}
      >
        <div className="grid gap-2">
          {children.map(c => (
            <Link
              key={c.id}
              href={`/attendance?memberId=${c.id}`}
              className="no-underline text-inherit rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 flex items-center justify-between gap-2 hover:border-emerald-300 hover:bg-white transition"
            >
              <span className="min-w-0">
                <span className="block font-bold text-slate-800">{c.name}</span>
                <span className="block text-sm text-slate-500 font-semibold">{c.ymNumber} · 查看出席紀錄</span>
              </span>
              <span className="text-slate-300 font-black text-xl">→</span>
            </Link>
          ))}
        </div>
      </Panel>

      {/* 🆘 緊急聯絡資料：子女已連結家長帳戶 → 緊急聯絡人就係你，唔使另外再填一次。 */}
      <Panel icon="🆘" title="緊急聯絡資料" subtitle="子女已連結家長帳戶，緊急聯絡人即為家長" tone="rose" defaultOpen={false}>
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 mb-2">
          <p className="text-sm text-rose-800 font-bold m-0 leading-relaxed">
            ℹ️ 你的子女已連結你的家長帳戶，領袖及急救時會直接聯絡你，不需要另外填寫緊急聯絡人。
            聯絡電話請在「個人設定」更新。
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
            <div className="text-sm text-slate-500 font-bold">緊急聯絡人（家長）</div>
            <div className="text-sm font-bold text-slate-800">{parent.name}</div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
            <div className="text-sm text-slate-500 font-bold">Email</div>
            <div className="text-sm font-bold text-slate-800 break-all">{parent.email}</div>
          </div>
          {children.map(c => {
            const ec = emergencyContactFor(s, c);
            return (
              <div key={c.id} className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                <div className="text-sm text-slate-500 font-bold">子女 · 支部 · 聯絡電話</div>
                <div className="text-sm font-bold text-slate-800">
                  {c.name}（{c.ymNumber}）· {c.branchId} · {ec.phone || '未填電話'}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

