'use client';
/* ═══════════════════════════════════════════════════════════════
   PublicScopePanel —— 公開資料卡嘅「內容範圍」掣（三張卡共用）

   模型（見 lib/publicScope.ts）：
   ・第 1 層：管理員喺 /admin/settings 開邊幾張卡（行事曆／相簿／通告）
   ・第 2 層：入面每項內容各自開放 ——
       全旅內容（troop）由管理層決定；各支部內容由該支部團長／支部領袖決定
   ・全部範圍關晒 ⇒ 呢張卡等於重新關閉，要再由管理員開返

   管理層見到「全旅內容」＋所有支部；支部領袖只見到自己支部。
   ═══════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { AppState } from '@/lib/store';
import { apiSetPublicScope } from '@/lib/api';
import { branches, publicViewEnabled } from '@/lib/model';
import { scopeOpen, openScopes, cardEffective, TROOP_SCOPE, PublicCardId } from '@/lib/publicScope';
import { useConfirm, kv } from '@/components/ConfirmProvider';

/** 每張卡嘅文案（公開範圍描述會直接顯示畀用戶，所以逐卡寫清楚） */
const CARD_COPY: Record<PublicCardId, {
  icon: string; name: string; troopOn: string; troopOff: string;
  branchOn: string; branchOff: string; openLabel: string; closeLabel: string;
  scope: string; exclude: string;
}> = {
  calendar: {
    icon: '📅', name: '行事曆',
    troopOn: '🟢 已公開 —— 訪客睇到跨支部／全旅活動（卡片一開就預設公開）',
    troopOff: '🔒 未公開 —— 全旅活動唔會顯示畀未登入訪客',
    branchOn: '🟢 已公開 —— 訪客睇到本支部已公佈活動＋恆常集會',
    branchOff: '🔒 未公開 —— 本支部項目唔會顯示畀未登入訪客',
    openLabel: '公開本支部', closeLabel: '取消公開',
    scope: '只限已公佈活動＋已啟用恆常集會（標題／日期／時間／地點／通告連結）',
    exclude: '未公佈（PRIVATE）活動、報名名單、出席紀錄、成員及家長聯絡電話',
  },
  albums: {
    icon: '📷', name: '相簿',
    troopOn: '🟢 已公開 —— 訪客睇到全旅活動嘅相簿連結',
    troopOff: '🔒 未公開 —— 全旅活動相簿唔會顯示畀未登入訪客',
    branchOn: '🟢 已公開 —— 訪客睇到本支部活動嘅相簿連結',
    branchOff: '🔒 未公開 —— 本支部活動相簿唔會顯示畀未登入訪客',
    openLabel: '公開本支部相簿', closeLabel: '取消公開',
    scope: '只限已發佈／已封存活動嘅相簿連結（領袖手動貼上嘅 URL）',
    exclude: '未發佈活動、相簿內嘅成員姓名／照片以外的系統資料、報名名單',
  },
  notices: {
    icon: '📄', name: '通告',
    troopOn: '🟢 已公開 —— 訪客睇到全旅通告',
    troopOff: '🔒 未公開 —— 全旅通告唔會顯示畀未登入訪客',
    branchOn: '🟢 已公開 —— 訪客睇到本支部通告',
    branchOff: '🔒 未公開 —— 本支部通告唔會顯示畀未登入訪客',
    openLabel: '公開本支部通告', closeLabel: '取消公開',
    scope: '只限「已設為可見」嘅通告 PDF（逐份發佈時已篩過一次）',
    exclude: '未設為可見嘅通告、報名表格、成員名單、內部紀錄',
  },
};

