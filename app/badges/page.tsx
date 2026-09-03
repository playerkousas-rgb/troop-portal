'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Panel from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import { AppState, loadStateSlice } from '@/lib/store';
import { apiSetWantedBadges } from '@/lib/api';
import { getSession } from '@/lib/session';
import { branches } from '@/lib/model';
import { badgeSchemeFor, parseWantedBadges } from '@/lib/badges';
import { useConfirm, kv } from '@/components/ConfirmProvider';

/**
 * 想考的章 —— 成員自助登記
 *
 * ★ 只有兩個支部有呢個選單（用戶要求）：幼童軍（b2）／童軍（b3）。
 * ★ 只列活動徽章／專科徽章＋其他獎章；**唔包含進度性獎章**（嗰啲係必經階梯，
 *   唔係「自己揀想考邊個」，放喺選單入面只會令人混亂）。
 *
 * 成員／家長都可以揀；家長可替子女揀（?member= 指定，或者喺子女清單揀）。
 */

export default function BadgesPage() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [targetId, setTargetId] = useState('');
  const { confirm } = useConfirm();
  const session = getSession();

  useEffect(() => {
    loadStateSlice(['patrols', 'members', 'users'])
      .then((st) => {
        setS(st);
        // 揀啱對象：家長→第一個子女；成員→自己；領袖→?member=
        const urlMember = new URLSearchParams(window.location.search).get('member') || '';
        const me = st.members.find((m) => m.id === session?.memberId);
        const kids = (st.users.find((u) => u.id === session?.userId)?.childMemberIds || [])
          .map((id) => st.members.find((m) => m.id === id)).filter(Boolean);
        const t = st.members.find((m) => m.id === urlMember) || kids[0] || me || st.members[0];
        if (t) {
          setTargetId(t.id);
          setPicked(new Set(String(t.wantedBadges || '').split(/[|,;]/).map((x) => x.trim()).filter(Boolean)));
        }
      })
      .catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const target = s?.members.find((m) => m.id === targetId);
  const scheme = badgeSchemeFor(target?.branchId);
  const branchName = branches.find(b => b.id === target?.branchId)?.name || target?.branchId || '';

  // 家長可替多名子女揀
  const childOptions = useMemo(() => {
    if (!s) return [] as AppState['members'];
    if (session?.role !== 'parent') return [] as AppState['members'];
    const ids = s.users.find((u) => u.id === session?.userId)?.childMemberIds || [];
    const kids = ids.map((id) => s.members.find((m) => m.id === id)).filter(Boolean) as AppState['members'];
    return kids.length > 1 ? kids : [];
  }, [s, session]);

  const allCats = scheme ? [...scheme.categories, ...scheme.others] : [];
  const totalInScheme = allCats.reduce((n, c) => n + c.items.length, 0);

  function switchTarget(id: string) {
    const t = s?.members.find((m) => m.id === id);
    setTargetId(id);
    setPicked(new Set(String(t?.wantedBadges || '').split(/[|,;]/).map((x) => x.trim()).filter(Boolean)));
    setSaved('');
  }

  function toggle(id: string) {
    setSaved('');
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleCat(catId: string, ids: string[]) {
    setSaved('');
    setPicked((prev) => {
      const n = new Set(prev);
      const allIn = ids.every((i) => n.has(i));
      if (allIn) ids.forEach((i) => n.delete(i)); else ids.forEach((i) => n.add(i));
      return n;
    });
  }

  function toggleOpen(catId: string) {
    setOpenCats((prev) => {
      const n = new Set(prev);
      if (n.has(catId)) n.delete(catId); else n.add(catId);
      return n;
    });
  }

  const searching = q.trim().length > 0;

  async function save() {
    if (!target) return;
    const list = Array.from(picked);
    const names = list
      .map((id) => allCats.flatMap((c) => c.items).find((i) => i.id === id)?.name || id)
      .slice(0, 6)
      .join('、');
    const ok = await confirm({
      title: '確認登記想考的章',
      message: kv([
        ['成員', `${target.name}（${branchName}）`],
        ['已揀', `${list.length} 個章`],
        ...(list.length ? [['內容', names + (list.length > 6 ? ` 等 ${list.length} 個` : '')] as [string, string]] : []),
        ['說明', '登記後領袖會安排考核及跟進。'],
      ]),
      confirmLabel: '確認登記',
    });
    if (!ok) return;
    setSaving(true); setErr(''); setSaved('');
    try {
      const st = await apiSetWantedBadges({ memberId: target.id, wantedBadges: list.join('|') });
      setS(st);
      setSaved(list.length ? `已登記 ${list.length} 個章，領袖會跟進安排。` : '已清空登記。');
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  if (err && !s) return <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4"><p className="text-sm text-rose-700 font-bold m-0 whitespace-pre-wrap leading-relaxed">{err}</p></div>;
  /* ★ 要分「仲喺度載入」同「載入完但冇資料」：
     未登入／session 失效時後台會回 0 個 member，如果一律顯示「載入中...」
     就會永遠轉圈，用戶唔知要登入。 */
  if (!s) return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-600">載入中...</div>;
  if (!target) return (
    <div className="max-w-3xl mx-auto">
      <Panel icon="🎖️" title="想考的章">
        <EmptyState
          icon="🔐"
          title="未能確認你嘅身分"
          desc="呢一頁要登入之後先用到（成員登記自己、家長替子女登記）。請先登入再返嚟。"
          action={<Link href="/login" className="no-underline text-sm font-bold bg-brand-600 text-white px-4 py-2 rounded-xl">前往登入</Link>}
        />
      </Panel>
    </div>
  );

  /* 支部唔喺 b2／b3 → 冇呢個選單 */
  if (!scheme) {
    return (
      <div className="max-w-3xl mx-auto">
        <Panel icon="🎖️" title="想考的章">
          <EmptyState
            icon="🎖️"
            title="你嘅支部暫未設有「想考的章」選單"
            desc={`你而家係「${branchName || target.branchId}」。呢個選單目前只開放畀幼童軍支部同童軍支部。你想考乜章，直接同旅團領袖講就得。`}
          />
          <div className="mt-4 text-center">
            <Link href="/member" className="text-sm font-bold text-brand-700 hover:underline">← 返回我的主頁</Link>
          </div>
        </Panel>
      </div>
    );
  }

  const matched = searching ? allCats.flatMap((c) => c.items.filter((i) => i.name.includes(q.trim()) || (i.en || '').toLowerCase().includes(q.trim().toLowerCase())).map((i) => ({ ...i, cat: c.title }))) : [];

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      <Panel icon="🎖️" title={`想考的章 · ${branchName}`}>
        <p className="text-sm text-slate-600 m-0 leading-relaxed">
          揀你想考嘅章，登記之後領袖會安排考核及跟進。呢度列嘅係
          <strong>{scheme.schemeName}</strong>同其他獎章；
          <strong>進度性獎章</strong>係必經階梯（由領袖按進度安排），所以唔喺呢度揀。
        </p>
        <p className="text-xs text-slate-400 m-0 mt-2 leading-relaxed">
          資料來源：{scheme.source}。總會會不時修訂綱要，實際考核要求以總會最新公佈為準。
        </p>

        {childOptions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {childOptions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => switchTarget(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-bold border transition cursor-pointer ${c.id === target.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'}`}
              >
                {c.name}
                {badgeSchemeFor(c.branchId) ? '' : '（無選單）'}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`搜尋章名（共 ${totalInScheme} 個）`}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-400"
          />
          {picked.size > 0 && (
            <button type="button" onClick={() => { setPicked(new Set()); setSaved(''); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:border-rose-300 hover:text-rose-600 cursor-pointer">
              全部清除
            </button>
          )}
        </div>

        {/* 搜尋結果 */}
        {searching && (
          <div className="mt-3 space-y-1">
            {matched.length === 0 && <p className="text-sm text-slate-400 m-0 py-2">搵唔到「{q.trim()}」。</p>}
            {matched.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => toggle(i.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition cursor-pointer ${picked.has(i.id) ? 'bg-brand-50 border-brand-300' : 'bg-white border-slate-200 hover:border-brand-300'}`}
              >
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs shrink-0 ${picked.has(i.id) ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'}`}>
                  {picked.has(i.id) ? '✓' : ''}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-700">{i.name}{i.tiered && <span className="ml-1 text-[11px] font-normal text-amber-600">三級制</span>}</span>
                  <span className="block text-xs text-slate-400 truncate">{i.cat}{i.en ? ` · ${i.en}` : ''}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* 分類清單 */}
        {!searching && allCats.map((c) => {
          const inCat = c.items.filter((i) => picked.has(i.id)).length;
          const open = openCats.has(c.id);
          return (
            <div key={c.id} className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5">
                <button type="button" onClick={() => toggleOpen(c.id)} className="flex-1 flex items-center gap-2 text-left cursor-pointer bg-transparent border-0 p-0">
                  <span className={`text-xs text-slate-400 transition ${open ? 'rotate-90' : ''}`}>▶</span>
                  <span className="text-sm font-bold text-slate-700">{c.title}</span>
                  <span className="text-xs text-slate-400">{c.items.length} 個</span>
                  {inCat > 0 && <span className="text-xs font-bold text-brand-700 bg-brand-100 rounded-full px-2 py-0.5">已揀 {inCat}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => toggleCat(c.id, c.items.map((i) => i.id))}
                  className="text-xs font-bold text-slate-500 hover:text-brand-700 px-2 py-1 rounded-lg cursor-pointer bg-transparent border-0"
                >
                  {c.items.every((i) => picked.has(i.id)) ? '取消全選' : '全選'}
                </button>
              </div>
              {c.desc && open && <p className="text-xs text-slate-400 m-0 px-3 pt-2">{c.desc}</p>}
              {open && (
                <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {c.items.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => toggle(i.id)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition cursor-pointer ${picked.has(i.id) ? 'bg-brand-50 border-brand-300' : 'bg-white border-slate-100 hover:border-brand-200'}`}
                    >
                      <span className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded border flex items-center justify-center text-[11px] shrink-0 ${picked.has(i.id) ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'}`}>
                        {picked.has(i.id) ? '✓' : ''}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-700 leading-tight">{i.name}{i.tiered && <span className="ml-1 text-[10px] font-normal text-amber-600">三級</span>}</span>
                        {i.en && <span className="block text-[11px] text-slate-400 truncate leading-tight">{i.en}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Panel>

      {/* 已揀清單 + 儲存 */}
      <div className="sticky bottom-20 z-10 bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-lg p-3">
        {err && <p className="text-xs text-rose-600 font-bold m-0 mb-2 whitespace-pre-wrap">{err}</p>}
        {saved && <p className="text-xs text-emerald-700 font-bold m-0 mb-2">✅ {saved}</p>}
        {picked.size > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Array.from(picked).map((id) => {
              const it = allCats.flatMap((c) => c.items).find((i) => i.id === id);
              return (
                <button key={id} type="button" onClick={() => toggle(id)} className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-2.5 py-1 cursor-pointer">
                  {it?.name || id} <span className="text-brand-400">×</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 m-0 mb-2">未揀任何章。揀好之後撳「登記」。</p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-bold disabled:opacity-50 cursor-pointer hover:bg-brand-700 transition"
        >
          {saving ? '登記中...' : `登記想考的章（${picked.size} 個）`}
        </button>
      </div>
    </div>
  );
}
