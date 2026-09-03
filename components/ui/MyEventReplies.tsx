'use client';
import { useState } from 'react';
import Panel from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import EventReplyRow from '@/components/ui/EventReplyRow';
import { AppState, replyStatus } from '@/lib/store';
import { apiSetReply } from '@/lib/api';
import { getSession } from '@/lib/session';
import { useConfirm, kv } from '@/components/ConfirmProvider';

/**
 * 「待回覆與出席活動」—— 領袖／管理員自己嘅出席回覆。
 *
 * 原本呢張卡喺 /leader（領袖控制台）。而家所有領袖同管理員共用同一個
 * 「管理中心」（/admin），所以抽做共用元件，喺管理中心底部顯示（預設收合，
 * 唔會搶咗管理項目嘅位置）。
 */
export default function MyEventReplies({
  state,
  onState,
  onError,
}: {
  state: AppState | null;
  onState: (fresh: AppState) => void;
  onError?: (msg: string) => void;
}) {
  const [loadingId, setLoadingId] = useState('');
  const { confirm } = useConfirm();
  const session = getSession();
  const myId = session?.userId || '';

  const events = (state?.events || []).filter(
    e =>
      e.status === 'published' &&
      (e.scope === 'troop' || e.targetMemberIds.includes(myId) || e.branchId === session?.branchId)
  );

  async function act(eid: string, type: 'registered' | 'declined' | 'interested') {
    if (!myId || !state || type === 'interested') return;
    const ev = state.events.find(e => e.id === eid);
    const label = type === 'registered' ? '✅ 確定出席' : '❌ 不能出席';
    const ok = await confirm({
      title: '確認回覆活動',
      message: kv([['活動', ev?.title || eid], ['回覆', label]]),
      confirmLabel: '確認回覆',
    });
    if (!ok) return;
    setLoadingId(eid + type);
    try {
      onState(await apiSetReply({ eventId: eid, memberId: myId, type }));
    } catch (e: any) {
      onError?.(e?.message || String(e));
    } finally {
      setLoadingId('');
    }
  }

  return (
    <Panel
      icon="📢"
      title="待回覆與出席活動"
      subtitle="我自己嘅出席確認（管理項目以外的個人回覆）"
      tone="blue"
      count={`${events.length} 個`}
      defaultOpen={false}
    >
      <p className="text-sm text-slate-500 leading-relaxed mt-0 mb-3">
        作為領袖或統籌人員，你可以在此點選出席旅團通告與集會活動，方便旅長與團隊掌握出席人力。
      </p>
      <div className="grid gap-2">
        {events.length === 0 ? (
          <EmptyState icon="🏕️" title="暫無待確認或待出席的活動通告" desc="旅團發布活動後，這裡會顯示需要你確認出席的活動。" />
        ) : (
          events.map(e => {
            const r = state ? replyStatus(state, e.id, myId) : undefined;
            return (
              <EventReplyRow
                key={e.id}
                event={e}
                status={r?.type}
                labels={{
                  registered: '✅ 狀態：確定出席',
                  declined: '❌ 狀態：不能出席',
                  interested: '❤️ 狀態：有興趣出席',
                  unresponded: '⚠️ 狀態：尚未確認',
                }}
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
  );
}