export default function PublicScopePanel(props: {
  card: PublicCardId;
  s: AppState;
  adminTier: boolean;
  ownBranchId: string;
  onSaved: (next: AppState) => void;
  /** 顯示邊啲支部：管理層＝全部；支部領袖＝自己支部 */
  branchIds?: string[];
}) {
  const { card, s, adminTier, ownBranchId, onSaved } = props;
  const copy = CARD_COPY[card];
  const { confirm } = useConfirm();
  const [busy, setBusy] = useState('');

  const list = adminTier ? branches : branches.filter(b => b.id === ownBranchId);
  if (list.length === 0) return null;

  const masterOn = publicViewEnabled(s.config);
  const effective = cardEffective(s.config, card);
  const openNames = openScopes(s.config, card)
    .map(id => id === TROOP_SCOPE ? '全旅' : (branches.find(b => b.id === id)?.name || id));

  async function toggle(scopeId: string, label: string, next: boolean) {
    const ok = await confirm({
      title: next ? `確認公開${copy.name}：${label}` : `確認取消公開${copy.name}：${label}`,
      message: kv([
        ['卡片', `${copy.icon} ${copy.name}`],
        ['範圍', label],
        ['變更後', next ? '🟢 公開：未登入訪客可睇到' : '🔴 唔公開：訪客唔會見到'],
        ['公開內容', copy.scope],
        ['唔包括', copy.exclude],
        ...(next ? [] : [['提示', '已訂閱／已儲存嘅用戶會即時停止收到呢個範圍嘅內容。'] as [string, string]]),
      ]),
      confirmLabel: '確認',
    });
    if (!ok) return;
    setBusy(scopeId);
    try { onSaved(await apiSetPublicScope({ card, scope: scopeId, enabled: next })); }
    catch { /* 錯誤由上層顯示 */ }
    finally { setBusy(''); }
  }

  const Row = (p: { scopeId: string; label: string; sub: string; hero?: boolean }) => {
    const on = scopeOpen(s.config, card, p.scopeId);
    const isBusy = busy === p.scopeId;
    return (
      <div className={`rounded-xl border px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap ${p.hero ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="min-w-0">
          <p className="m-0 font-bold text-slate-800">{p.label}</p>
          <p className={`m-0 mt-0.5 text-[13px] ${p.hero ? 'text-slate-600' : 'text-slate-500'}`}>{on ? p.sub.replace('🔒', '🟢') : p.sub.replace('🟢', '🔒')}</p>
        </div>
        <button className={`btn ${on ? '' : 'primary'}`} disabled={isBusy}
          onClick={() => toggle(p.scopeId, p.label, !on)}>
          {isBusy ? '處理中...' : on ? copy.closeLabel : (p.scopeId === TROOP_SCOPE ? `公開全旅${copy.name}` : copy.openLabel)}
        </button>
      </div>
    );
  };

  return (
    <section className="card stack">
      <h3>🌐 公開{copy.name}範圍</h3>
      <p className="muted m-0">
        管理員喺系統設定開咗<strong>「{copy.name}」卡</strong>只係開放呢個功能；
        入面每一項內容仲要各自開放 ——
        <strong>全旅內容由管理層決定</strong>，<strong>各支部內容由該支部團長／支部領袖決定</strong>。
        全部範圍都關晒 → 呢張卡等於重新關閉，要再由管理員開返。
      </p>

      {!masterOn && (
        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          ⚠️ 管理員而家<strong>未開放「公開瀏覽」</strong>（系統設定 → 🌐 公開瀏覽），
          所以就算下面開咗，訪客仍然乜都睇唔到。要先請管理員開總掣。
        </p>
      )}

      <div className="stack">
        {/* 全旅內容 —— 只有管理層可以改 */}
        {adminTier && (
          <Row hero scopeId={TROOP_SCOPE} label={`🏕️ 全旅${copy.name}`}
            sub={scopeOpen(s.config, card, TROOP_SCOPE) ? copy.troopOn : copy.troopOff} />
        )}
        {list.map(b => (
          <Row key={b.id} scopeId={b.id} label={b.name}
            sub={scopeOpen(s.config, card, b.id) ? copy.branchOn : copy.branchOff} />
        ))}
      </div>

      <p className="muted m-0 text-[12px]">
        {adminTier
          ? <>{copy.name}卡而家公開嘅範圍：<strong>{openNames.join('、') || '（全部關閉＝卡片等於未開）'}</strong></>
          : '你只可以設定自己支部嘅範圍；全旅內容由管理層決定。'}
        {!effective && masterOn && ` ⚠️ ${copy.name}卡所有範圍都關咗，卡片等於未開。`}
      </p>
    </section>
  );
}
