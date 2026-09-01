'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppState, loadStateSlice, Bookmark } from '@/lib/store';
import { apiSaveConfig, apiUpdateBookmark, apiDeleteBookmark, apiUpdatePdfTags,
  apiGetAnnouncements, apiAddAnnouncement, apiUpdateAnnouncement, apiDeleteAnnouncement } from '@/lib/api';
import { getSession } from '@/lib/session';
import { branches, publicViewEnabled } from '@/lib/model';
import PublicLocked from '@/components/ui/PublicLocked';
import { useConfirm, kv } from '@/components/ConfirmProvider';

/* ═══════════════════════════════════════════════════
   公告 / 通告 —— MOCK 乾淨版式 + 真實後台
   ★ 領袖直接喺本頁發佈／編輯／刪除公告，唔使跳去管理工具。
   （公告=提示類訊息；通告=圖書館引入/旅團通告；PDF=日常文件）
   ═══════════════════════════════════════════════════ */

const ACTIVITY_TYPES = ['訓練班', '比賽', '服務', '工作坊', '活動', '其他'];
const AUDIENCE_OPTIONS = ['全旅', '領袖', '成年成員', '小童軍', '幼童軍', '童軍', '深資童軍', '樂行童軍', '家長'];
const BRANCH_NAME: Record<string, string> = { b1: '小童軍', b2: '幼童軍', b3: '童軍', b4: '深資', b5: '樂行' };

type Ann = { id: string; title: string; message: string; scope: string; branchId: string; createdAt: string };
const emptyAnn: Ann = { id: '', title: '', message: '', scope: 'troop', branchId: '', createdAt: '' };
const emptyBm = { id: '', title: '', activityType: '', branches: [] as string[], audience: [] as string[], mode: 'informational' as 'informational' | 'troop_participation', internalDeadline: '' };

const inputCls = 'flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm min-w-0';
const labelCls = 'flex items-center gap-2 text-sm font-bold text-slate-600';

