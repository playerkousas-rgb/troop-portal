'use client';
import { useEffect, useState } from 'react';
import { AppState, loadStateSlice, PluginCard, PluginSetting } from '@/lib/store';
import { apiSavePluginSetting, apiTogglePluginStatus, apiSaveConfig } from '@/lib/api';
import Auth from '@/components/Auth';
import Link from 'next/link';
import { isCoreNotPlugin } from '@/lib/attendance';
import { useConfirm, kv } from '@/components/ConfirmProvider';

const FOLDER_FIELDS = [
  { key: 'ANNOUNCEMENT_FOLDER_ID', label: '通告 PDF 資料夾 ID' },
  { key: 'MEETINGS_FOLDER_ID', label: '會議文件資料夾 ID' },
];

/**
 * 單位元件設定 —— 每個元件有清楚開／關狀態；Drive 資料夾設定亦可在此設定。
 */
export default function PluginManagementPage() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [settingDrafts, setSettingDrafts] = useState<Record<string, Partial<PluginSetting>>>({});
  const [folderDrafts, setFolderDrafts] = useState<Record<string, string>>({});
  const { confirm } = useConfirm();

  useEffect(() => {
    loadStateSlice(['plugins', 'pluginSettings', 'config']).then(st => {
      setS(st);
      const drafts: Record<string, Partial<PluginSetting>> = {};
      (st.plugins || []).forEach(p => {
        const setting = st.pluginSettings?.find(ps => ps.pluginId === p.id);
        drafts[p.id] = {
          frontendUrl: setting?.frontendUrl || p.url || '',
          backendUrl: setting?.backendUrl || '',
          apiKey: setting?.apiKey || '',
        };
      });
      setSettingDrafts(drafts);
      setFolderDrafts({
        ANNOUNCEMENT_FOLDER_ID: st.config.ANNOUNCEMENT_FOLDER_ID || '',
        MEETINGS_FOLDER_ID: st.config.MEETINGS_FOLDER_ID || '',
      });
    }).catch(e => setErr(e.message));
  }, []);

  async function saveSettings(pluginId: string, fields: Partial<PluginSetting>) {
    const plugin = s?.plugins.find(p => p.id === pluginId);
    const ok = await confirm({
      title: '確認儲存元件設定',
      message: kv([
        ['元件', plugin?.title || pluginId],
        ...Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => [({ frontendUrl: '前端 URL', backendUrl: '後端 Apps Script URL', apiKey: 'API Key', note: '備註' } as Record<string, string>)[k] || k, String(v)] as [string, string]),
      ]),
      confirmLabel: '確認儲存',
    });
    if (!ok) return;
    setErr(''); setOk(''); setLoadingId(pluginId + '-save');
    try {
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
    const p = s?.plugins.find(x => x.id === pluginId);
    const ok = await confirm({
      title: p?.enabled ? '確認停用元件' : '確認啟用元件',
      message: kv([['元件', p?.title || pluginId], ['變更後狀態', p?.enabled ? '🔴 已停用' : '🟢 開啟中']]),
      confirmLabel: '確認',
    });
    if (!ok) return;
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

  async function saveFolders() {
    if (!s) return;
    const changed = Object.entries(folderDrafts).filter(([k, v]) => String(v ?? '').trim() !== (s.config[k] || '').trim());
    if (changed.length === 0) { setOk('✅ 沒有變更需要儲存'); return; }
    const ok = await confirm({
      title: '確認儲存 Drive 資料夾設定',
      message: kv(changed.map(([k, v]) => [{ ANNOUNCEMENT_FOLDER_ID: '通告 PDF 資料夾 ID', MEETINGS_FOLDER_ID: '會議文件資料夾 ID' }[k] || k, v] as [string, string])),
      confirmLabel: '確認儲存',
    });
    if (!ok) return;
    setErr(''); setOk('');
    try {
      let f = s;
      for (const [k, v] of changed) f = await apiSaveConfig(k, String(v ?? '').trim());
      setS(f); setOk('✅ 已儲存資料夾設定');
    } catch (e: any) { setErr(e.message); }
  }

  if (!s) return <div className="card">載入中...</div>;

  return (
    <Auth roles={['super_admin', 'troop_leader', 'admin']}>
      <div className="stack">
        <section className="hero">
          <span className="badge gold">單位元件設定</span>
          <h1>🔌 單位元件設定</h1>
          <p>每個元件可獨立開／關（狀態即時清楚顯示）。填寫後端網址與 API Key，並在此設定各 Drive 資料夾。</p>
          <div className="row" style={{ marginTop: 8 }}>
            <Link className="btn gold" href="/marketplace">🧩 元件市場</Link>
            <Link className="btn" href="/connectors">🔀 轉駁中心</Link>
          </div>
        </section>

        {err && <p className="badge red">{err}</p>}
        {ok && <p className="badge green">{ok}</p>}

        <section className="stack">
          {s.plugins.filter(p => !isCoreNotPlugin(p.id)).length === 0 ? (
            <div className="card"><p className="muted">尚未安裝任何擴充元件。請先到「元件市場」查看。簽到／點名已內建，無需在此安裝。</p></div>
          ) : (
            s.plugins.filter(p => !isCoreNotPlugin(p.id)).map(p => {
              return (
                <div key={p.id} className="card stack" style={{ borderLeft: p.enabled ? '5px solid #34a853' : '5px solid #ea4335' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div className="row">
                      <span style={{ fontSize: '1.5rem' }}>{p.icon}</span>
                      <h3 style={{ margin: 0 }}>{p.title}</h3>
                      <span className={`badge ${p.tier === 2 ? 'green' : 'purple'}`}>Tier {p.tier}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStatus(p.id)}
                      disabled={loadingId === p.id + '-toggle'}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 border-2 font-black cursor-pointer transition disabled:opacity-60 ${
                        p.enabled ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-slate-50 border-slate-300 text-slate-600'
                      }`}
                    >
                      <span aria-hidden>{p.enabled ? '🟢' : '🔴'}</span>
                      {p.enabled ? '開啟中' : '已停用'}
                      <span
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${p.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        aria-hidden
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${p.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </span>
                    </button>
                  </div>

                  {p.tier === 3 && (
                    <div className="stack" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>⚙️ 後端連結設定（修改後按「儲存」才寫入）</p>
                      <label>前端 URL
                        <input
                          value={settingDrafts[p.id]?.frontendUrl ?? ''}
                          placeholder="例如：https://vs-tracker.vercel.app"
                          onChange={e => setSettingDrafts(prev => ({ ...prev, [p.id]: { ...prev[p.id], frontendUrl: e.target.value } }))}
                        />
                      </label>
                      <label>後端 Apps Script URL
                        <input
                          value={settingDrafts[p.id]?.backendUrl ?? ''}
                          placeholder="https://script.google.com/macros/s/.../exec"
                          onChange={e => setSettingDrafts(prev => ({ ...prev, [p.id]: { ...prev[p.id], backendUrl: e.target.value } }))}
                        />
                      </label>
                      <label>元件 API Key
                        <input
                          type="password"
                          value={settingDrafts[p.id]?.apiKey ?? ''}
                          placeholder="填入元件專用的安全金鑰"
                          onChange={e => setSettingDrafts(prev => ({ ...prev, [p.id]: { ...prev[p.id], apiKey: e.target.value } }))}
                        />
                      </label>
                      <button
                        className="btn primary"
                        disabled={loadingId === p.id + '-save'}
                        onClick={() => saveSettings(p.id, settingDrafts[p.id] || {})}
                      >💾 儲存元件設定</button>
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

        {/* Drive 資料夾設定（也可在本身頁面設定，如會議管理／公告頁） */}
        <section className="card stack">
          <h3 className="m-0">🗂 Drive 資料夾設定</h3>
          <p className="muted m-0">各資料夾設定亦可在本身頁面設定（例如會議管理、通告頁）。資料夾需設為「知道連結的人都可檢視」。</p>
          <div className="grid">
            {FOLDER_FIELDS.map(f => (
              <label key={f.key}>
                <span><b>{f.label}</b> <span className="muted">{f.key}</span></span>
                <input
                  value={folderDrafts[f.key] ?? ''}
                  placeholder="貼上資料夾 ID 或完整 URL"
                  onChange={e => setFolderDrafts(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <button className="btn primary" onClick={saveFolders}>💾 儲存資料夾設定</button>
        </section>
      </div>
    </Auth>
  );
}
