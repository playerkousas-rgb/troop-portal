'use client';
import { useEffect, useState } from 'react';
import { loadStateSlice, AppState } from '@/lib/store';
import { canViewAlbum } from '@/lib/album';
import { getSession, Session } from '@/lib/session';
import EmptyState from '@/components/ui/EmptyState';

/**
 * 📷 相簿 —— 活動相簿統一喺呢度睇。
 *
 * ★ 相簿唔會再出現喺「回覆出席」嗰啲活動卡入面：活動未發生根本冇相，
 *   活動完咗之後張卡亦已經消失（封存），所以擺喺嗰度等於永遠都係空。
 *   領袖喺「活動管理」補相簿連結，成員／家長就喺呢一頁睇。
 * ★ 相簿涉及小朋友私隱，預設關閉：要團長／管理員開通 photos 權限先睇到。
 */
export default function AlbumsPage() {
  const [state, setState] = useState<AppState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    setSession(getSession());
    loadStateSlice(['events', 'members', 'userFeatures'])
      .then(setState)
      .catch(() => setState({ events: [] } as unknown as AppState));
  }, []);

  const me = (state?.members || []).find(m => m.id === session?.memberId);
  const ownBranchId = me?.branchId || session?.branchId || '';
  const albums = (state?.events || []).filter(e =>
    e.albumUrl && canViewAlbum({
      role: session?.role,
      userFeatures: state?.userFeatures,
      ownBranchId,
      eventBranchId: e.branchId,
    })
  );

  return <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
    <header>
      <h1 className="font-black text-xl m-0">📷 相簿</h1>
      <p className="text-sm text-slate-500 m-0 mt-1">活動完結後，領袖補上的相簿會在這裡出現，點擊直接開啟 Google Drive 或其他相簿位置。</p>
    </header>
    {!state
      ? <div className="bg-white rounded-2xl border p-4 text-sm text-slate-500">載入中...</div>
      : albums.length === 0
      ? <EmptyState icon="📷" title="暫時未有相簿" desc="活動舉行後，領袖在「活動管理」補上相簿連結，就會在這裡顯示。" />
      : <div className="space-y-2">{albums.map(e => (
          <a key={e.id} href={e.albumUrl} target="_blank" rel="noreferrer" className="block no-underline bg-white border border-slate-200 rounded-2xl p-4 hover:border-brand-300">
            <div className="font-bold text-sm text-slate-800">📷 {e.title}</div>
            <div className="text-sm text-slate-500 mt-1">{e.date || '日期待定'} · 開啟相簿 ↗</div>
          </a>
        ))}</div>}
  </main>;
}
