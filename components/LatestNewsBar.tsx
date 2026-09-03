'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppState, loadStateSlice, LatestNews } from '@/lib/store';
import { apiAddLatestNews, apiDeleteLatestNews } from '@/lib/api';
import { getSession } from '@/lib/session';
import { useConfirm, kv } from '@/components/ConfirmProvider';

const LEADER_ROLES = ['super_admin', 'troop_super', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach'];
// 這些頁面不顯示最新消息（未登入／平台資訊頁／MOCK 展示樹）
const HIDDEN_PATHS = ['/', '/login', '/setup', '/onboard', '/apply', '/downloads', '/troops', '/updates', '/marketplace', '/connectors'];

/**
 * 最新消息 BAR —— 登入後顯示在最上方（TopNav 之下）。
 * ★ 領袖直接點條 BAR 加入（最多 3 條）；領袖亦可刪除。
 * ★ 舊版「公告」已經完全併入呢條 BAR —— 全 APP 再冇公告嘅獨立管理／觀看頁。
 */
export default function LatestNewsBar() {
  const pathname = usePathname();
  const [news, setNews] = useState<LatestNews[] | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => {
    const s = getSession();
    if (!s) { setNews(null); setIsLeader(false); return; }
    setIsLeader(LEADER_ROLES.includes(s.role));
    loadStateSlice(['latestNews'])
      .then(st => setNews((st.latestNews || []).slice(0, 3)))
      .catch(() => setNews([]));
  }, [pathname]);

  // 未登入 / 隱藏頁面 / 尚未載入
  const hidden = HIDDEN_PATHS.some(p => pathname === p) || (pathname || '').startsWith('/dashboard');
  if (hidden || !news) return null;

  async function add() {
    const text = draft.trim();
    if (!text) { setErr('請填寫最新消息內容。'); return; }
    const ok = await confirm({
      title: '確認加入最新消息',
      message: kv([['消息內容', text], ['加入後總數', `${news.length + 1} 條（最多 3 條）`]]),
      confirmLabel: '確認加入',
    });
    if (!ok) return;
    setBusy(true); setErr('');
    try {
      const fresh = await apiAddLatestNews({ text }) as AppState;
      setNews((fresh.latestNews || []).slice(0, 3));
      setDraft('');
      setOpen(false);
    } catch (e: any) { setErr(e.message || String(e)); } finally { setBusy(false); }
  }

  async function remove(id: string, text: string) {
    const ok = await confirm({
      title: '確認刪除最新消息',
      message: kv([['將刪除', text]]),
      confirmLabel: '確認刪除',
      danger: true,
    });
    if (!ok) return;
    setBusy(true); setErr('');
    try {
      const fresh = await apiDeleteLatestNews(id) as AppState;
      setNews((fresh.latestNews || []).slice(0, 3));
    } catch (e: any) { setErr(e.message || String(e)); } finally { setBusy(false); }
  }

  return (
    <div className="px-3 sm:px-4 pt-2">
      <div className="max-w-6xl mx-auto rounded-2xl border border-amber-200 bg-amber-50/90 shadow-sm overflow-hidden">
        {/* ★ 多過 1 條就一行一條（用戶要求 #7）：
            舊版把所有消息塞在同一行做左右捲動，手機上根本睇唔到第 2、3 條。 */}
        <div
          className={`flex gap-2 px-3 py-2 select-none ${news.length > 1 ? 'items-start' : 'items-center'} ${isLeader ? 'cursor-pointer' : ''}`}
          onClick={() => { if (isLeader) { setOpen(o => !o); setErr(''); } }}
          title={isLeader ? '點擊加入最新消息（最多 3 條）' : undefined}
        >
          <span className="text-lg leading-none flex-shrink-0" aria-hidden>📣</span>
          <span className="font-black text-sm text-amber-800 flex-shrink-0 whitespace-nowrap">
            最新消息{news.length > 1 ? ` · ${news.length} 條` : ''}
          </span>

          {news.length === 0 ? (
            <span className="flex-1 min-w-0 text-sm text-amber-700/80">
              {isLeader ? '按一下條 BAR 加入第一條消息。' : '暫時沒有最新消息。'}
            </span>
          ) : news.length === 1 ? (
            <span className="flex-1 min-w-0 flex items-center gap-1 text-sm text-amber-900">
              <span className="truncate">{news[0].text}</span>
              {isLeader && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); remove(news[0].id, news[0].text); }}
                  className="text-amber-600 hover:text-rose-600 bg-transparent border-0 cursor-pointer px-0.5 flex-shrink-0"
                  title="刪除"
                  aria-label="刪除"
                >✕</button>
              )}
            </span>
          ) : (
            <ul className="flex-1 min-w-0 m-0 p-0 grid gap-1">
              {news.map(n => (
                <li key={n.id} className="flex items-start gap-1.5 text-sm text-amber-900 leading-snug">
                  <span className="text-amber-400 font-black flex-shrink-0" aria-hidden>•</span>
                  <span className="flex-1 min-w-0 break-words">{n.text}</span>
                  {isLeader && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); remove(n.id, n.text); }}
                      className="text-amber-600 hover:text-rose-600 bg-transparent border-0 cursor-pointer px-0.5 flex-shrink-0"
                      title="刪除"
                      aria-label="刪除"
                    >✕</button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isLeader && (
            <span className={`text-amber-700 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${news.length > 1 ? 'mt-0.5' : ''}`} aria-hidden>▼</span>
          )}
        </div>

        {/* 領袖加入面板 */}
        {isLeader && open && (
          <div className="border-t border-amber-200 bg-white/80 px-3 py-2.5 space-y-2">
            <p className="text-sm text-slate-600 font-bold m-0">
              加入最新消息（現有 {news.length}／最多 3 條）
            </p>
            <div className="flex gap-2 items-center">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="例如：下週集會改期至星期六 3:00pm"
                className="flex-1 rounded-xl border border-amber-300 px-3 py-2.5 text-base bg-white"
                maxLength={120}
              />
              <button
                type="button"
                onClick={add}
                disabled={busy || news.length >= 3}
                className="text-sm font-black text-white bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-xl border-0 cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {busy ? '加入中…' : '＋ 加入'}
              </button>
            </div>
            {news.length >= 3 && <p className="text-sm text-rose-600 font-bold m-0">已達 3 條上限，請先刪除一條。</p>}
            {err && <p className="text-sm text-rose-600 font-bold m-0">{err}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
