'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { activeTroops } from '@/lib/troops';

// ── 旅團資料（已接入旅團登記表，key 需與 /api/proxy 查詢一致） ──
const TROOPS = activeTroops();

export default function HomePage() {
  const [selectedKey, setSelectedKey] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null');
      if (t) setSelectedKey(t.key || '');
    } catch {}
  }, []);

  function selectTroop() {
    const troop = TROOPS.find(t => t.key === selectedKey);
    if (!troop) { setMsg('請先選擇旅團'); return; }
    localStorage.setItem('scoutsystem2_selected_troop', JSON.stringify({
      key: troop.key, id: troop.id, name: troop.name,
    }));
    setMsg('✅ 已選擇 ' + troop.name);
  }

  const selected = TROOPS.find(t => t.key === selectedKey);

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="hero-gradient text-white px-6 py-14 sm:py-20 relative overflow-hidden">
        <div className="absolute right-4 bottom-4 text-[10rem] opacity-[0.06] pointer-events-none select-none leading-none">⚜</div>
        <div className="max-w-5xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-[11px] font-semibold px-3 py-1 rounded-full border border-white/25">
            🌐 2026 Scout System · 多旅團共用平台
          </span>
          <h1 className="text-3xl sm:text-5xl font-black mt-4 leading-tight tracking-tight">
            旅團管理系統
          </h1>
          <p className="mt-3 text-white/70 text-sm sm:text-base leading-relaxed max-w-2xl">
            選擇你的旅團，即可查看公開行事曆及活動資訊。<br className="hidden sm:block" />
            登入後可回覆活動、查看出席紀錄及管理旅團事務。
          </p>
          <div className="flex gap-2.5 mt-6 flex-wrap">
            {selected && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-scout-blue px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-50 transition shadow-lg"
              >
                🔑 登入 {selected.name}
              </Link>
            )}
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-bold border border-white/20 hover:bg-white/20 transition"
            >
              📖 接入教學
            </Link>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">

        {/* ── 選擇旅團 ── */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <h2 className="font-bold text-lg flex items-center gap-2.5 mb-5">
            <span className="w-8 h-8 bg-brand-600 text-white rounded-xl flex items-center justify-center text-sm">🏠</span>
            選擇旅團
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TROOPS.map(t => (
              <button
                key={t.key}
                onClick={() => { setSelectedKey(t.key); setMsg(''); }}
                className={`
                  text-left rounded-xl border-2 p-4 transition-all cursor-pointer
                  ${selectedKey === t.key
                    ? 'border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-200'
                    : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">⚜</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800">{t.name}</div>
                    <div className="text-[11px] text-slate-400">編號 {t.id}</div>
                  </div>
                  {selectedKey === t.key && (
                    <div className="w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                  )}
                </div>
              </button>
            ))}
          </div>
          {selected && (
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <button
                onClick={selectTroop}
                className="bg-brand-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-700 transition shadow"
              >
                使用此旅團 →
              </button>
              {msg && <span className="text-sm text-emerald-600 font-bold">{msg}</span>}
            </div>
          )}
          <p className="mt-4 text-[11px] text-slate-400">
            💡 看不到你的旅團？代表尚未開通，請先聯絡管理員申請接入。
          </p>
        </section>

        {/* ── 平台資訊 ── */}
        <section>
          <h2 className="font-bold text-lg flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center text-sm">📚</span>
            平台資訊
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '🧩', title: '接入教學', desc: '由建立 Sheet 到提交申請', href: '/setup' },
              { icon: '⬇️', title: '模板下載', desc: '下載 Apps Script 模板', href: '/downloads' },
              { icon: '📢', title: '更新公告', desc: '平台及元件更新紀錄', href: '/updates' },
              { icon: '🌏', title: '已接入旅團', desc: '查看所有旅團', href: '/troops' },
            ].map((item, i) => (
              <Link key={i} href={item.href} className="no-underline text-inherit group">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 card-hover h-full">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-xl mb-2.5 group-hover:bg-brand-100 transition">{item.icon}</div>
                  <h4 className="font-bold text-xs text-slate-800">{item.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
