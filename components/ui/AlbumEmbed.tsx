'use client';
import { useState } from 'react';
import { resolveAlbum } from '@/lib/album';

/**
 * 活動相簿：內嵌得就喺 App 入面直接睇，內嵌唔到就顯示新分頁連結。
 * 預設收埋（相簿好食流量，尤其手機），撳「展開」先載入 iframe。
 */
export default function AlbumEmbed({ url, title }: { url?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const info = resolveAlbum(url || '');
  if (!info) return null;

  const canEmbed = info.kind === 'embed' && !!info.embedUrl;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 flex-wrap">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-lg leading-none" aria-hidden>📷</span>
          <span className="min-w-0">
            <span className="block font-bold text-sm text-slate-800 leading-tight">
              {title || '活動相簿'}
            </span>
            <span className="block text-sm text-slate-500">{info.platform}</span>
          </span>
        </span>

        <span className="flex items-center gap-2">
          {canEmbed && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="text-sm font-bold px-3 py-1.5 rounded-lg border border-violet-300 bg-white text-violet-700 hover:bg-violet-50 transition cursor-pointer"
            >
              {open ? '▲ 收合' : '▼ 睇相'}
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 no-underline hover:bg-slate-50 transition"
          >
            ↗ 新分頁
          </a>
        </span>
      </div>

      {open && canEmbed && (
        <div className="px-2.5 pb-2.5">
          <iframe
            src={info.embedUrl}
            title={title || '活動相簿'}
            className="w-full rounded-lg border border-violet-200 bg-white"
            style={{ height: 420 }}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
          <p className="text-sm text-slate-500 m-0 mt-1.5 leading-relaxed">
            ℹ️ 如果上面一片空白，代表該相簿平台唔准內嵌，請撳「↗ 新分頁」開啟。
          </p>
        </div>
      )}

      {!canEmbed && info.hint && (
        <p className="text-sm text-slate-600 m-0 px-3 pb-2.5 leading-relaxed">ℹ️ {info.hint}</p>
      )}
    </div>
  );
}