export default function Notices() {
  const [s, setS] = useState<AppState | null>(null);
  const [anns, setAnns] = useState<any[] | null>(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [folderId, setFolderId] = useState('');
  const [loading, setLoading] = useState(false);

  // 公告 form
  const [form, setForm] = useState<Ann | null>(null);
  const [formErr, setFormErr] = useState('');
  // 通告 inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bm, setBm] = useState(emptyBm);
  // PDF tag edit
  const [editingPdfId, setEditingPdfId] = useState<string | null>(null);
  const [pdfBranches, setPdfBranches] = useState<string[]>([]);
  const [pdfAudience, setPdfAudience] = useState<string[]>([]);
  const { confirm } = useConfirm();

  const session = getSession();
  const isLeader = session && ['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader', 'coach'].includes(session.role);

  useEffect(() => {
    loadStateSlice(['bookmarks', 'announcementPdfs', 'config']).then(st => { setS(st); setFolderId(st.config.ANNOUNCEMENT_FOLDER_ID || ''); }).catch(e => setErr(e.message));
    apiGetAnnouncements().then(res => { if (res.success) setAnns((res.data || []).slice().sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))); }).catch(() => setAnns([]));
  }, []);

  async function reload() {
    try {
      const st = await loadStateSlice(['bookmarks', 'announcementPdfs', 'config']);
      setS(st);
      const res = await apiGetAnnouncements();
      if (res.success) setAnns((res.data || []).slice().sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
    } catch (e: any) { setErr(e.message) }
  }

  /* ── 公告：發佈／編輯／刪除（真實後台） ── */
  async function saveAnn() {
    if (!form) return;
    if (!form.title.trim()) { setFormErr('請填寫公告標題。'); return; }
    if (!form.message.trim()) { setFormErr('請填寫公告內容。'); return; }
    const ok = await confirm({
      title: form.id ? '確認更新公告' : '確認發佈公告',
      message: kv([
        ['標題', form.title.trim()],
        ['內容', form.message.trim()],
        ['對象', form.scope === 'troop' ? '全旅' : BRANCH_NAME[form.branchId] || form.branchId || '指定支部'],
      ]),
      confirmLabel: form.id ? '確認更新' : '確認發佈',
    });
    if (!ok) return;
    setLoading(true); setErr('');
    try {
      const p = { title: form.title.trim(), message: form.message.trim(), scope: form.scope, branchId: form.scope === 'troop' ? '' : form.branchId };
      if (form.id) {
        await apiUpdateAnnouncement({ announcementId: form.id, ...p });
        setOk('✅ 已更新公告「' + form.title.trim() + '」');
      } else {
        await apiAddAnnouncement(p);
        setOk('✅ 已發佈公告「' + form.title.trim() + '」');
      }
      setForm(null);
      await reload();
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  async function delAnn(id: string, title: string) {
    const ok = await confirm({ title: '確認刪除公告', message: kv([['公告', title]]), confirmLabel: '確認刪除', danger: true });
    if (!ok) return;
    setLoading(true); setErr('');
    try { await apiDeleteAnnouncement(id); setOk(`🗑 已刪除公告「${title}」`); await reload(); }
    catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  function annTarget(a: any) {
    if (a.scope === 'troop') return '全旅';
    return BRANCH_NAME[a.branchId] || a.branchId || '指定支部';
  }

  /* ── 通告（圖書館引入／旅團通告）── */
  function startEdit(b: Bookmark) {
    setEditingId(b.id);
    setBm({ id: b.id, title: b.title || '', activityType: b.activityType || '', branches: b.branchTags || [], audience: b.audienceTags || [], mode: b.mode, internalDeadline: b.internalDeadline || '' });
  }
  async function saveEdit() {
    if (!editingId) return;
    const ok = await confirm({
      title: '確認更新通告',
      message: kv([
        ['標題', bm.title],
        ['類型', bm.activityType],
        ['模式', bm.mode === 'troop_participation' ? '旅團參與' : '資訊性'],
        ['內部截止', bm.internalDeadline],
      ]),
      confirmLabel: '確認更新',
    });
    if (!ok) return;
    setLoading(true); setErr('');
    try {
      await apiUpdateBookmark({ bookmarkId: editingId, title: bm.title, activityType: bm.activityType,
        branchTags: bm.branches.join(',') || '全旅', audienceTags: bm.audience.join(','),
        mode: bm.mode, internalDeadline: bm.internalDeadline });
      const { loadState } = await import('@/lib/store');
      setS(await loadState()); setEditingId(null); setOk('✅ 已更新');
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }
  async function del(id: string, title: string) {
    const ok = await confirm({ title: '確認隱藏通告', message: kv([['通告', title], ['注意', '可從 Sheet 復原']]), confirmLabel: '確認隱藏', danger: true });
    if (!ok) return;
    setLoading(true); setErr('');
    try { await apiDeleteBookmark(id); const { loadState } = await import('@/lib/store'); setS(await loadState()); setOk('✅ 已隱藏'); }
    catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  /* ── PDF ── */
  async function saveFolder() {
    const ok = await confirm({ title: '確認儲存公告 Drive 資料夾', message: kv([['ANNOUNCEMENT_FOLDER_ID', folderId]]), confirmLabel: '確認儲存' });
    if (!ok) return;
    setErr(''); setOk(''); try { const f = await apiSaveConfig('ANNOUNCEMENT_FOLDER_ID', folderId); setS(f); setOk('✅ 已儲存') } catch (e: any) { setErr(e.message) }
  }
  function startEditPdf(pdf: any) { setEditingPdfId(pdf.id); setPdfBranches(pdf.branchTags || ['全旅']); setPdfAudience(pdf.audienceTags || []); }
  async function savePdfTags(fileId: string) {
    const ok = await confirm({
      title: '確認更新 PDF 標籤',
      message: kv([
        ['支部', pdfBranches.length > 0 ? pdfBranches.join('、') : '全旅'],
        ['對象', pdfAudience.join('、')],
      ]),
      confirmLabel: '確認更新',
    });
    if (!ok) return;
    setLoading(true); setErr('');
    try {
      await apiUpdatePdfTags({ fileId, branchTags: pdfBranches.length > 0 ? pdfBranches.join(',') : '全旅', audienceTags: pdfAudience.join(',') });
      const { loadState } = await import('@/lib/store');
      setS(await loadState()); setEditingPdfId(null); setOk('✅ PDF 標籤已更新');
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }
  async function hidePdf(fileId: string, name: string) {
    const ok = await confirm({ title: '確認隱藏 PDF', message: kv([['PDF', name]]), confirmLabel: '確認隱藏', danger: true });
    if (!ok) return;
    setLoading(true); setErr('');
    try { await apiUpdatePdfTags({ fileId, status: 'hidden' }); const { loadState } = await import('@/lib/store'); setS(await loadState()); setOk('✅ 已隱藏') } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }
  async function showPdf(fileId: string) {
    const ok = await confirm({ title: '確認顯示 PDF', message: kv([['變更後狀態', '🟢 可見']]), confirmLabel: '確認顯示' });
    if (!ok) return;
    setLoading(true); setErr('');
    try { await apiUpdatePdfTags({ fileId, status: 'visible' }); const { loadState } = await import('@/lib/store'); setS(await loadState()); setOk('✅ 已顯示') } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }

  if (err && !s) return <main className="max-w-3xl mx-auto px-4 py-8 pb-24"><p className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 font-bold m-0 whitespace-pre-wrap">{err}</p></main>;
  if (!s) return <main className="max-w-3xl mx-auto px-4 py-8 pb-24 text-sm text-slate-600">載入中...</main>;
  if (!session && !publicViewEnabled(s.config)) return <PublicLocked troopName={s.config?.TROOP_NAME} />;

  const pdfs = s.announcementPdfs || [];

  return (
    <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">

      {/* Header + 直接發佈入口 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-bold text-xl m-0">📢 公告 / 通告</h1>
        <div className="flex gap-1.5 items-center flex-wrap">
          {isLeader && (
            <>
              <button onClick={() => { setFormErr(''); setOk(''); setForm({ ...emptyAnn }); }}
                className="text-sm px-3 py-1.5 rounded-lg font-bold bg-brand-600 text-white border-0 cursor-pointer hover:bg-brand-700 transition">+ 發佈公告</button>
              <Link href="/notices/upload" className="no-underline text-sm px-3 py-1.5 rounded-lg font-bold bg-white border border-slate-200 text-slate-600 hover:border-slate-300 transition">📄 上傳通告</Link>
              <Link href="/library/import" className="no-underline text-sm px-3 py-1.5 rounded-lg font-bold bg-white border border-slate-200 text-slate-600 hover:border-slate-300 transition">🗺️ 區地域總會活動引入</Link>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-500 m-0 -mt-2 leading-relaxed">
        公告＝提示類訊息，例如「活動因天氣取消」「請家長交團費」。通告＝區地域總會活動（原圖書館引入）嘅活動通告；日常公告 PDF 喺下面。
      </p>

      {ok && <div className="text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">{ok}</div>}
      {err && <div className="text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-3 py-2 whitespace-pre-wrap">{err}</div>}

      {/* ═════ 公告（提示類訊息）═════ */}
      <section className="space-y-2">
        {(anns || []).length === 0
          ? <p className="text-center text-sm text-slate-500 py-6 bg-white rounded-2xl border border-slate-200">暫無公告{isLeader ? '，按「+ 發佈公告」直接喺度發佈。' : '。'}</p>
          : (anns || []).map((a: any) => (
            <div key={a.announcementId || a.id} className="rounded-2xl border p-3.5 bg-white border-slate-200">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">📢</span>
                    <span className="font-bold text-sm">{a.title}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1.5 m-0 leading-relaxed whitespace-pre-wrap">{a.message}</p>
                  <div className="text-sm text-slate-500 mt-1.5">{a.createdAt || ''} · 對象：{annTarget(a)}</div>
                </div>
                {isLeader && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setFormErr(''); setOk(''); setForm({ id: a.announcementId || a.id, title: a.title || '', message: a.message || '', scope: a.scope || 'troop', branchId: a.branchId || '', createdAt: '' }); }} className="text-sm text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 border-0 bg-transparent cursor-pointer" title="編輯">✏️</button>
                    <button onClick={() => delAnn(a.announcementId || a.id, a.title)} className="text-sm text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 border-0 bg-transparent cursor-pointer" title="刪除">🗑</button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </section>

      {/* ═════ 通告（圖書館引入／旅團通告）═════ */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base m-0">通告（{s.bookmarks.length}）</h2>
        </div>
        {s.bookmarks.length === 0 ? (
          <p className="text-sm text-slate-500 m-0 py-4 text-center">暫無通告，領袖由通告圖書館引入後會顯示在這裡。</p>
        ) : (
          <div className="space-y-2">
            {s.bookmarks.map(b => editingId === b.id ? (
              <div key={b.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
                <label className={labelCls}>標題<input className={inputCls} value={bm.title} onChange={e => setBm({ ...bm, title: e.target.value })} /></label>
                <label className={labelCls}>類型
                  <select className={inputCls} value={bm.activityType} onChange={e => setBm({ ...bm, activityType: e.target.value })}>
                    <option value="">—</option>
                    {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className={labelCls}>模式
                  <select className={inputCls} value={bm.mode} onChange={e => setBm({ ...bm, mode: e.target.value as any })}>
                    <option value="informational">資訊性</option>
                    <option value="troop_participation">旅團參與</option>
                  </select>
                </label>
                <label className={labelCls}>內部截止<input type="date" className={inputCls} value={bm.internalDeadline} onChange={e => setBm({ ...bm, internalDeadline: e.target.value })} /></label>
                <div>
                  <div className="text-sm font-bold text-slate-600 mb-1.5">支部標籤</div>
                  <div className="flex flex-wrap gap-1.5">
                    {branches.map(br => (
                      <button key={br.id} type="button" onClick={() => setBm({ ...bm, branches: bm.branches.includes(br.short) ? bm.branches.filter(x => x !== br.short) : [...bm.branches, br.short] })}
                        className={`text-sm px-2 py-1 rounded-full border font-bold cursor-pointer ${bm.branches.includes(br.short) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>{br.short}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-600 mb-1.5">對象</div>
                  <div className="flex flex-wrap gap-1.5">
                    {AUDIENCE_OPTIONS.map(a => (
                      <button key={a} type="button" onClick={() => setBm({ ...bm, audience: bm.audience.includes(a) ? bm.audience.filter(x => x !== a) : [...bm.audience, a] })}
                        className={`text-sm px-2 py-1 rounded-full border font-bold cursor-pointer ${bm.audience.includes(a) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>{a}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveEdit} disabled={loading} className="text-sm font-bold bg-brand-600 text-white px-3 py-2 rounded-lg border-0 cursor-pointer disabled:opacity-60">儲存</button>
                  <button onClick={() => setEditingId(null)} className="text-sm font-bold bg-slate-100 text-slate-600 px-3 py-2 rounded-lg border-0 cursor-pointer">取消</button>
                </div>
              </div>
            ) : (
              <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm">{b.title}</span>
                      <span className={`text-sm px-1.5 py-0.5 rounded font-bold ${b.mode === 'troop_participation' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-800'}`}>{b.mode === 'troop_participation' ? '旅團參與' : '資訊性'}</span>
                      {b.activityType && <span className="text-sm bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">🏷️ {b.activityType}</span>}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">{b.source || '—'}{b.fee ? ` · ${b.fee}` : ''} · 截止 {b.internalDeadline || b.officialDeadline || '—'}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(b.branchTags || ['全旅']).map((t, i) => <span key={i} className="text-sm bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-bold">{t}</span>)}
                      {(b.audienceTags || []).map((t, i) => <span key={i} className="text-sm bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-bold">{t}</span>)}
                    </div>
                  </div>
                  {isLeader && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="text-sm text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 border-0 bg-transparent cursor-pointer" onClick={() => startEdit(b)}>✏️</button>
                      <button className="text-sm text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 border-0 bg-transparent cursor-pointer" onClick={() => del(b.id, b.title)}>🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═════ 日常公告 PDF ═════ */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-bold text-base m-0">日常公告 PDF</h2>
        {pdfs.length === 0 ? (
          <p className="text-sm text-slate-500 m-0 py-4 text-center">暫無公告 PDF，上傳後會顯示在這裡。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pdfs.map(pdf => (
              <div key={pdf.id} className="rounded-xl border border-slate-200 p-3 relative">
                {pdf.visible === false && <span className="absolute top-2 right-2 text-sm bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">已隱藏</span>}
                <h3 className="font-bold text-sm m-0 pr-16">📄 {pdf.name}</h3>
                <p className="text-sm text-slate-500 m-0 mt-1">更新：{pdf.updatedAt || '—'}{pdf.size ? ` · ${pdf.size}` : ''}</p>
                {(pdf.branchTags || []).length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{(pdf.branchTags || []).map((t: string, i: number) => <span key={i} className="text-sm bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-bold">{t}</span>)}</div>}
                {(pdf.audienceTags || []).length > 0 && <div className="flex flex-wrap gap-1 mt-1">{(pdf.audienceTags || []).map((t: string, i: number) => <span key={i} className="text-sm bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-bold">{t}</span>)}</div>}
                <a className="inline-block mt-2 text-sm font-bold bg-slate-700 text-white px-3 py-2 rounded-lg no-underline" href={pdf.url} target="_blank">查看</a>
                {isLeader && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    <button className="text-sm font-bold text-slate-600 bg-slate-100 rounded-lg px-2.5 py-1.5 border-0 cursor-pointer hover:bg-slate-200" onClick={() => startEditPdf(pdf)}>🏷️ 標籤</button>
                    {pdf.visible !== false
                      ? <button className="text-sm font-bold text-rose-600 bg-rose-50 rounded-lg px-2.5 py-1.5 border-0 cursor-pointer" onClick={() => hidePdf(pdf.id, pdf.name)}>隱藏</button>
                      : <button className="text-sm font-bold text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5 border-0 cursor-pointer" onClick={() => showPdf(pdf.id)}>顯示</button>}
                  </div>
                )}
                {editingPdfId === pdf.id && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl space-y-2">
                    <div className="text-sm font-bold text-slate-600">支部標籤：</div>
                    <div className="flex flex-wrap gap-1.5">
                      {branches.map(b => (
                        <button key={b.id} type="button" onClick={() => setPdfBranches(prev => prev.includes(b.short) ? prev.filter((x: string) => x !== b.short) : [...prev, b.short])}
                          className={`text-sm px-2 py-1 rounded-full border font-bold cursor-pointer ${pdfBranches.includes(b.short) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}>{b.short}</button>
                      ))}
                    </div>
                    <div className="text-sm font-bold text-slate-600">對象：</div>
                    <div className="flex flex-wrap gap-1.5">
                      {AUDIENCE_OPTIONS.map(a => (
                        <button key={a} type="button" onClick={() => setPdfAudience(prev => prev.includes(a) ? prev.filter((x: string) => x !== a) : [...prev, a])}
                          className={`text-sm px-2 py-1 rounded-full border font-bold cursor-pointer ${pdfAudience.includes(a) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>{a}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button className="text-sm font-bold bg-brand-600 text-white px-3 py-2 rounded-lg border-0 cursor-pointer disabled:opacity-60" disabled={loading} onClick={() => savePdfTags(pdf.id)}>儲存</button>
                      <button className="text-sm font-bold bg-slate-100 text-slate-600 px-3 py-2 rounded-lg border-0 cursor-pointer" onClick={() => setEditingPdfId(null)}>取消</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═════ Drive 資料夾設定（領袖）═════ */}
      {isLeader && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-bold text-base m-0">Drive 資料夾設定</h2>
          <p className="text-sm text-slate-500 m-0">把集會安排 PDF 放入指定 Google Drive 資料夾，前端自動列出。資料夾需設為「知道連結的人都可檢視」。</p>
          <label className={labelCls}>資料夾 ID 或完整 URL
            <input className={inputCls} value={folderId} onChange={e => setFolderId(e.target.value)} placeholder="https://drive.google.com/drive/folders/XXXX 或直接填 XXXX" />
          </label>
          <div className="flex gap-2">
            <button className="text-sm font-bold bg-brand-600 text-white px-3 py-2 rounded-lg border-0 cursor-pointer" onClick={saveFolder}>儲存</button>
            <button className="text-sm font-bold bg-slate-100 text-slate-600 px-3 py-2 rounded-lg border-0 cursor-pointer" onClick={reload}>重新讀取</button>
          </div>
        </section>
      )}

      {/* ═════ 公告表單（inline modal）═════ */}
      {form && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base m-0">{form.id ? '✏️ 編輯公告' : '📢 發佈公告'}</h3>
            <label className={labelCls}>標題<input className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：9月20日露營因天氣取消" /></label>
            <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">內容
              <textarea rows={4} className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="寫清楚發生咩事、成員／家長要做咩、限期" />
            </label>
            <label className={labelCls}>對象
              <select className={inputCls} value={form.scope === 'troop' ? 'troop' : form.branchId} onChange={e => { const v = e.target.value; setForm({ ...form, scope: v === 'troop' ? 'troop' : 'branch', branchId: v === 'troop' ? '' : v }); }}>
                <option value="troop">全旅</option>
                {Object.entries(BRANCH_NAME).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            {formErr && <p className="text-sm font-bold text-rose-700 bg-rose-50 rounded-lg px-2.5 py-2 m-0">{formErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={saveAnn} disabled={loading} className="flex-1 text-sm font-bold bg-brand-600 text-white py-2.5 rounded-xl border-0 cursor-pointer disabled:opacity-60">{loading ? '儲存中…' : form.id ? '儲存' : '發佈'}</button>
              <button onClick={() => { setForm(null); setFormErr(''); }} className="flex-1 text-sm font-bold bg-slate-100 text-slate-600 py-2.5 rounded-xl border-0 cursor-pointer">取消</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
