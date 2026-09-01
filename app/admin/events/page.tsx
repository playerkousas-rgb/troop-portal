'use client';
import { useEffect, useState } from 'react';
import { AppState, loadStateSlice, eventCategory, eventCategoryLabel } from '@/lib/store';
import { apiCreateEvent, apiPublishEvent, apiUpdateEvent, apiDeleteEvent } from '@/lib/api';
import { branches } from '@/lib/model';
import Link from 'next/link';

const CATEGORY_OPTIONS = [
  { id: 'self', label: '🏠 自行舉辦（原旅團自辦）' },
  { id: 'district', label: '🗺️ 區地域總會活動（原圖書館引入）' },
];

export default function Page() {
  const [s, setS] = useState<AppState | null>(null); const [err, setErr] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  // add form
  const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [location, setLocation] = useState('');
  const [scope, setScope] = useState<'troop' | 'branch'>('troop'); const [branchId, setBranchId] = useState(''); const [fee, setFee] = useState('');
  const [paymentUrl, setPaymentUrl] = useState(''); const [dutyPatrol, setDutyPatrol] = useState('');
  const [category, setCategory] = useState<'self' | 'district'>('self');
  const [calendarTag, setCalendarTag] = useState('');
  // edit form
  const [editTitle, setEditTitle] = useState(''); const [editDate, setEditDate] = useState(''); const [editLocation, setEditLocation] = useState('');
  const [editFee, setEditFee] = useState(''); const [editScope, setEditScope] = useState<'troop' | 'branch'>('troop'); const [editBranchId, setEditBranchId] = useState('');
  const [editPaymentUrl, setEditPaymentUrl] = useState(''); const [editDutyPatrol, setEditDutyPatrol] = useState('');
  const [editCategory, setEditCategory] = useState<'self' | 'district'>('self');
  const [editCalendarTag, setEditCalendarTag] = useState('');

  useEffect(() => { loadStateSlice(['events']).then(setS).catch(e => setErr(e.message)) }, []);

  async function add() {
    if (!title.trim()) { setErr('請填活動標題'); return; }
    if (date && !calendarTag.trim()) { setErr('此活動有日期，請加入「行事曆標籤」以便加入行事曆。'); return; }
    setErr('');
    try {
      const fresh = await apiCreateEvent({
        title, scope, branchId: scope === 'branch' ? branchId : '', date: date || undefined, location: location || undefined,
        fee: fee || undefined, paymentUrl: paymentUrl || undefined, dutyPatrol: dutyPatrol || undefined,
        category, calendarTag: calendarTag || undefined, status: 'draft',
      });
      setS(fresh); setTitle(''); setDate(''); setLocation(''); setFee(''); setPaymentUrl(''); setDutyPatrol(''); setCalendarTag(''); setShowAdd(false);
    } catch (e: any) { setErr(e.message) }
  }

  function startEdit(id: string) {
    const e = s?.events.find(x => x.id === id);
    if (!e) return;
    setEditing(id); setEditTitle(e.title); setEditDate(e.date); setEditLocation(e.location);
    setEditFee(e.fee || ''); setEditScope(e.scope as any); setEditBranchId(e.branchId || '');
    setEditPaymentUrl(e.paymentUrl || ''); setEditDutyPatrol(e.dutyPatrol || '');
    setEditCategory(eventCategory(e)); setEditCalendarTag(e.calendarTag || '');
  }

  async function saveEdit() {
    if (!editing) return;
    if (editDate && !editCalendarTag.trim()) { setErr('此活動有日期，請加入「行事曆標籤」。'); return; }
    setErr('');
    try {
      const fresh = await apiUpdateEvent({
        eventId: editing, title: editTitle, date: editDate, location: editLocation, fee: editFee,
        scope: editScope, branchId: editScope === 'branch' ? editBranchId : '',
        paymentUrl: editPaymentUrl, dutyPatrol: editDutyPatrol, category: editCategory, calendarTag: editCalendarTag,
      });
      setS(fresh); setEditing(null);
    } catch (e: any) { setErr(e.message) }
  }

  async function publish(id: string) { setErr(''); try { const f = await apiPublishEvent(id); setS(f) } catch (e: any) { setErr(e.message) } }
  async function del(id: string) { if (!confirm('確定刪除此活動？')) return; setErr(''); try { const f = await apiDeleteEvent(id); setS(f); if (editing === id) setEditing(null) } catch (e: any) { setErr(e.message) } }

  if (!s) return <div className="card">{err || '載入中...'}</div>;

  return <div className="stack">
    <section className="hero">
      <span className="badge gold">活動管理</span>
      <h1>🎯 活動管理</h1>
      <p>活動統一分成兩類：<b>自行舉辦</b>（原旅團自辦）及 <b>區地域總會活動</b>（原圖書館引入）。發布後會出現在行事曆。</p>
      <div className="row" style={{ marginTop: 6 }}>
        <Link href="/admin/registrations" className="btn gold">📊 活動統計 →</Link>
      </div>
    </section>
    {err && <p className="badge red">{err}</p>}

    <button className="btn primary" onClick={() => setShowAdd(!showAdd)}>{showAdd ? '取消' : '＋ 新增活動'}</button>

    {showAdd && <section className="card stack"><h3>新增活動</h3>
      <div className="grid">
        <label>活動標題 *<input value={title} onChange={e => setTitle(e.target.value)} placeholder="活動標題 *" /></label>
        <label>分類
          <select value={category} onChange={e => setCategory(e.target.value as any)}>
            {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label>日期<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>地點<input value={location} onChange={e => setLocation(e.target.value)} placeholder="地點" /></label>
        <label>費用（如 $80）<input value={fee} onChange={e => setFee(e.target.value)} placeholder="費用" /></label>
        <label>收款連結<input value={paymentUrl} onChange={e => setPaymentUrl(e.target.value)} placeholder="可留空" /></label>
        <label>值日小隊<input value={dutyPatrol} onChange={e => setDutyPatrol(e.target.value)} placeholder="例如：TIGER" /></label>
        <label>行事曆標籤 🏷️<input value={calendarTag} onChange={e => setCalendarTag(e.target.value)} placeholder="例如：露營／服務／訓練" /></label>
        <label>範圍<select value={scope} onChange={e => setScope(e.target.value as any)}><option value="troop">全旅</option><option value="branch">支部</option></select></label>
        {scope === 'branch' && <label>支部<select value={branchId} onChange={e => setBranchId(e.target.value)}><option value="">選擇支部</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      </div>
      <p className="muted" style={{ margin: 0 }}>💡 有日期的活動請加入「行事曆標籤」，方便喺行事曆分類顯示。</p>
      <button className="btn primary" onClick={add}>新增活動（草稿）</button>
    </section>}

    <section className="grid-wide">{s.events.map(e => {
      const isEdit = editing === e.id;
      const cat = eventCategory(e);
      return <div className="card" key={e.id}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className={`badge ${e.status === 'published' ? 'green' : 'gold'}`}>{e.status === 'published' ? '已發布' : '草稿'}</span>
          <span className={`badge ${cat === 'district' ? 'purple' : 'blue'}`}>{eventCategoryLabel(e)}</span>
        </div>
        {isEdit ? <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ fontSize: '1.1em', fontWeight: 'bold', margin: '8px 0' }} /> : <h3>{e.title}</h3>}

        {isEdit ? (
          <div className="stack" style={{ gap: 6 }}>
            <label>分類<select value={editCategory} onChange={e => setEditCategory(e.target.value as any)}>{CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
            <label>日期<input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></label>
            <label>地點<input value={editLocation} onChange={e => setEditLocation(e.target.value)} /></label>
            <label>費用<input value={editFee} onChange={e => setEditFee(e.target.value)} /></label>
            <label>收款連結<input value={editPaymentUrl} onChange={e => setEditPaymentUrl(e.target.value)} /></label>
            <label>值日小隊<input value={editDutyPatrol} onChange={e => setEditDutyPatrol(e.target.value)} /></label>
            <label>行事曆標籤 🏷️<input value={editCalendarTag} onChange={e => setEditCalendarTag(e.target.value)} placeholder="露營／服務／訓練" /></label>
            <select value={editScope} onChange={e => setEditScope(e.target.value as any)}><option value="troop">全旅</option><option value="branch">支部</option></select>
            {editScope === 'branch' && <select value={editBranchId} onChange={e => setEditBranchId(e.target.value)}><option value="">選擇支部</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
            <div className="row"><button className="btn primary" onClick={saveEdit}>儲存</button><button className="btn" onClick={() => setEditing(null)}>取消</button></div>
          </div>
        ) : (
          <>
            <p className="muted">{e.date} · {e.location || '待定'} · {e.scope === 'troop' ? '全旅' : '支部'}{e.fee ? ` · ${e.fee}` : ''}</p>
            {e.calendarTag && <p className="muted" style={{ margin: 0 }}>🏷️ 行事曆標籤：{e.calendarTag}</p>}
            {e.paymentUrl && <p className="muted" style={{ color: '#b06000', margin: 0 }}>💳 已設收款連結</p>}
            {e.dutyPatrol && <p className="muted" style={{ color: 'purple', margin: 0 }}>🪖 值日：{e.dutyPatrol}</p>}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => startEdit(e.id)}>✏️ 編輯</button>
              {e.status === 'draft' && <button className="btn primary" onClick={() => publish(e.id)}>發布</button>}
              <button className="btn" onClick={() => del(e.id)}>🗑️ 刪除</button>
            </div>
          </>
        )}
      </div>;
    })}</section>
  </div>;
}
