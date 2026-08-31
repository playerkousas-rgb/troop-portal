'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { activeTroops } from '@/lib/troops';
import { isMockMode, setMockMode, MOCK_TROOP } from '@/lib/mock';

// 旅團登記表（MOCK 會排在最前，其餘旅團排後面）
const TROOPS = activeTroops();

export default function HomePage() {
  const [selectedKey, setSelectedKey] = useState('');
  const [msg, setMsg] = useState('');
  const [mockOn, setMockOn] = useState(false);

  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null');
      if (t) setSelectedKey(t.key || '');
    } catch {}
    setMockOn(isMockMode());
  }, []);

  function selectTroop() {
    const troop = TROOPS.find(t => t.key === selectedKey);
    if (!troop) { setMsg('請先選擇旅團'); return; }
    localStorage.setItem('scoutsystem2_selected_troop', JSON.stringify({
      key: troop.key, id: troop.id, name: troop.name,
    }));
    setMsg('✅ 已選擇 ' + troop.name);
  }

  function enterDemo() {
    setMockMode(true);
    localStorage.setItem('scoutsystem2_selected_troop', JSON.stringify({
      key: MOCK_TROOP.key, id: MOCK_TROOP.id, name: MOCK_TROOP.name,
    }));
    setSelectedKey(MOCK_TROOP.key);
    setMockOn(true);
    setMsg('🎭 已切換到演示模式（全模擬資料）');
  }

  function exitDemo() {
    setMockMode(false);
    setMockOn(false);
    setSelectedKey('');
    localStorage.removeItem('scoutsystem2_selected_troop');
    setMsg('已退出演示模式');
  }

  const selected = TROOPS.find(t => t.key === selectedKey);
  const selectedDemo = mockOn && selectedKey === MOCK_TROOP.key;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-5">

      {/* ── 頁首（簡單）── */}
      <section className="text-center pt-4">
        <div className="text-5xl text-brand-600 mb-2" aria-hidden>⚜</div>
        <h1 className="text-2xl sm:text-3xl font-black text-brand-700 leading-tight m-0">2026 童軍系統</h1>
        <p className="text-[12px] text-slate-500 mt-2 mb-0 leading-relaxed">
          選擇你的旅團，即可查看公開行事曆及活動資訊；登入後可回覆活動及管理旅團事務。
        </p>
      </section>

      {/* ── 選擇旅團（MOCK 放前，其餘旅團排後面）── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h2 className="font-bold text-sm flex items-center gap-2 mt-0 mb-3">
          <span className="w-7 h-7 bg-brand-600 text-white rounded-lg flex items-center justify-center text-sm">🏠</span>
          選擇旅團
        </h2>

        <div className="grid gap-2">
          {/* MOCK 放最前 */}
          <button
            type="button"
            onClick={enterDemo}
            className={`text-left rounded-xl border-2 p-3.5 transition cursor-pointer ${
              selectedDemo ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🎭</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-amber-800">演示體驗 · 全模擬（MOCK）</span>
                <span className="block text-[11px] text-amber-700/80">7 種角色帳號 · 假資料 · 免後台 · 睇晒成個 UI</span>
              </span>
              {selectedDemo && <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>}
            </div>
          </button>

          {/* 真實旅團（排喺 MOCK 後面） */}
          {TROOPS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setSelectedKey(t.key); setMsg(''); if (mockOn) { setMockMode(false); setMockOn(false); } }}
              className={`text-left rounded-xl border-2 p-3.5 transition cursor-pointer ${
                selectedKey === t.key && !selectedDemo ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-brand-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">⚜</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-slate-800">{t.name}</span>
                  <span className="block text-[11px] text-slate-500">編號 {t.id}</span>
                </span>
                {selectedKey === t.key && !selectedDemo && <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>}
              </div>
            </button>
          ))}
        </div>

        {(selected || selectedDemo) && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {selectedDemo ? (
              <>
                <Link href="/login" className="inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold no-underline hover:bg-amber-700 transition">🎭 進入演示 →</Link>
                <button type="button" onClick={exitDemo} className="text-xs text-slate-500 underline underline-offset-2 bg-transparent border-0 cursor-pointer">退出演示模式</button>
              </>
            ) : (
              <>
                <button type="button" onClick={selectTroop} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold border-0 cursor-pointer hover:bg-brand-700 transition">使用此旅團 →</button>
                <Link href="/login" className="inline-flex items-center gap-2 bg-white text-brand-700 border border-brand-200 px-5 py-2.5 rounded-xl text-sm font-bold no-underline hover:bg-brand-50 transition">登入 {selected?.name} →</Link>
              </>
            )}
            {msg && <span className="text-sm text-brand-700 font-bold">{msg}</span>}
          </div>
        )}
        <p className="mt-3 text-[11px] text-slate-500 m-0">
          💡 看不到你的旅團？代表尚未開通，請用下方「新旅團申請及教學」。
        </p>
      </section>

      {/* ── 新旅團申請及教學（含 GS 下載）── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-bold text-sm flex items-center gap-2 mt-0 mb-1">
              <span className="w-7 h-7 bg-violet-600 text-white rounded-lg flex items-center justify-center text-sm">📖</span>
              新旅團申請及教學
            </h2>
            <p className="text-[11px] text-slate-500 leading-relaxed m-0">
              由建立 Google Sheet、貼上 GS 模組、部署到提交申請，全部步驟連所需下載都喺呢度，唔使跳出嚟搵。
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/setup" className="no-underline text-[11px] font-bold bg-violet-600 text-white px-3 py-2 rounded-xl hover:bg-violet-700 transition">開始教學 →</Link>
            <a href="/downloads/SCOUTSYSTEM_2_SETUP.gs.txt" download className="no-underline text-[11px] font-bold bg-white text-violet-700 border border-violet-200 px-3 py-2 rounded-xl hover:bg-violet-50 transition">⬇️ GS 模組</a>
          </div>
        </div>
      </section>

      {/* ── 平台資訊（只保留模板下載 + 更新公告）── */}
      <section>
        <h2 className="font-bold text-sm flex items-center gap-2 mb-2.5">
          <span className="w-7 h-7 bg-slate-600 text-white rounded-lg flex items-center justify-center text-sm">📚</span>
          平台資訊
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/downloads" className="no-underline text-inherit group">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full group-hover:shadow-sm transition">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-xl mb-2">⬇️</div>
              <h3 className="font-bold text-xs text-slate-800 m-0">模板下載</h3>
              <p className="text-[11px] text-slate-500 mt-1 m-0">下載 Apps Script 及通告模板</p>
            </div>
          </Link>
          <Link href="/updates" className="no-underline text-inherit group">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full group-hover:shadow-sm transition">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-xl mb-2">📢</div>
              <h3 className="font-bold text-xs text-slate-800 m-0">更新公告</h3>
              <p className="text-[11px] text-slate-500 mt-1 m-0">平台及元件更新紀錄</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
