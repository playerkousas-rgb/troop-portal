'use client';
import { useState } from 'react';

export default function SettingsPage() {
  const [tab, setTab] = useState<'config' | 'status' | 'repair'>('config');

  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">
      <h1 className="font-bold text-lg">⚙️ 系統設定</h1>
      <div className="flex gap-1.5">
        {[{ id: 'config' as const, label: '🔧 設定' }, { id: 'status' as const, label: '📊 狀態' }, { id: 'repair' as const, label: '🔧 維護' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`text-[11px] px-3 py-1.5 rounded-full font-bold border ${tab === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'config' && (
        <div className="space-y-3">
          {[
            { key: 'troop_name', label: '旅團名稱', value: '第82旅' },
            { key: 'troop_id', label: '旅團編號', value: '0082' },
            { key: 'announcement_folder', label: '公告 Drive 資料夾 ID', value: '1abc...' },
            { key: 'system_lock', label: '系統鎖定', value: '否' },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3">
              <label className="text-[9px] font-bold text-slate-500 uppercase">{c.label}</label>
              <div className="flex gap-2 mt-1">
                <input defaultValue={c.value} className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                <button className="text-[10px] bg-brand-600 text-white px-3 py-1.5 rounded-lg font-bold">儲存</button>
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
              <span className="text-[11px] font-medium">{s.label}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${s.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
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
            <p className="text-[10px] text-slate-500 mb-3">自動檢查及修復家長與子女之間的連結。</p>
            <button className="text-[10px] bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold">執行修復</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-xs mb-2">🔄 重新生成 API Key</h3>
            <p className="text-[10px] text-slate-500 mb-3">舊 Key 會立即失效。</p>
            <button className="text-[10px] bg-rose-600 text-white px-3 py-1.5 rounded-lg font-bold">重新生成</button>
          </div>
        </div>
      )}
    </main>
  );
}
