'use client';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { AppState, loadStateSlice, eventCategory } from '@/lib/store';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { publicViewEnabled } from '@/lib/model';
import PublicLocked from '@/components/ui/PublicLocked';

export default function Activities() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'all' | 'internal' | 'library'>('all');

  useEffect(() => { loadStateSlice(['events']).then(setS).catch(e => setErr(e.message)) }, []);

  if (err) return <main className="max-w-4xl mx-auto px-4 py-8 pb-24"><p className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 font-bold m-0 whitespace-pre-wrap">{err}</p></main>;
  if (!s) return <main className="max-w-4xl mx-auto px-4 py-8 pb-24 text-sm text-slate-600">載入中...</main>;

  const session = getSession();
  // 旅團管理員可以關閉公開瀏覽 → 未登入乜都睇唔到
  if (!session && !publicViewEnabled(s.config)) return <PublicLocked troopName={s.config?.TROOP_NAME} />;

  const published = s.events.filter(e => e.status === 'published'); // 'archived'（過期通告）唔會顯示畀成員
  const visible = published.filter(e =>
    filter === 'all' ? true
    : filter === 'internal' ? eventCategory(e) === 'self'
    : eventCategory(e) === 'district');

  return (
    <main className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-bold text-xl m-0">🎯 活動</h1>
        {!session && <Link href="/login" className="no-underline text-sm font-bold bg-brand-600 text-white px-3 py-2 rounded-xl hover:bg-brand-700 transition">登入查看詳情</Link>}
      </div>
      <p className="text-sm text-slate-500 m-0 -mt-2">活動統一分成兩類：自行舉辦 與 區地域總會活動。登入後可回覆參加／不參加。</p>

      {/* 篩選 chips */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {([
          { id: 'all' as const, label: '全部' },
          { id: 'internal' as const, label: '🏠 自行舉辦' },
          { id: 'library' as const, label: '🗺️ 區地域總會活動' },
        ]).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-sm px-2.5 py-1 rounded-full font-bold whitespace-nowrap border cursor-pointer ${filter === f.id ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState icon="📅" title="暫無已發布活動" desc="旅團活動發布後會自動顯示在這裡。" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {visible.map(e => (
            <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 card-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm px-1.5 py-0.5 rounded font-bold ${eventCategory(e) === 'district' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                      {eventCategory(e) === 'district' ? '🗺️ 區地域總會活動' : '🏠 自行舉辦'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-800 m-0 mt-1.5">{e.title}</h3>
                </div>
              </div>
              <p className="text-sm text-slate-500 m-0 mt-1.5">
                {e.date} · {e.location || '待定'}
                {e.source ? ` · ${e.source}` : ''}
                {e.fee ? ` · ${e.fee}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
