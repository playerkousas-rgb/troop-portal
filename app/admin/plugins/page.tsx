'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState, PluginCard, PluginSetting } from '@/lib/store';
import { apiSavePluginSetting, apiTogglePluginStatus } from '@/lib/api';
import Auth from '@/components/Auth';
import { isCoreNotPlugin } from '@/lib/attendance';

export default function PluginManagementPage() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => { loadState().then(setS).catch(e => setErr(e.message)) }, []);

  async function saveSettings(pluginId: string, fields: Partial<PluginSetting>) {
    setErr(''); setOk(''); setLoadingId(pluginId + '-save');
    try {
      const plugin = s?.plugins.find(p => p.id === pluginId);
      const setting = s?.pluginSettings?.find(ps => ps.pluginId === pluginId) || { pluginId };
      
      const fresh = await apiSavePluginSetting({
        pluginId,
        title: plugin?.title,
        icon: plugin?.icon,
        tier: plugin?.tier,
        ...setting,
        ...fields
      });
      setS(fresh);
      setOk('✅ 已更新元件設定');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoadingId(null);
    }
  }

  async function toggleStatus(pluginId: string) {
    setErr(''); setLoadingId(pluginId + '-toggle');
    try {
      const fresh = await apiTogglePluginStatus(pluginId);
      setS(fresh);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoadingId(null);
    }
  }

  if (!s) return <div className="card">載入中...</div>;

  return (
    <Auth roles={['admin', 'super_admin', 'troop_super']}>
      <div className="stack">
        <section className="hero">
          <span className="badge gold">管理員工具</span>
          <h1>🧩 元件管理</h1>
          <p>管理已安裝的元件，並直接在此填寫後端網址與 API Key。</p>
        </section>

        {err && <p className="badge red">{err}</p>}
        {ok && <p className="badge green">{ok}</p>}

        <section className="stack">
          {s.plugins.filter(p => !isCoreNotPlugin(p.id)).length === 0 ? (
            <div className="card"><p className="muted">尚未安裝任何擴充元件。請先到「元件市場」查看。簽到／點名已內建，無需在此安裝。</p></div>
          ) : (
            s.plugins.filter(p => !isCoreNotPlugin(p.id)).map(p => {
              const setting = s.pluginSettings?.find(ps => ps.pluginId === p.id);
              return (
                <div key={p.id} className="card stack" style={{ borderLeft: p.enabled ? '4px solid #34a853' : '4px solid #ea4335' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div className="row">
                      <span style={{ fontSize: '1.5rem' }}>{p.icon}</span>
                      <h3 style={{ margin: 0 }}>{p.title}</h3>
                      <span className={`badge ${p.tier === 2 ? 'green' : 'purple'}`}>Tier {p.tier}</span>
                    </div>
                    <button 
                      className={`btn ${p.enabled ? 'red' : 'primary'}`} 
                      onClick={() => toggleStatus(p.id)}
                      disabled={loadingId === p.id + '-toggle'}
                    >
                      {p.enabled ? '停用' : '啟用'}
                    </button>
                  </div>

                  {p.tier === 3 && (
                    <div className="stack" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>⚙️ 後端連結設定</p>
                      <label>後端 Apps Script URL
                        <input 
                          defaultValue={setting?.backendUrl} 
                          placeholder="https://script.google.com/macros/s/.../exec"
                          onBlur={e => saveSettings(p.id, { backendUrl: e.target.value })}
                        />
                      </label>
                      <label>元件 API Key
                        <input 
                          type="password"
                          defaultValue={setting?.apiKey} 
                          placeholder="填入元件專用的安全金鑰"
                          onBlur={e => saveSettings(p.id, { apiKey: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  <div className="muted row" style={{ fontSize: '0.8rem' }}>
                    <span>ID: {p.id}</span>
                    {loadingId === p.id + '-save' && <span className="badge gold">儲存中...</span>}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </Auth>
  );
}
