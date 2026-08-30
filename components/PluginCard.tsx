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
    };
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
  };

  const pluginUrl = buildUrl();

  if (!isEmbed) {
    return (
      <a href={pluginUrl} target="_blank" rel="noopener noreferrer" className="card feature-card">
        <h3>{plugin.icon} {plugin.title}</h3>
        <p className="muted">點擊開啟新分頁</p>
        <span className="btn block">進入</span>
      </a>
    );
  }

  return (
    <div className={`card stack plugin-card ${expanded ? 'expanded' : ''}`} style={{ gridColumn: expanded ? '1 / -1' : 'auto' }}>
      <div 
        onClick={() => setExpanded(!expanded)} 
        className="row" 
        style={{ cursor: 'pointer', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h3 style={{ margin: 0 }}>{plugin.icon} {plugin.title}</h3>
        <span>{expanded ? '▲ 收合' : '▼ 展開'}</span>
      </div>
      
      {expanded && (
        <div style={{ marginTop: '1rem', width: '100%' }}>
          <iframe
            src={pluginUrl}
            style={{ 
              width: '100%', 
              height: height, 
              border: '1px solid #eee', 
              borderRadius: '8px',
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
