'use client';
import { useEffect, useRef, useState } from 'react';
import { AppState, loadStateSlice, eventCategory, eventCategoryLabel, EventItem } from '@/lib/store';
import { apiCreateEvent, apiPublishEvent, apiUpdateEvent, apiDeleteEvent, apiArchiveEvent, apiRestoreEvent, apiReopenEvent } from '@/lib/api';
import { parseNoticeText } from '@/lib/noticeParser';
import { branches } from '@/lib/model';
import Link from 'next/link';
import { useConfirm, kv } from '@/components/ConfirmProvider';
import Auth from '@/components/Auth';

/**
 * 活動管理
 * ─ 旅團活動（旅團自己舉辦）：3 種加入方法
 *     1️⃣ 純在 APP 打入資料　2️⃣ 上載通告（.docx / .txt 自動讀資料）　3️⃣ 加入通告連結
 * ─ 區地域總會活動（外部）：2 種加入方法
 *     1️⃣ 通告圖書館引入　2️⃣ 貼上通告連結
 *   區地域總會活動唔做統計，領袖只係精選啱嘅通告畀成員睇，想報就報。
 * ─ 過期通告：一鍵處理過期活動 —— 旅團活動封存到「過期通告」（可查回）；
 *   外部（區地域總會）通告直接刪除。
 *
 * ★ 呢一頁唔再有「活動相簿」（用戶要求 #2）：通告係活動**之前**先出現，
 *   相片係活動**之後**先有，兩者唔會同時存在，擺喺同一張活動卡只會混亂。
 *   相簿連結改由領袖喺底部「📷 相簿」頁補上（活動完結後），成員／家長都喺嗰度睇。
 */

const LIBRARY_URL = 'https://scout-circulars.vercel.app/';

type SelfMode = 'form' | 'upload' | 'link';
type DistrictMode = 'library' | 'link';

const SELF_MODES: { id: SelfMode; label: string; desc: string }[] = [
  { id: 'form', label: '1️⃣ 純在 APP 打入資料', desc: '直接填寫活動資料，成員在 APP 內回覆。' },
  { id: 'upload', label: '2️⃣ 上載通告', desc: '上載 .docx／.txt 通告，系統自動讀出標題、日期、地點、費用。' },
  { id: 'link', label: '3️⃣ 加入通告連結', desc: '已有 PDF／Google Drive／表格連結，貼上即可。' },
];

const DISTRICT_MODES: { id: DistrictMode; label: string; desc: string }[] = [
  { id: 'library', label: '1️⃣ 通告圖書館引入', desc: '由童軍通告圖書館挑選通告帶入。' },
  { id: 'link', label: '2️⃣ 貼上通告連結', desc: '直接貼上通告連結，成員自行決定報唔報。' },
];

/** 已報名／已付款人數（過期處理前要話畀領袖知） */
function replyCounts(s: AppState | null, eventId: string) {
  const rs = (s?.replies || []).filter(r => r.eventId === eventId);
  return {
    total: rs.length,
    registered: rs.filter(r => r.type === 'registered').length,
    paid: rs.filter(r => r.paid).length,
  };
}

