'use client';
import { useEffect, useMemo, useState } from 'react';
import { loadStateSlice, AppState } from '@/lib/store';
import { apiUpdateEvent } from '@/lib/api';
import { canViewAlbum, resolveAlbum } from '@/lib/album';
import { getSession, Session } from '@/lib/session';
import { isLeaderOrAbove, publicViewEnabled } from '@/lib/model';
import { hasFeature } from '@/lib/permissions';
import { isItemPublic, cardEffective } from '@/lib/publicScope';
import PublicLocked from '@/components/ui/PublicLocked';
import EmptyState from '@/components/ui/EmptyState';
import { useConfirm, kv } from '@/components/ConfirmProvider';

/**
 * 📷 相簿 —— 活動相簿統一喺呢度睇，領袖亦喺呢度補相簿連結。
 *
 * ★ 相簿唔會再出現喺「活動管理」入面（用戶要求 #2）：
 *   通告係活動**之前**先出現，相片係活動**之後**先有，兩者唔會同時存在。
 *   所以「活動管理」只管通告，相簿就放喺呢一頁（活動完結後補上）。
 * ★ 相簿涉及小朋友私隱，預設關閉：要團長／管理員開通 photos 權限先睇到／先改到。
 */

/** 貼連結時即時提示：呢個平台內嵌唔內嵌得（唔好等到家長撳開先發現一片空白） */
function AlbumHint({ url }: { url: string }) {
  const info = resolveAlbum(url);
  if (!info) return null;
  const ok = info.kind === 'embed' && !info.hint;
  return (
    <p
      className="text-sm font-semibold leading-relaxed m-0 mt-1"
      style={{ color: ok ? '#15803d' : '#b45309' }}
    >
      {ok ? `✅ ${info.platform}：可以喺 APP 內直接睇相` : `⚠️ ${info.platform}：${info.hint || '未必內嵌到'}`}
    </p>
  );
}

