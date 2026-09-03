'use client';
import { useEffect, useMemo, useState } from 'react';
import { getTroopKey } from '@/lib/api';

/**
 * 「加入我的行事曆」—— 以**訂閱**為主（自動同步），下載 .ics 只係後備。
 *
 * 用戶反馈：下載再匯入比開 APP 睇更麻煩 → 所以呢度一撳就直接加入：
 *   ・Google 日曆：/calendar/render?cid=<feed> 一撳就加到（自動同步）
 *   ・Apple 日曆：webcal:// 一撳開 Calendar.app 並提示訂閱
 *   ・Outlook／其他：複製訂閱網址，貼去「新增日曆 → 從網址訂閱」
 *
 * feed 本身係公開嘅（Google 嘅伺服器唔會帶用戶 cookie），內容＝已公佈活動
 * ＋已啟用恆常集會，同未登入訪客喺 /calendar 睇到嘅完全一樣。
 */

export default function SubscribeCalendar({
  branchIds,
  count,
  onDownload,
  msg,
}: {
  /** 要 filter 嘅支部；空陣列＝全旅 */
  branchIds: string[];
  /** 用戶畫面而家睇到幾多項（用嚟提示訂閱版可能唔同） */
  count: number;
  onDownload: () => void;
  msg?: string;
}) {
  const [feedUrl, setFeedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // 抽做獨立變數：直接用 branchIds.join(',') 做 dependency 係「複雜表達式」，
  // ESLint 靜態分析唔到（react-hooks/exhaustive-deps），而且每次 render 都係新字串。
  const branchParam = branchIds.join(',');

  useEffect(() => {
    const u = new URL('/api/ics', window.location.origin);
    // 同全 app 一樣由 localStorage 攞目前旅團（lib/api.ts getTroopKey）
    const troopKey = getTroopKey();
    if (!troopKey) { setFeedUrl(''); return; }
    u.searchParams.set('troopKey', troopKey);
    if (branchParam) u.searchParams.set('branch', branchParam);
    setFeedUrl(u.toString());
  }, [branchParam]);

  const googleUrl = useMemo(
    () => (feedUrl ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedUrl)}` : ''),
    [feedUrl]
  );
  // ★ 要成個 scheme 一齊換：用 /^http/ 會把 https:// 變成 webcals://（多咗個 s），
  //   Calendar.app 認嘅係 webcal://
  const webcalUrl = useMemo(() => feedUrl.replace(/^https?:\/\//, 'webcal://'), [feedUrl]);

  async function copy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard 被擋 → 網址已經喺 input 顯示，用戶可以自己 copy */
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 m-0">📲 加入我的行事曆（自動同步）</p>
          <p className="text-xs text-slate-500 m-0 mt-0.5 leading-relaxed">
            訂閱之後旅團改咗活動，你自己嘅行事曆會自動跟住更新，唔使每次下載再匯入。
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {googleUrl && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm px-3 py-1.5 rounded-lg font-bold bg-brand-600 text-white no-underline hover:bg-brand-700 transition whitespace-nowrap"
            >
              ➕ 加入 Google 日曆
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="text-sm px-3 py-1.5 rounded-lg font-bold bg-white text-slate-600 border border-slate-200 cursor-pointer hover:border-brand-300 transition whitespace-nowrap"
          >
            {open ? '收起' : 'Apple／Outlook'}
          </button>
        </div>
      </div>

      {open && feedUrl && (
        <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
          <div>
            <p className="text-xs font-bold text-slate-600 m-0 mb-1">🍎 Apple 日曆（iPhone／Mac）</p>
            <a
              href={webcalUrl}
              className="inline-block text-sm px-3 py-1.5 rounded-lg font-bold bg-white text-brand-700 border border-brand-300 no-underline hover:bg-brand-50 transition"
            >
              一鍵訂閱（會開 Calendar.app）
            </a>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 m-0 mb-1">📧 Outlook／其他日曆</p>
            <p className="text-xs text-slate-500 m-0 mb-1.5 leading-relaxed">
              複製下面網址 → 日曆設定 →「新增日曆」→「從網址訂閱」貼上。
            </p>
            <div className="flex gap-1.5">
              <input
                readOnly
                value={feedUrl}
                onFocus={e => e.target.select()}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600"
              />
              <button
                type="button"
                onClick={copy}
                className="text-xs px-3 py-1.5 rounded-lg font-bold bg-slate-700 text-white border-0 cursor-pointer hover:bg-slate-800 transition whitespace-nowrap"
              >
                {copied ? '✓ 已複製' : '複製'}
              </button>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={onDownload}
              className="text-xs font-bold text-slate-500 bg-transparent border-0 p-0 cursor-pointer hover:text-brand-700 underline"
            >
              或者：一次過下載 .ics（唔會自動同步）
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400 m-0 mt-2 leading-relaxed">
        訂閱版內容＝已公佈活動＋已啟用恆常集會（同未登入訪客睇到嘅一樣）；
        未公佈活動同報名資料唔會入 feed。你畫面而家有 {count} 項。
      </p>
      {msg && <p className="text-xs font-bold text-emerald-700 m-0 mt-1.5">{msg}</p>}
    </div>
  );
}
