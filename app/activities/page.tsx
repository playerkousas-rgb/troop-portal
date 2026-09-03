'use client';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { AppState, loadStateSlice, eventCategory } from '@/lib/store';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { publicViewEnabled } from '@/lib/model';
import { isItemPublic } from '@/lib/publicScope';
import PublicLocked from '@/components/ui/PublicLocked';

export default function Activities() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'all' | 'internal' | 'district'>('all');

  useEffect(() => { loadStateSlice(['events']).then(setS).catch(e => setErr(e.message)) }, []);

  // 家長／成員上方統計嘅「區地域總會」用 ?tab=district 直接跳入外部活動清單
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'district' || t === 'internal' || t === 'all') setFilter(t as any);
  }, []);

  if (err) return <main className="max-w-4xl mx-auto px-4 py-8 pb-24"><p className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 font-bold m-0 whitespace-pre-wrap">{err}</p></main>;
  if (!s) return <main className="max-w-4xl mx-auto px-4 py-8 pb-24 text-sm text-slate-600">載入中...</main>;

  const session = getSession();
  // 旅團管理員可以關閉公開瀏覽 → 未登入乜都睇唔到
  if (!session && !publicViewEnabled(s.config)) return <PublicLocked troopName={s.config?.TROOP_NAME} />;

  /**
   * ★ 未登入訪客要過「活動」公開卡（2026-09-03 用戶決定）。
   *
   * 之前呢頁**完全冇消費任何公開卡** —— 只用咗 L0 嘅 `publicViewEnabled`
   * （全旅公開總開關），冇做 L1（卡片）／L2（支部範圍）過濾。
   * 對照 `/calendar` 一直有做（`isItemPublic(s.config,'calendar',e.branchId)` ×4）。
   * 結果：管理員關咗卡、或者某支部領袖未同意公開，訪客喺「🎯 活動」掣
   * 一樣睇到晒 —— 三張公開卡入面有一張係完全冇效力嘅。
   *
   * 用戶決定：第三張卡由「通告 📄」改成「活動 🎯」
   * （「應該沒有 NOTICE 卡的，也只有活動管理，根本沒有通告管理，
   *   通告是由活動管理去上載的」）。
   *
   * 登入後唔過濾 —— 同 `/calendar` 一致：公開卡只管未登入訪客睇到乜。
   */
  const published = s.events.filter(e => e.status === 'published'   // 'archived'（過期通告）唔會顯示畀成員
    && (!!session || isItemPublic(s.config, 'activities', e.branchId)));
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
      <p className="text-sm text-slate-500 m-0 -mt-2">活動統一分成兩類：旅團活動（內部）與 區地域總會活動（外部）。登入後可回覆參加／不參加。</p>

      {/* 篩選 chips */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {([
          { id: 'all' as const, label: '全部' },
          { id: 'internal' as const, label: '🏠 旅團活動' },
          { id: 'district' as const, label: '🗺️ 區地域總會活動' },
        ]).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-sm px-2.5 py-1 rounded-full font-bold whitespace-nowrap border cursor-pointer ${filter === f.id ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon="📅"
            title={filter === 'district' ? '暫無區地域總會活動' : filter === 'internal' ? '暫無旅團活動' : '暫無已發布活動'}
            desc={filter === 'district'
              ? '領袖引入區／地域／總會通告後，會自動顯示在這裡（自行報名，旅團不代收費用）。'
              : '旅團活動發布後會自動顯示在這裡。'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {visible.map(e => (
            <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 card-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm px-1.5 py-0.5 rounded font-bold ${eventCategory(e) === 'district' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                      {eventCategory(e) === 'district' ? '🗺️ 區地域總會活動' : '🏠 旅團活動'}
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
              <div className="flex flex-wrap gap-1.5 mt-2">
                {e.noticeUrl && <a href={e.noticeUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-2.5 py-1.5 no-underline">📄 查看通告</a>}
                {e.paymentUrl && <a href={e.paymentUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5 no-underline">🔗 報名／付款</a>}
                {session && eventCategory(e) === 'self' && (
                  <Link href={session.role === 'parent' ? '/parent' : session.role === 'member' ? '/member' : '/admin/events'} className="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 no-underline">
                    {session.role === 'member' || session.role === 'parent' ? '✅ 返回活動回覆' : '⚙️ 管理活動'}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