export default function AlbumsPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pickEventId, setPickEventId] = useState('');
  const [url, setUrl] = useState('');
  const { confirm } = useConfirm();

  useEffect(() => {
    setSession(getSession());
    loadStateSlice(['events', 'members', 'userFeatures', 'config'])
      .then(setState)
      .catch(() => setState({ events: [] } as unknown as AppState));
  }, []);

  const me = (state?.members || []).find(m => m.id === session?.memberId);
  const ownBranchId = me?.branchId || session?.branchId || '';

  const canManage = isLeaderOrAbove(session?.role) && hasFeature(state?.userFeatures, 'photos', session?.role);

  /* ★ 三層公開模型（lib/publicScope.ts）：
     ・已登入 → 照舊用 canViewAlbum（photos 功能＋支部範圍）
     ・未登入訪客 → 用「相簿」卡：管理員開咗卡 ＋ 該內容 scope（全旅／該支部）已公開
       例：相簿卡開咗、scope = troop,b2 → 訪客只睇到全旅＋b2 嘅相簿 */
  const isGuest = !session || session.role === 'guest';
  const albums = (state?.events || []).filter(e => {
    if (!e.albumUrl) return false;
    if (e.status !== 'published' && e.status !== 'archived') return false;
    if (isGuest) return isItemPublic(state?.config, 'albums', e.branchId);
    return canViewAlbum({
      role: session?.role,
      userFeatures: state?.userFeatures,
      ownBranchId,
      eventBranchId: e.branchId,
    });
  });

  // 領袖補相簿：列出已發布／已封存嘅活動（相片通常係活動之後先有，所以由近至遠排）
  const attachable = useMemo(
    () => (state?.events || [])
      .filter(e => e.status === 'published' || e.status === 'archived')
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [state]
  );

  async function save() {
    if (!pickEventId) { setErr('請先選擇活動。'); return; }
    const link = url.trim();
    if (!/^https?:\/\/.+/i.test(link)) { setErr('請貼上完整相簿連結（要 http:// 或 https:// 開頭）。'); return; }
    const ev = (state?.events || []).find(e => e.id === pickEventId);
    const ok = await confirm({
      title: '確認加入活動相簿',
      message: kv([['活動', ev?.title || pickEventId], ['相簿連結', link]]),
      confirmLabel: '確認加入',
    });
    if (!ok) return;
    setBusy(true); setErr('');
    try {
      setState(await apiUpdateEvent({ eventId: pickEventId, albumUrl: link }));
      setPickEventId(''); setUrl('');
    } catch (e: any) { setErr(e?.message || String(e)); } finally { setBusy(false); }
  }

  async function remove(id: string, title: string) {
    const ok = await confirm({
      title: '確認移除相簿連結',
      message: kv([['活動', title], ['提示', '成員／家長將睇唔到呢個相簿']]),
      confirmLabel: '確認移除',
      danger: true,
    });
    if (!ok) return;
    setBusy(true); setErr('');
    try {
      setState(await apiUpdateEvent({ eventId: id, albumUrl: '' }));
    } catch (e: any) { setErr(e?.message || String(e)); } finally { setBusy(false); }
  }

  /* 訪客：公開瀏覽總掣關咗，或者「相簿」卡未開／範圍全關 → 明確話佢知未開放 */
  if (isGuest && (!publicViewEnabled(state?.config) || !cardEffective(state?.config, 'albums'))) {
    return <PublicLocked troopName={state?.config?.TROOP_NAME} />;
  }

  return <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
    <header>
      <h1 className="font-black text-xl m-0">📷 相簿</h1>
      <p className="text-sm text-slate-500 m-0 mt-1">
        活動完結後，領袖喺呢一頁補上相簿連結，成員及家長就會喺呢度睇到（點擊直接開啟 Google Drive 或其他相簿位置）。
      </p>
    </header>

    {err && <p className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 m-0">{err}</p>}

    {/* 領袖：補相簿連結（原嚟喺「活動管理」，而家搬過嚟 —— 活動完結後先会有相） */}
    {canManage && (
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
        <h2 className="font-black text-base text-slate-800 m-0">＋ 補上活動相簿連結</h2>
        <p className="text-sm text-slate-500 m-0">揀返個活動，貼上 Google Drive 資料夾／相簿連結即可。</p>
        <select
          value={pickEventId}
          onChange={e => setPickEventId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base bg-white"
        >
          <option value="">選擇活動…</option>
          {attachable.map(e => (
            <option key={e.id} value={e.id}>
              {e.date || '未定日期'} · {e.title}{e.albumUrl ? '（已有相簿，會覆蓋）' : ''}
            </option>
          ))}
        </select>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/…"
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base bg-white"
        />
        <AlbumHint url={url} />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="text-sm font-black text-white bg-brand-600 hover:bg-brand-700 px-4 py-2.5 rounded-xl border-0 cursor-pointer disabled:opacity-60"
        >
          {busy ? '儲存中…' : '儲存相簿連結'}
        </button>
      </section>
    )}

    {!state
      ? <div className="bg-white rounded-2xl border p-4 text-sm text-slate-500">載入中...</div>
      : albums.length === 0
      ? <EmptyState
          icon="📷"
          title="暫時未有相簿"
          desc={canManage
            ? '活動舉行後，用上面嘅表單補上相簿連結，就會在這裡顯示。'
            : '活動舉行後，領袖補上相簿連結，就會在這裡顯示。'}
        />
      : <div className="space-y-2">{albums.map(e => (
          <div key={e.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-brand-300">
            <a href={e.albumUrl} target="_blank" rel="noreferrer" className="block no-underline text-inherit">
              <div className="font-bold text-sm text-slate-800">📷 {e.title}</div>
              <div className="text-sm text-slate-500 mt-1">{e.date || '日期待定'} · 開啟相簿 ↗</div>
            </a>
            {canManage && (
              <button
                type="button"
                onClick={() => remove(e.id, e.title)}
                disabled={busy}
                className="mt-2 text-sm font-bold text-rose-600 bg-transparent border-0 cursor-pointer px-0 disabled:opacity-60"
              >
                移除相簿連結
              </button>
            )}
          </div>
        ))}</div>}
  </main>;
}
