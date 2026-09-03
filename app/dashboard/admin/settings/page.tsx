'use client';
import { useState } from 'react';

export default function SettingsPage() {
  const [tab, setTab] = useState<'config' | 'status' | 'repair'>('config');
  // 未登入可唔可以睇公開資料（對應 SystemConfig 的 PUBLIC_VIEW）
  const [publicView, setPublicView] = useState(true);
  // 三張公開資料卡（對應 SystemConfig 的 PUBLIC_CARDS ＋ PUBLIC_SCOPE_<CARD>）
  // 卡片開 ≠ 內容開：全旅內容由管理員決定（開卡即預設公開），各支部內容由該支部團長決定
  const [cards, setCards] = useState<Record<string, boolean>>({ calendar: true, albums: false, notices: true });
  const [scopes, setScopes] = useState<Record<string, string[]>>({ calendar: ['troop', 'b2', 'b3'], albums: ['troop'], notices: ['troop', 'b2'] });
  const CARD_LIST = [
    { id: 'calendar', icon: '📅', name: '行事曆', desc: '已公佈活動＋恆常集會（訂閱版跟住呢張卡）' },
    { id: 'albums', icon: '📷', name: '相簿', desc: '活動相簿連結' },
    { id: 'activities', icon: '🎯', name: '活動', desc: '已發佈活動＋已設為可見嘅通告 PDF' },
  ];
  const SCOPE_LIST = [{ id: 'troop', name: '全旅' }, { id: 'b2', name: '幼童軍' }, { id: 'b3', name: '童軍' }];

  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">⚙️ 系統設定</h1>
      <div className="flex gap-1.5">
        {[{ id: 'config' as const, label: '🔧 設定' }, { id: 'status' as const, label: '📊 狀態' }, { id: 'repair' as const, label: '🔧 維護' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`text-[13px] px-3 py-1.5 rounded-full font-bold border ${tab === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'config' && (
        <div className="space-y-3">
          {/* 公開瀏覽開關：決定未登入的人可唔可以睇公開行事曆／通告／活動 */}
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <label className="text-[13px] font-bold text-slate-500 uppercase">公開瀏覽（PUBLIC_VIEW）</label>
                <p className="text-[13px] text-slate-500 mt-1 m-0 leading-relaxed">
                  {publicView
                    ? '開放中：任何人揀咗旅團就可以睇公開行事曆／通告／活動，唔使開帳戶。'
                    : '已關閉：必須登入先睇到，未登入的人乜都睇唔到。'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublicView(v => !v)}
                className={`flex-shrink-0 text-[13px] font-bold px-3 py-1.5 rounded-lg border ${publicView ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-200'}`}
              >
                {publicView ? '✅ 開放' : '🔒 必須登入'}
              </button>
            </div>
          </div>

          {/* 三張公開資料卡片 —— 各自獨立，可全開／開兩個／開一個 */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5">
            <div>
              <label className="text-[13px] font-bold text-slate-500 uppercase">🗂️ 公開資料卡片（PUBLIC_CARDS）</label>
              <p className="text-[13px] text-slate-500 mt-1 m-0 leading-relaxed">
                三類公開資料各自獨立開放。<strong>卡片開咗 ≠ 內容開咗</strong> ——
                每張卡入面再分「全旅」（由你決定，開卡即預設公開）同「各支部」（由該支部團長決定）。
              </p>
            </div>
            {!publicView && (
              <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                ⚠️ 上面嘅總掣而家係<strong>關閉</strong>，下面三張卡就算開咗，訪客仍然乜都睇唔到。
              </p>
            )}
            {CARD_LIST.map(c => {
              const on = cards[c.id];
              const list = scopes[c.id] || [];
              const effective = on && list.length > 0;
              return (
                <div key={c.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="m-0 font-bold text-[13px] text-slate-800">{c.icon} {c.name}</p>
                      <p className="m-0 mt-0.5 text-[12px] text-slate-500">{c.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCards(v => {
                          const next = { ...v, [c.id]: !v[c.id] };
                          // 開卡時 scope 為空 → 預設公開全旅內容
                          if (next[c.id] && (scopes[c.id] || []).length === 0)
                            setScopes(sv => ({ ...sv, [c.id]: ['troop'] }));
                          return next;
                        });
                      }}
                      className={`flex-shrink-0 text-[12px] font-bold px-2.5 py-1 rounded-lg border ${on ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-200'}`}
                    >
                      {on ? '✅ 卡片：開放' : '🔒 卡片：關閉'}
                    </button>
                  </div>
                  {on && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="m-0 text-[12px] text-slate-500">已公開範圍：{list.length ? list.map(id => SCOPE_LIST.find(x => x.id === id)?.name || id).join('、') : <span className="text-rose-600 font-bold">（無 —— 全部範圍關閉，卡片等於未開）</span>}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {SCOPE_LIST.map(sc => {
                          const son = list.includes(sc.id);
                          return (
                            <button
                              key={sc.id} type="button"
                              onClick={() => setScopes(sv => ({ ...sv, [c.id]: son ? (sv[c.id] || []).filter(x => x !== sc.id) : [...(sv[c.id] || []).filter(x => x !== sc.id), sc.id].sort((a, b) => (a === 'troop' ? -1 : b === 'troop' ? 1 : a.localeCompare(b))) }))}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${son ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200'}`}
                            >
                              {sc.name}{sc.id === 'troop' ? '（管理員）' : '（團長）'}
                            </button>
                          );
                        })}
                      </div>
                      {!effective && <p className="m-0 mt-1.5 text-[12px] text-rose-600 font-bold">⚠️ 所有範圍都關咗，呢張卡實際等於關閉，要再由你開返。</p>}
                    </div>
                  )}
                </div>
              );
            })}
            <p className="m-0 text-[12px] text-slate-400 leading-relaxed">
              訂閱行事曆（Google／Apple／Outlook 自動同步）跟住「行事曆」卡：卡關閉或範圍全關 → 訂閱連結即刻失效（HTTP 403）。
            </p>
          </div>

          {[
            { key: 'troop_name', label: '旅團名稱', value: '第82旅' },
            { key: 'troop_id', label: '旅團編號', value: '0082' },
            { key: 'announcement_folder', label: '通告 PDF Drive 資料夾 ID', value: '1abc...' },
            { key: 'system_lock', label: '系統鎖定', value: '否' },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3">
              <label className="text-[13px] font-bold text-slate-500 uppercase">{c.label}</label>
              <div className="flex gap-2 mt-1">
                <input defaultValue={c.value} className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                <button className="text-[13px] bg-brand-600 text-white px-3 py-1.5 rounded-lg font-bold">儲存</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'status' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          {[
            { label: 'GS 後台連線', status: 'ok' }, { label: 'API Key', status: 'ok' }, { label: 'Drive 資料夾', status: 'ok' }, { label: 'Registry (插件)', status: 'warn' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="text-[13px] font-medium">{s.label}</span>
              <span className={`text-[13px] px-2 py-0.5 rounded-full font-bold ${s.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {s.status === 'ok' ? '✅ 正常' : '⚠️ 注意'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'repair' && (
        <div className="space-y-2">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-xs mb-2">🔧 修復家長子女連結</h3>
            <p className="text-[13px] text-slate-500 mb-3">自動檢查及修復家長與子女之間的連結。</p>
            <button className="text-[13px] bg-amber-700 text-white px-3 py-1.5 rounded-lg font-bold">執行修復</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-xs mb-2">🔄 重新生成 API Key</h3>
            <p className="text-[13px] text-slate-500 mb-3">舊 Key 會立即失效。</p>
            <button className="text-[13px] bg-rose-600 text-white px-3 py-1.5 rounded-lg font-bold">重新生成</button>
          </div>
        </div>
      )}
    </main>
  );
}
