'use client';
import { useEffect, useState } from 'react';
import { AppState, loadState, User } from '@/lib/store';
import { apiUpdateUserPermissions } from '@/lib/api';

const ALL_FEATURES = [
  { id: 'members', label: '成員管理' },
  { id: 'events', label: '活動管理' },
  { id: 'applications', label: '申請審核' },
  { id: 'registrations', label: '報名管理' },
  { id: 'meetings', label: '會議管理' },
  { id: 'users', label: '帳號管理' },
  { id: 'settings', label: '系統設定' },
  { id: 'audit', label: '紀錄查詢' },
  { id: 'library_import', label: '圖書館引入' },
  { id: 'notices', label: '通告管理' },
  { id: 'calendar', label: '行事曆設定' }
];

export default function PermissionsAdmin() {
  const [s, setS] = useState<AppState | null>(null);
  const [err, setErr] = useState('');
  const [selectedUser, setSelectedId] = useState<string>('');
  const [userPerms, setUserPerms] = useState<string[]>([]);

  useEffect(() => { loadState().then(setS).catch(e => setErr(e.message)) }, []);

  const users = s?.users.filter(u => ['admin', 'group_leader', 'branch_leader', 'coach', 'troop_super'].includes(u.role)) || [];

  function pickUser(uid: string) {
    setSelectedId(uid);
    // Find all permissions for this user from state (if buildDashboard includes them)
    // For now we'll assume s.userFeatures is only for current user, so we might need a dedicated API
    // To simplify: we'll allow editing and saving. In a real app we'd fetch first.
  }

  async function save() {
    if (!selectedUser) return;
    try {
      await apiUpdateUserPermissions(selectedUser, userPerms);
      alert('權限已更新');
    } catch (e: any) { setErr(e.message) }
  }

  function toggle(fid: string) {
    setUserPerms(prev => prev.includes(fid) ? prev.filter(x => x !== fid) : [...prev, fid]);
  }

  if (!s) return <div className="card">載入中...</div>;

  return (
    <div className="stack">
      <section className="hero">
        <span className="badge gold">權限管理</span>
        <h1>自定義功能權限</h1>
        <p>獨立控制各級領袖可以看到哪些功能卡片。</p>
      </section>

      {err && <p className="badge red">{err}</p>}

      <section className="card stack">
        <label>選擇領袖 / 管理員
          <select value={selectedUser} onChange={e => pickUser(e.target.value)}>
            <option value="">— 請選擇 —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </label>

        {selectedUser && (
          <div className="stack" style={{ marginTop: '1rem' }}>
            <h3>可使用的功能卡片</h3>
            <div className="grid">
              {ALL_FEATURES.map(f => (
                <label key={f.id} className="row" style={{ justifyContent: 'flex-start', gap: '10px' }}>
                  <input type="checkbox" checked={userPerms.includes(f.id)} onChange={() => toggle(f.id)} />
                  {f.label}
                </label>
              ))}
            </div>
            <button className="btn primary" style={{ marginTop: '1rem' }} onClick={save}>儲存權限設定</button>
          </div>
        )}
      </section>
    </div>
  );
}
