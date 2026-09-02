'use client';
import { useEffect, useState } from 'react';
import { loadStateSlice, AppState } from '@/lib/store';
import EmptyState from '@/components/ui/EmptyState';

export default function AlbumsPage() {
  const [state, setState] = useState<AppState | null>(null);
  useEffect(() => { loadStateSlice(['events']).then(setState).catch(() => setState({ events: [] } as AppState)); }, []);
  const albums = (state?.events || []).filter(e => e.albumUrl);
  return <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
    <header><h1 className="font-black text-xl m-0">📷 相簿</h1><p className="text-sm text-slate-500 m-0 mt-1">選擇活動後直接開啟 Google Drive 或其他相簿位置。</p></header>
    {!state ? <div className="bg-white rounded-2xl border p-4 text-sm text-slate-500">載入中...</div> : albums.length === 0 ? <EmptyState icon="📷" title="暫時未有相簿" desc="領袖加入活動相簿連結後會在這裡顯示。" /> : <div className="space-y-2">{albums.map(e => <a key={e.id} href={e.albumUrl} target="_blank" rel="noreferrer" className="block no-underline bg-white border border-slate-200 rounded-2xl p-4 hover:border-brand-300"><div className="font-bold text-sm text-slate-800">📷 {e.title}</div><div className="text-sm text-slate-500 mt-1">{e.date || '日期待定'} · 開啟相簿 ↗</div></a>)}</div>}
  </main>;
}