function isExpired(e: EventItem): boolean {
  if (!e.date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return e.date < today;
}


export default function Page() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [tab, setTab] = useState<'self' | 'district' | 'archived'>('self');

  // 新增表單（共用欄位）
  const [showAdd, setShowAdd] = useState(false);
  const [selfMode, setSelfMode] = useState<SelfMode>('form');
  const [districtMode, setDistrictMode] = useState<DistrictMode>('library');
  const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [location, setLocation] = useState('');
  const [scope, setScope] = useState<'troop' | 'branch'>('troop'); const [branchId, setBranchId] = useState(''); const [fee, setFee] = useState('');
  const [paymentUrl, setPaymentUrl] = useState(''); const [dutyPatrol, setDutyPatrol] = useState('');
  const [calendarTag, setCalendarTag] = useState('');
  const [noticeUrl, setNoticeUrl] = useState('');
  const [noticeFileName, setNoticeFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // 編輯表單
  const [editTitle, setEditTitle] = useState(''); const [editDate, setEditDate] = useState(''); const [editLocation, setEditLocation] = useState('');
  const [editFee, setEditFee] = useState(''); const [editScope, setEditScope] = useState<'troop' | 'branch'>('troop'); const [editBranchId, setEditBranchId] = useState('');
  const [editPaymentUrl, setEditPaymentUrl] = useState(''); const [editDutyPatrol, setEditDutyPatrol] = useState('');
  const [editCategory, setEditCategory] = useState<'self' | 'district'>('self');
  const [editCalendarTag, setEditCalendarTag] = useState('');
  const [editNoticeUrl, setEditNoticeUrl] = useState('');

  const { confirm } = useConfirm();

  useEffect(() => { loadStateSlice(['events', 'replies']).then(setS).catch(e => setErr(e.message)) }, []);

  // 上方統計／領袖工具卡用 ?tab=self|district|archived 直接跳入對應分頁，
  // 唔會再出現「撳咗區地域總會，但打開仍然係旅團活動」。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'self' || t === 'district' || t === 'archived') setTab(t);
  }, []);

  const category: 'self' | 'district' = tab === 'district' ? 'district' : 'self';
  const inputMode: string = tab === 'district' ? districtMode : selfMode;
  const needsLink = (tab === 'district' && districtMode === 'link') || (tab === 'self' && selfMode === 'link');

  function resetForm() {
    setTitle(''); setDate(''); setLocation(''); setFee(''); setPaymentUrl('');
    setDutyPatrol(''); setCalendarTag(''); setNoticeUrl(''); setNoticeFileName('');
    if (fileRef.current) fileRef.current.value = '';
  }

  /** 上載通告：讀 .docx / .txt，自動填入表單欄位 */
  async function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setErr(''); setMsg('');
    try {
      let text = '';
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        text = await file.text();
      } else if (file.name.endsWith('.docx')) {
        const mammoth = await import('mammoth/mammoth.browser');
        const arrayBuffer = await file.arrayBuffer();
        text = (await mammoth.extractRawText({ arrayBuffer })).value;
      } else {
        setErr('請上載 .docx 或 .txt 通告檔案。');
        return;
      }
      const parsed = parseNoticeText(text);
      setNoticeFileName(file.name);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.eventDate) setDate(parsed.eventDate);
      if (parsed.location || parsed.gatherLocation) setLocation(parsed.location || parsed.gatherLocation || '');
      if (parsed.fee) setFee(parsed.fee);
      if (parsed.attachmentUrl || parsed.documentUrl) setNoticeUrl(parsed.attachmentUrl || parsed.documentUrl || '');
      setMsg(`✅ 已讀取「${file.name}」，請檢查下面欄位再新增。`);
    } catch (e: any) {
      setErr('讀取檔案失敗：' + (e?.message || String(e)));
    }
  }

  async function add() {
    if (!title.trim()) { setErr('請填活動標題'); return; }
    if (needsLink && !noticeUrl.trim()) { setErr('此方法需要通告連結，請貼上連結。'); return; }
    if (category === 'self' && date && !calendarTag.trim()) { setErr('此活動有日期，請加入「行事曆標籤」以便加入行事曆。'); return; }
    setErr(''); setMsg('');
    const modeLabel = category === 'district'
      ? DISTRICT_MODES.find(m => m.id === districtMode)?.label
      : SELF_MODES.find(m => m.id === selfMode)?.label;
    const ok = await confirm({
      title: '確認新增活動（草稿）',
      message: kv([
        ['活動標題', title],
        ['分類', category === 'district' ? '區地域總會活動（不做統計）' : '旅團活動'],
        ['加入方法', modeLabel || ''],
        ['日期', date],
        ['通告連結', noticeUrl],
        ['地點', location],
        ['範圍', scope === 'troop' ? '全旅' : `支部 ${branchId || '（未選）'}`],
        ['費用', fee],
      ]),
      confirmLabel: '確認新增',
    });
    if (!ok) return;
    try {
      const fresh = await apiCreateEvent({
        title, scope, branchId: scope === 'branch' ? branchId : '', date: date || undefined, location: location || undefined,
        fee: fee || undefined, paymentUrl: paymentUrl || undefined, dutyPatrol: dutyPatrol || undefined,
        category, calendarTag: calendarTag || undefined, status: 'draft',
        noticeUrl: noticeUrl || undefined, noticeFileName: noticeFileName || undefined,
        inputMode: inputMode === 'library' ? 'link' : inputMode,
      });
      setS(fresh); resetForm(); setShowAdd(false); setMsg('✅ 已新增草稿，記得按「發布」。');
    } catch (e: any) { setErr(e.message) }
  }

  function startEdit(id: string) {
    const e = s?.events.find(x => x.id === id);
    if (!e) return;
    setEditing(id); setEditTitle(e.title); setEditDate(e.date); setEditLocation(e.location);
    setEditFee(e.fee || ''); setEditScope(e.scope as any); setEditBranchId(e.branchId || '');
    setEditPaymentUrl(e.paymentUrl || ''); setEditDutyPatrol(e.dutyPatrol || '');
    setEditCategory(eventCategory(e)); setEditCalendarTag(e.calendarTag || '');
    setEditNoticeUrl(e.noticeUrl || '');
  }

  async function saveEdit() {
    if (!editing) return;
    if (editCategory === 'self' && editDate && !editCalendarTag.trim()) { setErr('此活動有日期，請加入「行事曆標籤」。'); return; }
    setErr('');
    const ok = await confirm({
      title: '確認儲存活動修改',
      message: kv([
        ['活動標題', editTitle],
        ['分類', editCategory === 'district' ? '區地域總會活動' : '旅團活動'],
        ['日期', editDate],
        ['通告連結', editNoticeUrl],
        ['地點', editLocation],
        ['範圍', editScope === 'troop' ? '全旅' : `支部 ${editBranchId || '（未選）'}`],
        ['費用', editFee],
      ]),
      confirmLabel: '確認儲存',
    });
    if (!ok) return;
    try {
      const fresh = await apiUpdateEvent({
        eventId: editing, title: editTitle, date: editDate, location: editLocation, fee: editFee,
        scope: editScope, branchId: editScope === 'branch' ? editBranchId : '',
        paymentUrl: editPaymentUrl, dutyPatrol: editDutyPatrol, category: editCategory,
        calendarTag: editCalendarTag, noticeUrl: editNoticeUrl,
      });
      setS(fresh); setEditing(null);
    } catch (e: any) { setErr(e.message) }
  }

  async function publish(id: string) {
    setErr('');
    const e = s?.events.find(x => x.id === id);
    const ok = await confirm({ title: '確認發布活動', message: kv([['活動', e?.title || id]]), confirmLabel: '確認發布' });
    if (!ok) return;
    try { const f = await apiPublishEvent(id); setS(f) } catch (e: any) { setErr(e.message) }
  }

  /** 過期處理：旅團活動 → 過期通告；區地域總會（外部）→ 直接刪除 */
  async function expire(id: string) {
    const e = s?.events.find(x => x.id === id);
    if (!e) return;
    const district = eventCategory(e) === 'district';
    const c = replyCounts(s, id);
    const ok = await confirm({
      title: district ? '確認刪除過期外部通告' : '確認放入過期通告',
      message: kv([
        ['活動', e.title],
        // 區地域總會活動係純通告（唔收報名／唔收錢），所以唔會有報名數字
        ...(district ? [] : [['已報名', `${c.registered} 人（其中 ${c.paid} 人已付款）`] as [string, string]]),
        ['處理方式', district
          ? '外部（區地域總會）通告 → 直接刪除（純通告，冇報名及付款紀錄）'
          : '旅團活動 → 移入「過期通告」；報名及付款紀錄全部保留，隨時可查回或還原'],
      ]),
      confirmLabel: district ? '確認刪除' : '確認移入過期通告',
      danger: district,
    });
    if (!ok) return;
    setErr('');
    try { const f = await apiArchiveEvent(id); setS(f); setMsg(district ? '🗑️ 已刪除過期外部通告。' : '📥 已放入過期通告。') } catch (e: any) { setErr(e.message) }
  }

  async function restore(id: string) {
    const e = s?.events.find(x => x.id === id);
    const ok = await confirm({ title: '確認還原活動', message: kv([['活動', e?.title || id]]), confirmLabel: '確認還原' });
    if (!ok) return;
    setErr('');
    try { const f = await apiRestoreEvent(id); setS(f); setMsg('✅ 已還原成已發布。') } catch (e: any) { setErr(e.message) }
  }

  /** 重開報名：遲咗報但領袖想畀佢報 */
  async function reopen(id: string) {
    const e = s?.events.find(x => x.id === id);
    const ok = await confirm({
      title: '確認重開報名',
      message: kv([
        ['活動', e?.title || id],
        ['效果', '活動會重新變成「已發布」，家長／成員可以補交報名'],
        ['提示', '已有的報名及付款紀錄不受影響'],
      ]),
      confirmLabel: '確認重開報名',
    });
    if (!ok) return;
    setErr('');
    try { const f = await apiReopenEvent(id); setS(f); setMsg('✅ 已重開報名，家長／成員可以補報。') } catch (e: any) { setErr(e.message) }
  }

  async function del(id: string) {
    const e = s?.events.find(x => x.id === id);
    const ok = await confirm({
      title: '確認刪除活動',
      message: kv([['活動', e?.title || id], ['注意', '刪除後相關報名紀錄亦會一併移除']]),
      confirmLabel: '確認刪除',
      danger: true,
    });
    if (!ok) return;
    setErr(''); try { const f = await apiDeleteEvent(id); setS(f); if (editing === id) setEditing(null) } catch (e: any) { setErr(e.message) }
  }

  if (!s) return <div className="card">{err || '載入中...'}</div>;

  const all = s.events || [];
  const archived = all.filter(e => e.status === 'archived');
  const active = all.filter(e => e.status !== 'archived');
  const selfEvents = active.filter(e => eventCategory(e) === 'self');
  const districtEvents = active.filter(e => eventCategory(e) === 'district');
  const list = tab === 'archived' ? archived : tab === 'district' ? districtEvents : selfEvents;
  const expiredCount = active.filter(isExpired).length;

  return <Auth roles={['super_admin', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach']}><div className="stack">
    <section className="hero">
      <span className="badge gold">活動管理</span>
      <h1>🎯 活動管理</h1>
      <p>
        <b>旅團活動</b>有 3 種加入方法（APP 打字／上載通告／通告連結）；
        <b>區地域總會活動</b>有 2 種（通告圖書館引入／貼上通告連結，<b>不做統計</b>，成員想報就報）。
      </p>
      <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
        <Link href="/admin/registrations" className="btn gold">📊 活動統計（只計旅團活動）→</Link>
      </div>
    </section>

    {err && <p className="badge red">{err}</p>}
    {msg && <p className="badge green">{msg}</p>}

    {/* 分頁：旅團活動 / 區地域總會 / 過期通告（可由上方統計用 ?tab= 直接跳入） */}
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      <button type="button" className={`btn ${tab === 'self' ? 'primary' : ''}`} onClick={() => { setTab('self'); setShowAdd(false); }}>🏠 旅團活動（{selfEvents.length}）</button>
      <button type="button" className={`btn ${tab === 'district' ? 'primary' : ''}`} onClick={() => { setTab('district'); setShowAdd(false); }}>🗺️ 區地域總會活動（{districtEvents.length}）</button>
      <button type="button" className={`btn ${tab === 'archived' ? 'primary' : ''}`} onClick={() => { setTab('archived'); setShowAdd(false); }}>🗂️ 過期通告（{archived.length}）</button>
    </div>

    {expiredCount > 0 && tab !== 'archived' && (
      <p className="badge gold">⏰ 有 {expiredCount} 個活動日期已過，可按卡片上的「⏰ 過期處理」整理。</p>
    )}

    {tab !== 'archived' && (
      <button className="btn primary" onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? '取消' : tab === 'district' ? '＋ 加入區地域總會活動' : '＋ 新增旅團活動'}
      </button>
    )}

    {showAdd && tab !== 'archived' && <section className="card stack">
      <h3>{tab === 'district' ? '加入區地域總會活動' : '新增旅團活動'}</h3>

      {/* 加入方法揀選 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        {(tab === 'district' ? DISTRICT_MODES : SELF_MODES).map(m => {
          const activeMode = tab === 'district' ? districtMode === m.id : selfMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className="card"
              style={{ textAlign: 'left', cursor: 'pointer', padding: 10, borderWidth: 2, borderColor: activeMode ? '#1a73e8' : '#e0e0e0', background: activeMode ? '#e8f0fe' : '#fff' }}
              onClick={() => { tab === 'district' ? setDistrictMode(m.id as DistrictMode) : setSelfMode(m.id as SelfMode); }}
            >
              <strong style={{ display: 'block' }}>{m.label}</strong>
              <span className="muted" style={{ fontSize: '0.83rem' }}>{m.desc}</span>
            </button>
          );
        })}
      </div>

      {/* 方法 2（旅團活動）：上載通告 */}
      {tab === 'self' && selfMode === 'upload' && (
        <div className="card stack" style={{ background: '#f8fafc' }}>
          <label>上載通告檔案（.docx / .txt）
            <input ref={fileRef} type="file" accept=".docx,.txt" onChange={handleFile} />
          </label>
          {noticeFileName && <p className="badge green" style={{ margin: 0 }}>📄 已讀取：{noticeFileName}</p>}
          <p className="muted" style={{ margin: 0 }}>系統會嘗試讀出標題、日期、地點、費用；讀唔到嘅欄位可以自己補。</p>
        </div>
      )}

      {/* 方法：通告連結（旅團活動 3 / 區地域總會 2） */}
      {needsLink && (
        <label>通告連結 *
          <input value={noticeUrl} onChange={e => setNoticeUrl(e.target.value)} placeholder="https://... （PDF／Google Drive／報名表格）" />
        </label>
      )}

      {/* 方法（區地域總會 1）：圖書館引入 */}
      {tab === 'district' && districtMode === 'library' && (
        <div className="card stack" style={{ background: '#fffef0' }}>
          <p className="muted" style={{ margin: 0 }}>喺圖書館揀好通告後，用「引入」帶入資料；或者喺下面自行填寫標題／連結。</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <a className="btn primary" href={LIBRARY_URL} target="_blank" rel="noopener noreferrer">📚 打開通告圖書館</a>
          </div>
          <label>通告連結（可選）
            <input value={noticeUrl} onChange={e => setNoticeUrl(e.target.value)} placeholder="https://..." />
          </label>
        </div>
      )}

      <div className="grid">
        <label>活動標題 *<input value={title} onChange={e => setTitle(e.target.value)} placeholder="活動標題 *" /></label>
        <label>日期<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>地點<input value={location} onChange={e => setLocation(e.target.value)} placeholder="地點" /></label>
        <label>費用（如 $80）<input value={fee} onChange={e => setFee(e.target.value)} placeholder="費用" /></label>
        {tab === 'self' && <>
          <label>收款連結<input value={paymentUrl} onChange={e => setPaymentUrl(e.target.value)} placeholder="可留空" /></label>
          <label>值日小隊<input value={dutyPatrol} onChange={e => setDutyPatrol(e.target.value)} placeholder="例如：TIGER" /></label>
          <label>行事曆標籤 🏷️<input value={calendarTag} onChange={e => setCalendarTag(e.target.value)} placeholder="例如：露營／服務／訓練" /></label>
        </>}
        <label>範圍<select value={scope} onChange={e => setScope(e.target.value as any)}><option value="troop">全旅</option><option value="branch">支部</option></select></label>
        {scope === 'branch' && <label>支部<select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="">選擇支部</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      </div>

      {tab === 'district'
        ? <p className="muted" style={{ margin: 0 }}>ℹ️ 區地域總會活動<b>唔會做報名統計</b> —— 只係精選通告畀成員睇，佢想報就自己報。</p>
        : <p className="muted" style={{ margin: 0 }}>💡 有日期的活動請加入「行事曆標籤」，方便喺行事曆分類顯示。</p>}

      <button className="btn primary" onClick={add}>新增活動（草稿）</button>
    </section>}

    {list.length === 0 && (
      <section className="card"><p className="muted" style={{ margin: 0 }}>
        {tab === 'archived' ? '未有過期通告。旅團活動過期後放入這裡，隨時可以查回。' : '暫無活動，用上面的按鈕加入。'}
      </p></section>
    )}

    <section className="grid-wide">{list.map(e => {
      const isEdit = editing === e.id;
      const cat = eventCategory(e);
      const expired = isExpired(e);
      return <div className="card" key={e.id} style={e.status === 'archived' ? { background: '#f8fafc' } : expired ? { borderColor: '#f9ab00' } : undefined}>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
          <span className={`badge ${e.status === 'published' ? 'green' : e.status === 'archived' ? '' : 'gold'}`}>
            {e.status === 'published' ? '已發布' : e.status === 'archived' ? '🗂️ 過期通告' : '草稿'}
          </span>
          <span className={`badge ${cat === 'district' ? 'purple' : 'blue'}`}>{eventCategoryLabel(e)}</span>
        </div>
        {expired && e.status !== 'archived' && <p className="badge gold" style={{ marginTop: 6 }}>⏰ 日期已過</p>}
        {isEdit ? <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ fontSize: '1.1em', fontWeight: 'bold', margin: '8px 0' }} /> : <h3>{e.title}</h3>}

        {isEdit ? (
          <div className="stack" style={{ gap: 6 }}>
            <label>分類<select value={editCategory} onChange={e => setEditCategory(e.target.value as any)}>
              <option value="self">🏠 旅團活動</option>
              <option value="district">🗺️ 區地域總會活動（不做統計）</option>
            </select></label>
            <label>日期<input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></label>
            <label>地點<input value={editLocation} onChange={e => setEditLocation(e.target.value)} /></label>
            <label>費用<input value={editFee} onChange={e => setEditFee(e.target.value)} /></label>
            <label>通告連結<input value={editNoticeUrl} onChange={e => setEditNoticeUrl(e.target.value)} placeholder="https://..." /></label>
            <label>收款連結<input value={editPaymentUrl} onChange={e => setEditPaymentUrl(e.target.value)} /></label>
            <label>值日小隊<input value={editDutyPatrol} onChange={e => setEditDutyPatrol(e.target.value)} /></label>
            <label>行事曆標籤 🏷️<input value={editCalendarTag} onChange={e => setEditCalendarTag(e.target.value)} placeholder="露營／服務／訓練" /></label>
            <select value={editScope} onChange={e => setEditScope(e.target.value as any)}><option value="troop">全旅</option><option value="branch">支部</option></select>
            {editScope === 'branch' && <select value={editBranchId} onChange={e => setEditBranchId(e.target.value)}><option value="">選擇支部</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
            <div className="row"><button className="btn primary" onClick={saveEdit}>儲存</button><button className="btn" onClick={() => setEditing(null)}>取消</button></div>
          </div>
        ) : (
          <>
            <p className="muted">{e.date || '未定日期'} · {e.location || '待定'} · {e.scope === 'troop' ? '全旅' : '支部'}{e.fee ? ` · ${e.fee}` : ''}</p>
            {e.calendarTag && <p className="muted" style={{ margin: 0 }}>🏷️ 行事曆標籤：{e.calendarTag}</p>}
            {e.noticeFileName && <p className="muted" style={{ margin: 0 }}>📄 通告檔案：{e.noticeFileName}</p>}
            {e.noticeUrl && <p style={{ margin: 0 }}><a href={e.noticeUrl} target="_blank" rel="noopener noreferrer">🔗 開啟通告連結</a></p>}
            {e.paymentUrl && <p className="muted" style={{ color: '#b06000', margin: 0 }}>💳 已設收款連結</p>}
            {e.dutyPatrol && <p className="muted" style={{ color: 'purple', margin: 0 }}>🪖 值日：{e.dutyPatrol}</p>}
            {cat === 'district'
              ? <p className="muted" style={{ margin: 0 }}>ℹ️ 此類活動不做報名統計</p>
              : (() => { const c = replyCounts(s, e.id); return c.total > 0
                  ? <p className="muted" style={{ margin: 0 }}>👥 已報名 {c.registered} 人 · 💰 已付款 {c.paid} 人{e.status === 'archived' ? '（紀錄已保留）' : ''}</p>
                  : null; })()}
            {e.lateRegistration && <p className="badge blue" style={{ margin: '4px 0 0' }}>🔓 已重開報名（容許補交）</p>}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {e.status === 'archived' ? (
                <>
                  <button className="btn" onClick={() => restore(e.id)}>♻️ 還原</button>
                  <button className="btn primary" onClick={() => reopen(e.id)}>🔓 重開報名（畀人補交）</button>
                  <Link className="btn" href={`/admin/registrations?eventId=${e.id}`}>📊 查看報名紀錄</Link>
                  <button className="btn" onClick={() => del(e.id)}>🗑️ 永久刪除</button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => startEdit(e.id)}>✏️ 編輯</button>
                  {e.status === 'draft' && <button className="btn primary" onClick={() => publish(e.id)}>發布</button>}
                  {cat === 'self' && <Link className="btn" href={`/admin/registrations?eventId=${e.id}`}>📊 統計</Link>}
                  {expired && cat === 'self' && (
                    <button className="btn" onClick={() => reopen(e.id)}>🔓 容許補報</button>
                  )}
                  <button className="btn gold" onClick={() => expire(e.id)}>
                    {cat === 'district' ? '⏰ 過期處理（直接刪除）' : '⏰ 過期處理（放入過期通告）'}
                  </button>
                  <button className="btn" onClick={() => del(e.id)}>🗑️ 刪除</button>
                </>
              )}
            </div>
          </>
        )}
      </div>;
    })}</section>
  </div></Auth>;
}
