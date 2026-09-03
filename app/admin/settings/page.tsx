'use client';
import { useEffect, useState } from 'react';
import { AppState, loadStateSlice } from '@/lib/store';
import { apiSaveConfig, apiTogglePluginStatus , apiSetPublicCard } from '@/lib/api';
import Link from 'next/link';
import Auth from '@/components/Auth';
import { useConfirm, kv } from '@/components/ConfirmProvider';
import { PUBLIC_CARDS, cardOpen, cardEffective, openScopes, TROOP_SCOPE } from '@/lib/publicScope';
import type { PublicCardId } from '@/lib/publicScope';
import { branches as ALL_BRANCHES } from '@/lib/model';

const FRIENDLY_LABELS: Record<string, string> = {
  TROOP_CODE: '旅團號碼',
  TROOP_NAME: '旅團名稱',
  ADMIN_EMAIL: '主要管理員 Email',
  ADMIN_DEFAULT_PASSWORD: '預設管理員密碼',
  ANNOUNCEMENT_FOLDER_ID: '通告 PDF Drive 資料夾 ID',
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
  const [cfgDrafts, setCfgDrafts] = useState<Record<string, string>>({});
  const { confirm } = useConfirm();

  useEffect(() => {
    loadStateSlice(['config', 'plugins', 'pluginSettings'])
      .then(st => {
        setS(st);
        setFolderIds([
          { key: 'ANNOUNCEMENT_FOLDER_ID', value: st.config.ANNOUNCEMENT_FOLDER_ID || '' },
          { key: 'MEETINGS_FOLDER_ID', value: st.config.MEETINGS_FOLDER_ID || '' },
        ]);
        setCfgDrafts({ ...(st.config || {}) });
      })
      .catch(e => setErr(e.message));
  }, []);

  async function saveFolders() {
    if (!s) return;
    const changed = folderIds.filter(f => f.value.trim() !== (s.config[f.key] || '').trim());
    if (changed.length === 0) { setOk('✅ 沒有變更需要儲存'); return; }
    const ok = await confirm({
      title: '確認儲存 Drive 資料夾設定',
      message: kv(changed.map(f => [FRIENDLY_LABELS[f.key] || f.key, f.value] as [string, string])),
      confirmLabel: '確認儲存',
    });
    if (!ok) return;
    setErr(''); setOk(''); setBusy('folders');
    try {
      let f = s;
      for (const c of changed) f = await apiSaveConfig(c.key, c.value.trim());
      setS(f); setOk('✅ 已儲存資料夾設定');
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function saveAdvanced() {
    if (!s) return;
    const changed = Object.entries(cfgDrafts).filter(([k, v]) => String(v ?? '').trim() !== (s.config[k] || '').trim());
    if (changed.length === 0) { setOk('✅ 沒有變更需要儲存'); return; }
    const ok = await confirm({
      title: '確認儲存 SystemConfig',
      message: kv(changed.map(([k, v]) => [FRIENDLY_LABELS[k] || k, v] as [string, string])),
      confirmLabel: '確認儲存',
    });
    if (!ok) return;
    setErr(''); setOk(''); setBusy('advanced');
    try {
      let f = s;
      for (const [k, v] of changed) f = await apiSaveConfig(k, String(v ?? '').trim());
      setS(f); setOk('✅ 已儲存設定');
    } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function togglePublicView() {
    if (!s) return;
    const on = ['false', '0', 'off', 'no'].includes(String(s.config.PUBLIC_VIEW || '').trim().toLowerCase());
    const ok = await confirm({
      title: '確認切換公開瀏覽',
      message: kv([
        ['變更後狀態', on ? '🟢 公開瀏覽：開放' : '🔴 公開瀏覽：已關閉'],
        // ★ 用戶要求：呢個開關同時決定「加入我的行事曆」訂閱功能開唔開放，
        //   因為訂閱連結必然公開（Google／Apple 嘅伺服器唔會帶登入身分嚟攞）。
        //   切換前必須講清楚會公開咩、唔會公開咩。
        ...(on ? [
          ['一併開放', '📲「加入我的行事曆」訂閱（Google／Apple／Outlook 可自動同步）'],
          ['會公開', '已公佈活動＋已啟用恆常集會（標題、日期、時間、地點、通告連結）'],
          ['唔會公開', '未公佈（PRIVATE）活動、報名名單、出席紀錄、成員／家長聯絡電話'],
          ['提示', '任何人拿到訂閱網址都睇到上述公開內容；關閉後訂閱連結會即刻失效（HTTP 403）。'],
        ] as [string, string][] : [
          ['一併關閉', '📲「加入我的行事曆」訂閱 —— 已訂閱嘅用戶日曆會停止更新'],
        ] as [string, string][]),
      ]),
      confirmLabel: '確認切換',
    });
    if (!ok) return;
    setBusy('PUBLIC_VIEW');
    try { const f = await apiSaveConfig('PUBLIC_VIEW', on ? 'TRUE' : 'FALSE'); setS(f); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  /* ★ 第 1 層：管理員開／關三張公開資料卡（行事曆／相簿／通告），各自獨立。
     開卡時後端會預設把 troop（全旅內容）一齊公開；各支部內容仍要由該支部團長另外開放。 */
  async function toggleCard(card: PublicCardId, name: string) {
    if (!s) return;
    const on = !cardOpen(s.config, card);
    const ok = await confirm({
      title: on ? `確認開放「${name}」卡` : `確認關閉「${name}」卡`,
      message: kv([
        ['卡片', `${name}`],
        ['變更後', on ? '🟢 開放：呢張卡入面「已開放範圍」嘅內容會公開畀未登入訪客' : '🔴 關閉：呢張卡所有內容都唔會公開'],
        ...((on
          ? [['預設範圍', '全旅內容會一併設為公開（全旅由管理員決定，可以再關）'],
             ['各支部', '唔會自動公開 —— 要由該支部團長／支部領袖自己開放']]
          : [['提示', '各支部已設定嘅範圍會保留，日後開返卡片時唔使重新設定']]) as [string, string][]),
      ]),
      confirmLabel: '確認',
    });
    if (!ok) return;
    setBusy('card_' + card); setErr(''); setOk('');
    try { const f = await apiSetPublicCard({ card, enabled: on }); setS(f); setOk(on ? `✅ 已開放「${name}」卡` : `🔒 已關閉「${name}」卡`); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function toggleLock() {
    if (!s) return;
    const next = String(s.config.system_locked || '').toLowerCase() === 'true' ? 'false' : 'true';
    const ok = await confirm({
      title: '確認切換系統鎖定',
      message: kv([['變更後狀態', next === 'true' ? '🔴 系統已鎖定（暫停服務）' : '🟢 系統開放中']]),
      confirmLabel: '確認切換',
      danger: next === 'true',
    });
    if (!ok) return;
    setBusy('system_locked');
    try { const f = await apiSaveConfig('system_locked', next); setS(f); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  async function togglePlugin(id: string) {
    const p = s?.plugins?.find(x => x.id === id);
    const ok = await confirm({
      title: p?.enabled ? '確認停用元件' : '確認啟用元件',
      message: kv([['元件', p?.title || id], ['變更後狀態', p?.enabled ? '🔴 已停用' : '🟢 開啟中']]),
      confirmLabel: '確認',
    });
    if (!ok) return;
    setErr(''); setBusy('plugin-' + id);
    try { const f = await apiTogglePluginStatus(id); setS(f); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }

  if (!s) return <div className="card">{err || '載入中...'}</div>;

  const locked = String(s.config.system_locked || '').toLowerCase() === 'true';
  const publicOn = !['false', '0', 'off', 'no'].includes(String(s.config.PUBLIC_VIEW || '').trim().toLowerCase());
  const scopeNames = (card: PublicCardId) =>
    openScopes(s.config, card).map(id => id === TROOP_SCOPE ? '全旅' : (ALL_BRANCHES.find(b => b.id === id)?.name || id)).join('、');
  const plugins = s.plugins || [];

  return <Auth roles={['super_admin', 'troop_super', 'troop_leader', 'admin']}><div className="max-w-3xl mx-auto space-y-4">
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

    {/* 2. 公開資料（總掣 ＋ 三張卡片） */}
    <section className="card stack">
      <h3 className="m-0">🌐 公開瀏覽（總掣）</h3>
      <p className="muted m-0">開放：未登入都可以睇公開資料。關閉：必須登入先睇到，下面三張卡全部失效。</p>
      <BigSwitch
        on={publicOn}
        busy={busy === 'PUBLIC_VIEW'}
        onToggle={togglePublicView}
        onLabel="公開瀏覽：開放"
        offLabel="公開瀏覽：已關閉"
      />
    </section>

    {/* 2b. 三張公開資料卡片 —— 各自獨立，可全開／開兩個／開一個 */}
    <section className="card stack">
      <h3 className="m-0">🗂️ 公開資料卡片</h3>
      <p className="muted m-0">
        三類公開資料各自獨立開放。<strong>卡片開咗 ≠ 內容開咗</strong> ——
        每張卡入面再分「全旅」（由你決定）同「各支部」（由該支部團長決定）。
      </p>
      {!publicOn && (
        <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          ⚠️ 總掣而家係<strong>關閉</strong>，下面三張卡就算開咗，訪客仍然乜都睇唔到。
        </p>
      )}
      <div className="stack">
        {PUBLIC_CARDS.map(c => {
          const on = cardOpen(s.config, c.id);
          const eff = cardEffective(s.config, c.id);
          const names = scopeNames(c.id);
          return (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="m-0 font-bold text-slate-800">{c.icon} {c.name}</p>
                  <p className="m-0 mt-0.5 text-[13px] text-slate-500">{c.desc}</p>
                </div>
                <BigSwitch
                  on={on}
                  busy={busy === 'card_' + c.id}
                  onToggle={() => toggleCard(c.id, c.name)}
                  onLabel="卡片：開放"
                  offLabel="卡片：關閉"
                />
              </div>
              {on && (
                <p className="m-0 mt-2 text-[12px] text-slate-500 leading-relaxed">
                  已公開範圍：<strong>{names || '（無 —— 全部範圍關閉，卡片等於未開）'}</strong>
                  {!eff && <span className="text-rose-600 font-bold"> ⚠️ 所有範圍都關咗，呢張卡實際等於關閉</span>}
                  <br />
                  全旅內容由你在 <Link href="/admin/calendar" className="font-bold">行事曆管理</Link>／相簿／通告頁設定；
                  各支部內容要由<strong>該支部團長</strong>自己開放。
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted m-0 text-[12px] leading-relaxed">
        訂閱行事曆（Google／Apple／Outlook 自動同步）跟住「行事曆」卡：
        卡關閉或範圍全關 → 訂閱連結即刻失效（HTTP 403）。
        公開內容只限<strong>已發佈</strong>項目；未發佈（PRIVATE）活動、報名名單、出席紀錄、
        成員及家長聯絡電話一律唔會公開。
      </p>
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
        <p className="muted m-0">亦可在本身頁面設定（例如會議管理、通告頁）。資料夾需設為「知道連結的人都可檢視」。修改後按「儲存」才寫入。</p>
        <div className="grid">
          {folderIds.map(f => (
            <label key={f.key}>
              <span><b>{FRIENDLY_LABELS[f.key] || f.key}</b> <span className="muted">{f.key}</span></span>
              <input
                value={f.value}
                disabled={busy === 'folders'}
                placeholder="貼上資料夾 ID 或完整 URL"
                onChange={e => setFolderIds(prev => prev.map(x => x.key === f.key ? { ...x, value: e.target.value } : x))}
              />
            </label>
          ))}
        </div>
        <button className="btn primary" disabled={busy === 'folders'} onClick={saveFolders}>💾 儲存資料夾設定</button>
      </div>
    </section>

    {/* SystemConfig 前端編輯（保留，收合區） */}
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 800 }}>🔧 SystemConfig 前端編輯（進階）</summary>
      <p className="muted">修改欄位後按「儲存設定」才會寫入（先暫存在瀏覽器）。敏感欄位如非必要請勿更改。</p>
      <div className="grid">
        {Object.entries(cfgDrafts).map(([k, v]) => (
          <label key={k}>
            <span><b>{FRIENDLY_LABELS[k] || k}</b> <span className="muted">{k}</span></span>
            <input
              value={v}
              disabled={busy === 'advanced'}
              onChange={e => setCfgDrafts(prev => ({ ...prev, [k]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <button className="btn primary" disabled={busy === 'advanced'} onClick={saveAdvanced} style={{ marginTop: 12 }}>💾 儲存設定</button>
    </details>
  </div></Auth>;
}
