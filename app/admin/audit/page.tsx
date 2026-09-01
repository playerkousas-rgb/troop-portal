'use client';
import { useEffect, useState } from 'react';
import { AppState, Audit, loadStateSlice } from '@/lib/store';
import Auth from '@/components/Auth';

/** 操作紀錄分類（審核紀錄已合併喺度） */
function categoryOf(a: Audit): string {
  const s = `${a.action} ${a.entity} ${a.entityId} ${a.detail}`;
  if (/decide|Application|申請|審核|批核|批准|拒絕/.test(s)) return '申請審核';
  if (/Event|活動|報名|Reply|reply/.test(s)) return '活動與報名';
  if (/Member|User|成員|使用者|帳號|createUser|createMember|deleteMember|deleteUser/.test(s)) return '成員與帳號';
  if (/Announcement|公告|最新消息|LatestNews|News|通告|Bookmark/.test(s)) return '公告與消息';
  if (/Meeting|會議|集會|cancel|Calendar/.test(s)) return '會議與集會';
  if (/Config|Plugin|元件|系統|saveConfig|system/.test(s)) return '系統設定';
  return '其他';
}

const CATS = ['全部', '申請審核', '活動與報名', '成員與帳號', '公告與消息', '會議與集會', '系統設定', '其他'];

export default function Page() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState('全部');
  useEffect(() => { loadStateSlice(['audits', 'users']).then(setS).catch(e => setErr(e.message)) }, []);
  if (!s) return <div className="card">{err || '載入中...'}</div>;

  const nameOf = (id: string) => s.users.find(u => u.id === id)?.name || id;
  const list = s.audits.filter(a => cat === '全部' || categoryOf(a) === cat);

  return (
    <Auth roles={['super_admin', 'troop_super', 'admin']}>
    <div className="stack">
      <section className="hero">
        <span className="badge gold">操作紀錄</span>
        <h1>📜 操作紀錄</h1>
        <p>所有操作（含審核／批核紀錄）已合併喺一處，並按類別分類，方便追查。</p>
      </section>
      {err && <p className="badge red">{err}</p>}

      {/* 分類 tab */}
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {CATS.map(c => (
          <button key={c} type="button" className={`btn ${cat === c ? 'primary' : ''}`} onClick={() => setCat(c)} style={{ fontSize: '0.9rem' }}>
            {c}{c === '全部' ? ` (${s.audits.length})` : ''}
          </button>
        ))}
      </div>

      <section className="card">
        <table className="table">
          <thead><tr><th>時間</th><th>使用者</th><th>分類</th><th>動作</th><th>對象</th><th>內容</th></tr></thead>
          <tbody>
            {list.map(a => (
              <tr key={a.id}>
                <td>{a.createdAt}</td>
                <td>{nameOf(a.userId)}</td>
                <td><span className="badge blue" style={{ fontSize: '0.8em' }}>{categoryOf(a)}</span></td>
                <td>{a.action}</td>
                <td>{a.entity}{a.entityId ? `:${a.entityId}` : ''}</td>
                <td>{a.detail || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="muted">此分類暫無紀錄。</p>}
      </section>
    </div>
    </Auth>
  );
}
