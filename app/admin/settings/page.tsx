'use client';
import { useEffect, useState } from 'react';
import { AppState, loadStateSlice } from '@/lib/store';
import { apiSaveConfig, apiTogglePluginStatus } from '@/lib/api';
import Link from 'next/link';
import Auth from '@/components/Auth';

const FRIENDLY_LABELS: Record<string, string> = {
  TROOP_CODE: '旅團號碼',
  TROOP_NAME: '旅團名稱',
  ADMIN_EMAIL: '主要管理員 Email',
  ADMIN_DEFAULT_PASSWORD: '預設管理員密碼',
  ANNOUNCEMENT_FOLDER_ID: '公告 PDF Drive 資料夾 ID',
  MEETINGS_FOLDER_ID: '會議文件 Drive 資料夾 ID',
  REGISTRY_URL: '元件市場 Registry URL',
  STAFF_TOKEN: '首次登入 STAFF_TOKEN',
  PUBLIC_VIEW: '公開瀏覽（未登入可唔可以睇公開資料）',
  system_locked: '系統鎖定（true / false）',
};

/** 大而清晰的開關 —— 用戶一看就知道現在是開／關 */
function BigSwitch({ on, onToggle, onLabel, offLabel, busy }: {
  on: boolean;
  onToggle: () => void;
  onLabel: string;
  offLabel: string;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onToggle}
      className={`flex items-center justify-between gap-3 w-full rounded-2xl px-4 py-3.5 border-2 text-left cursor-pointer transition disabled:opacity-60 ${
        on ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-300'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span className={`text-xl`} aria-hidden>{on ? '🟢' : '🔴'}</span>
        <span className={`font-black text-base ${on ? 'text-emerald-800' : 'text-slate-600'}`}>
          {on ? onLabel : offLabel}
        </span>
      </span>
      <span
        className={`relative inline-flex h-9 w-16 flex-shrink-0 items-center rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
        aria-hidden
      >
        <span className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition ${on ? 'translate-x-8' : 'translate-x-1'}`} />
      </span>
    </button>
  );
}

export default function Page() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState('');
  const [folderIds, setFolderIds] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    loadStateSlice(['config', 'plugins', 'pluginSettings'])
      .then(st => {
        setS(st);
        setFolderIds([
          { key: 'ANNOUNCEMENT_FOLDER_ID', value: st.config.ANNOUNCEMENT_FOLDER_ID || '' },
          { key: 'MEETINGS_FOLDER_ID', value: st.config.MEETINGS_FOLDER_ID || '' },
        ]);
      })
      .catch(e => setErr(e.message));
  }, []);

  async function save(key: string, v: string) {
    setErr(''); setOk(''); setBusy(key);
    try { const f = await apiSaveConfig(key, v); setS(f); setOk('✅ 已儲存 ' + (FRIENDLY_LABELS[key] || key)); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function togglePublicView() {
    if (!s) return;
    const on = ['false', '0', 'off', 'no'].includes(String(s.config.PUBLIC_VIEW || '').trim().toLowerCase());
    setBusy('PUBLIC_VIEW');
    try { const f = await apiSaveConfig('PUBLIC_VIEW', on ? 'TRUE' : 'FALSE'); setS(f); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function toggleLock() {
    if (!s) return;
    setBusy('system_locked');
    const next = String(s.config.system_locked || '').toLowerCase() === 'true' ? 'false' : 'true';
    try { const f = await apiSaveConfig('system_locked', next); setS(f); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function togglePlugin(id: string) {
    setErr(''); setBusy('plugin-' + id);
    try { const f = await apiTogglePluginStatus(id); setS(f); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  if (!s) return <div className="card">{err || '載入中...'}</div>;

  const locked = String(s.config.system_locked || '').toLowerCase() === 'true';
  const publicOn = !['false', '0', 'off', 'no'].includes(String(s.config.PUBLIC_VIEW || '').trim().toLowerCase());
  const plugins = s.plugins || [];

  return <Auth roles={['super_admin', 'troop_super', 'admin']}><div className="max-w-3xl mx-auto space-y-4">
    <section className="bg-gradient-to-br from-slate-800 to-slate-600 text-white rounded-2xl px-5 py-5 shadow-lg">
      <h1 className="font-black text-2xl leading-tight m-0">⚙️ 系統設定</h1>
      <p className="text-base text-white/85 mt-1.5 mb-0 leading-relaxed">
        服務開關、公開瀏覽、操作紀錄、元件及單位元件設定。開關狀態會即時清楚顯示（🟢 開啟／🔴 關閉）。
      </p>
    </section>

    {err && <p className="badge red" style={{ display: 'block' }}>{err}</p>}
    {ok && <p className="badge green" style={{ display: 'block' }}>{ok}</p>}

    {/* 1. 系統開放中（清晰開關） */}
    <section className="card stack">
      <h3 className="m-0">🔒 系統開放中</h3>
      <p className="muted m-0">鎖定後一般用戶暫停登入；技術測試帳號仍可進入排查。</p>
      <BigSwitch
        on={!locked}
        busy={busy === 'system_locked'}
        onToggle={toggleLock}
        onLabel="系統開放中"
        offLabel="系統已鎖定（暫停服務）"
      />
    </section>

    {/* 2. 公開瀏覽（清晰開關） */}
    <section className="card stack">
      <h3 className="m-0">🌐 公開瀏覽</h3>
      <p className="muted m-0">開放：未登入都可以睇公開行事曆／公告／活動。關閉：必須登入先睇到。</p>
      <BigSwitch
        on={publicOn}
        busy={busy === 'PUBLIC_VIEW'}
        onToggle={togglePublicView}
        onLabel="公開瀏覽：開放"
        offLabel="公開瀏覽：已關閉"
      />
    </section>

    {/* 3. 查看操作紀錄 */}
    <section className="card stack">
      <h3 className="m-0">📜 查看操作紀錄</h3>
      <p className="muted m-0">所有操作（含審核紀錄）已合併喺一處，並按類別分類。</p>
      <Link href="/admin/audit" className="btn primary" style={{ alignSelf: 'flex-start' }}>查看操作紀錄 →</Link>
    </section>

    {/* 4. 元件 */}
    <section className="card stack">
      <h3 className="m-0">🧩 元件</h3>
      <p className="muted m-0">管理已安裝的 2／3 級元件網址與金鑰，並到元件市場安裝新元件。</p>
      <div className="row">
        <Link href="/admin/plugins" className="btn primary">單位元件設定 →</Link>
        <Link href="/marketplace" className="btn gold">🧩 元件市場</Link>
        <Link href="/connectors" className="btn">🔀 轉駁中心</Link>
      </div>
    </section>

    {/* 5. 單位元件設定（清晰開關）＋ Drive 資料夾 */}
    <section className="card stack">
      <h3 className="m-0">🔌 單位元件設定</h3>
      <p className="muted m-0">逐個單位元件開／關（狀態即時清楚顯示）。</p>
      {plugins.length === 0 ? (
        <p className="muted m-0">尚未安裝任何擴充元件。簽到／點名已內建，無需在此安裝。</p>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {plugins.map(p => (
            <BigSwitch
              key={p.id}
              on={p.enabled}
              busy={busy === 'plugin-' + p.id}
              onToggle={() => togglePlugin(p.id)}
              onLabel={`${p.icon} ${p.title} — 開啟中`}
              offLabel={`${p.icon} ${p.title} — 已停用`}
            />
          ))}
        </div>
      )}

      {/* Drive 資料夾設定（也可在本身頁面設定，如會議管理） */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <h3 className="m-0">🗂 Drive 資料夾設定</h3>
        <p className="muted m-0">亦可在本身頁面設定（例如會議管理、公告頁）。資料夾需設為「知道連結的人都可檢視」。</p>
        <div className="grid">
          {folderIds.map(f => (
            <label key={f.key}>
              <span><b>{FRIENDLY_LABELS[f.key] || f.key}</b> <span className="muted">{f.key}</span></span>
              <input
                defaultValue={f.value}
                disabled={busy === f.key}
                placeholder="貼上資料夾 ID 或完整 URL"
                onBlur={e => { if (e.target.value !== f.value) save(f.key, e.target.value); }}
              />
            </label>
          ))}
        </div>
      </div>
    </section>

    {/* SystemConfig 前端編輯（保留，收合區） */}
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 800 }}>🔧 SystemConfig 前端編輯（進階）</summary>
      <p className="muted">修改欄位後離開輸入框會自動儲存。敏感欄位如非必要請勿更改。</p>
      <div className="grid">
        {Object.entries(s.config).map(([k, v]) => (
          <label key={k}>
            <span><b>{FRIENDLY_LABELS[k] || k}</b> <span className="muted">{k}</span></span>
            <input key={k + v} defaultValue={v} disabled={busy === k} onBlur={e => { if (e.target.value !== v) save(k, e.target.value); }} />
          </label>
        ))}
      </div>
    </details>
  </div></Auth>;
}
