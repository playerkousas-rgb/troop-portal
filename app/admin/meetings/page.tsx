'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState } from '@/lib/store';
import { apiCreateMeeting, apiPublishMeeting, apiDeleteMeeting, apiUpdateMeeting } from '@/lib/api';
import { branches } from '@/lib/model';

export default function MeetingsAdmin() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'agenda' | 'minutes'>('agenda');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [targetRoles, setTargetRoles] = useState('');
  const [branchId, setBranchId] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => { loadState().then(setS).catch(e => setErr(e.message)) }, []);

  async function add() {
    if (!title.trim() || !date) { setErr('請填寫標題和日期'); return; }
    try {
      const fresh = await apiCreateMeeting({ title, type, date, startTime, endTime, location, targetRoles, branchId, url });
      setS(fresh); setShowAdd(false); resetForm();
    } catch (e: any) { setErr(e.message) }
  }

  function resetForm() {
    setTitle(''); setType('agenda'); setDate(''); setStartTime(''); setEndTime(''); setLocation(''); setTargetRoles(''); setBranchId(''); setUrl('');
  }

  if (!s) return <div className="card">載入中...</div>;

  return (
    <div className="stack">
      <section className="hero">
        <span className="badge gold">會議管理</span>
        <h1>會議議程與紀錄</h1>
        <p>管理各級會議，標註對象並發布到行事曆。</p>
      </section>

      {err && <p className="badge red">{err}</p>}

      <button className="btn primary" onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? '取消' : '＋ 新增會議'}
      </button>

      {showAdd && (
        <section className="card stack">
          <h3>新增會議項目</h3>
          <div className="grid">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="會議標題 *" />
            <select value={type} onChange={e => setType(e.target.value as any)}>
              <option value="agenda">會議議程</option>
              <option value="minutes">會議紀錄</option>
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="開始時間" />
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="結束時間" />
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="地點" />
            <input value={targetRoles} onChange={e => setTargetRoles(e.target.value)} placeholder="對象 (如：隊長,領袖)" />
            <select value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">全旅</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="文件連結 (Google Drive)" />
          </div>
          <button className="btn primary" onClick={add}>儲存草稿</button>
        </section>
      )}

      <div className="row" style={{ marginTop: '1.5rem', borderBottom: '2px solid #eee', gap: '0' }}>
        <button className={`btn tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')} style={tabStyle(activeTab === 'all')}>全旅</button>
        {branches.map(b => (
          <button key={b.id} className={`btn tab ${activeTab === b.id ? 'active' : ''}`} onClick={() => setActiveTab(b.id)} style={tabStyle(activeTab === b.id)}>{b.short}</button>
        ))}
      </div>

      <section className="stack" style={{ marginTop: '1rem' }}>
        {s.meetings?.filter(m => activeTab === 'all' ? !m.branchId : m.branchId === activeTab).map(m => (
          <div className="card row" key={m.id} style={{ justifyContent: 'space-between' }}>
            <div>
              <span className={`badge ${m.type === 'agenda' ? 'blue' : 'green'}`}>{m.type === 'agenda' ? '議程' : '紀錄'}</span>
              <span className={`badge ${m.status === 'published' ? 'green' : 'gold'}`}>{m.status}</span>
              <h3>{m.title}</h3>
              <p className="muted">{m.date} {m.startTime}-{m.endTime} | {m.location || '待定'}</p>
              <p className="muted">對象：{m.targetRoles?.join(', ') || '全體'}</p>
              {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="btn gold" style={{display:'inline-block', marginTop: 8, fontSize: '0.85rem'}}>📄 查看會議文件</a>}
            </div>
            <div className="row">
              {m.status === 'draft' && <button className="btn primary" onClick={async () => setS(await apiPublishMeeting(m.id))}>發布</button>}
              <button className="btn red" onClick={async () => { if (confirm('確定刪除？')) setS(await apiDeleteMeeting(m.id)) }}>🗑️</button>
            </div>
          </div>
        ))}
        {s.meetings?.filter(m => activeTab === 'all' ? !m.branchId : m.branchId === activeTab).length === 0 && (
          <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>此分類下暫無會議。</p>
        )}
      </section>
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#fff' : 'transparent',
    border: 'none',
    borderBottom: active ? '3px solid #f9ab00' : 'none',
    borderRadius: '0',
    color: active ? '#f9ab00' : '#666',
    fontWeight: active ? 'bold' : 'normal',
    padding: '0.8rem 1.2rem',
    cursor: 'pointer'
  };
}

