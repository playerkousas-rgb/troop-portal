'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState, PluginCard, PluginSetting } from '@/lib/store';
import { apiSavePluginSetting } from '@/lib/api';
import Link from 'next/link';

export default function PluginSettingsPage() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { loadState().then(setS).catch(e => setErr(e.message)) }, []);

  async function save(pluginId: string, fields: Partial<PluginSetting>) {
    setErr(''); setOk(''); setSaving(pluginId);
    try {
      const current = s?.pluginSettings?.find(ps => ps.pluginId === pluginId) || { pluginId };
      const fresh = await apiSavePluginSetting({ ...current, ...fields });
      setS(fresh);
      setOk('✅ 已儲存 ' + pluginId);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(null);
    }
  }

  if (!s) return <div className="card">載入中...</div>;

  const tier3Plugins = s.plugins.filter(p => p.tier === 3);

  return (
    <div className="stack">
      <section className="hero">
        <span className="badge gold">系統設定</span>
        <h1>單位元件設定</h1>
        <p>為第 3 級元件填寫後端 URL 和 API Key。</p>
      </section>

      {err && <p className="badge red">{err}</p>}
      {ok && <p className="badge green">{ok}</p>}

      {tier3Plugins.length === 0 ? (
        <section className="card">
          <p className="muted">目前沒有已安裝的第 3 級元件。請先到「元件市場」安裝。</p>
          <Link href="/marketplace" className="btn primary">前往元件市場</Link>
        </section>
      ) : (
        <section className="stack">
          {tier3Plugins.map(p => {
            const setting = s.pluginSettings?.find(ps => ps.pluginId === p.id) || { pluginId: p.id };
            return (
              <div key={p.id} className="card stack">
                <h3>{p.icon} {p.title} <span className="badge">Tier 3</span></h3>
                <label>前端 URL
                  <input 
                    defaultValue={setting.frontendUrl || p.url} 
                    onBlur={e => save(p.id, { frontendUrl: e.target.value })}
                    placeholder="例如：https://vs-tracker.vercel.app"
                  />
                </label>
                <label>後端 Apps Script URL (後端)
                  <input 
                    defaultValue={setting.backendUrl} 
                    onBlur={e => save(p.id, { backendUrl: e.target.value })}
                    placeholder="例如：https://script.google.com/macros/s/.../exec"
                  />
                </label>
                <label>API Key
                  <input 
                    type="password"
                    defaultValue={setting.apiKey} 
                    onBlur={e => save(p.id, { apiKey: e.target.value })}
                    placeholder="元件專用安全鎖"
                  />
                </label>
                {saving === p.id && <p className="muted">儲存中...</p>}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
