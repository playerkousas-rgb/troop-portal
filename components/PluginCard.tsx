'use client';
import { useState, useEffect } from 'react';
import { PluginCard, PluginSetting } from '@/lib/store';
import { getSession } from '@/lib/session';

export default function PluginIframeCard({ 
  plugin, 
  settings, 
  unitCode 
}: { 
  plugin: PluginCard; 
  settings?: PluginSetting; 
  unitCode: string 
}) {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState('80vh');
  const session = getSession();

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'resize' && e.data?.height) {
        setHeight(e.data.height + 'px');
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const isEmbed = plugin.embed;
  const role = session?.role || 'guest';
  const ymis = session?.memberId || ''; // Using memberId as YMIS if it's a member

  // Build the URL with params
  const buildUrl = () => {
    const params = new URLSearchParams({
      u: unitCode,
      role: role,
      ymis: ymis,
      from: 'portal',
      embed: isEmbed ? '1' : '0'
    });

    let baseUrl = plugin.url;

    // For Tier 3 plugins, use unit-specific settings if available
    if (plugin.tier === 3 && settings) {
      if (settings.frontendUrl) baseUrl = settings.frontendUrl;
      if (settings.backendUrl) params.set('backend', settings.backendUrl);
      if (settings.apiKey) params.set('apikey', settings.apiKey);
    }

    // Safety check for empty URL
    if (!baseUrl) return '';

    return baseUrl.includes('?') ? `${baseUrl}&${params.toString()}` : `${baseUrl}?${params.toString()}`;
  }

  const pluginUrl = buildUrl();

  if (!isEmbed) {
    return (
      <a
        href={pluginUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline text-inherit rounded-xl border border-violet-200 bg-violet-50/60 hover:bg-white hover:border-violet-300 hover:shadow-sm transition p-2.5 flex items-center gap-2.5"
      >
        <span className="text-lg leading-none flex-shrink-0" aria-hidden>{plugin.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-xs text-slate-800 leading-tight truncate">{plugin.title}</span>
          <span className="block text-[13px] text-slate-500">點擊開啟新分頁 ↗</span>
        </span>
      </a>
    );
  }

  return (
    <div
      className={`rounded-xl border border-violet-200 bg-white overflow-hidden ${expanded ? 'shadow-sm' : ''}`}
      style={{ gridColumn: expanded ? '1 / -1' : 'auto' }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2.5 bg-white hover:bg-violet-50/60 transition text-left cursor-pointer"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg leading-none flex-shrink-0" aria-hidden>{plugin.icon}</span>
          <span className="min-w-0">
            <span className="block font-bold text-xs text-slate-800 leading-tight truncate">{plugin.title}</span>
            <span className="block text-[13px] text-slate-500">內嵌開啟</span>
          </span>
        </span>
        <span className="text-[13px] font-bold text-violet-700 whitespace-nowrap flex-shrink-0">
          {expanded ? '▲ 收合' : '▼ 展開'}
        </span>
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5">
          <iframe
            src={pluginUrl}
            style={{ 
              width: '100%', 
              height: height, 
              border: '1px solid #e9d5ff', 
              borderRadius: '10px',
              background: '#fff' 
            }}
            allow="clipboard-write"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
