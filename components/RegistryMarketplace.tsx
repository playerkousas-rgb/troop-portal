'use client';
import { useEffect, useMemo, useState } from 'react';
import { ROLE_LABEL, ROLE_ORDER, Role } from '@/lib/model';
import { buildPluginUrl, fetchRegistry, Registry, REGISTRY_URL, resolvePlugins, ResolvedPlugin } from '@/lib/registry';
import { isCoreNotPlugin } from '@/lib/attendance';
import { getSession } from '@/lib/session';
import { apiSavePluginSetting } from '@/lib/api';

function visibleRolesFromMin(minRole: Role) {
  const idx = ROLE_ORDER.indexOf(minRole);
  return ROLE_ORDER.slice(Math.max(0, idx));
}

export function MarketplacePage() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [unitCode, setUnitCode] = useState('0082');
  const [role, setRole] = useState<Role>('admin');

  useEffect(() => {
    const s = getSession();
    if (s?.troopCode) setUnitCode(s.troopCode);
    if (s?.role) setRole(s.role);
    fetchRegistry().then(r => setRegistry(r.registry));
  }, []);

  const list = useMemo(() => registry ? resolvePlugins(registry, unitCode) : [], [registry, unitCode]);

  if (!registry) return <section className="card">載入轉駁器 registry...</section>;

  return (
    <div className="stack">
      <section className="hero">
        <span className="badge gold">元件市場</span>
        <h1>元件市場與轉駁中心</h1>
        <p>在此管理跨平台元件及查看接駁設定。</p>
      </section>

      {/* 轉駁中心內容置頂 */}
      <section className="card stack" style={{ background: '#f8f9fa', border: '1px solid #ddd' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><strong>接駁單位：</strong>{unitCode}</div>
          <span className="badge gold">Registry Live</span>
        </div>
        <div className="grid" style={{ fontSize: '0.9rem', marginTop: '10px' }}>
          <div><strong>Registry URL:</strong> <code style={{ wordBreak: 'break-all' }}>{REGISTRY_URL}</code></div>
          <div><strong>Hub ID:</strong> <code>{registry.hub}</code></div>
        </div>
        <div className="muted" style={{ fontSize: '0.8rem', marginTop: '10px' }}>
          💡 開啟元件時，主系統會自動附帶 <code>?u={unitCode}&role={role}&from=portal&embed=1</code> 及 YMIS 參數。
        </div>
      </section>

      {/* 元件列表 */}
      <section className="card" style={{ borderLeft: '5px solid #7c3aed' }}>
        <h3 style={{ marginTop: 0 }}>📝 簽到／點名已內建</h3>
        <p className="muted" style={{ marginBottom: 0 }}>點名是主系統核心功能，不再作為第 3 級插件安裝或 iframe 嵌入。請到控制台「簽到／點名」卡片進入。</p>
      </section>

      <section className="grid-wide">
        {list.filter(p => !isCoreNotPlugin(p.id)).map(p => <PluginCard key={p.id} plugin={p} unitCode={unitCode} role={role} />)}
      </section>
    </div>
  );
}

function PluginCard({ plugin, unitCode, role }: { plugin: ResolvedPlugin; unitCode: string; role: Role }) {
  const [minRole, setMinRole] = useState<Role>(plugin.minRole);
  const session = getSession();
  const visible = visibleRolesFromMin(minRole);
  const target = buildPluginUrl(plugin, unitCode, role, plugin.embed, session?.memberId);
  return <div className="card stack">
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className={`badge ${plugin.tier === 2 ? 'green' : 'purple'}`}>第 {plugin.tier} 級</span>
      <span className={`badge ${plugin.available ? 'blue' : 'red'}`}>{plugin.available ? (plugin.installed ? '已接入 / 可用' : '可安裝') : '需先部署後台'}</span>
    </div>
    <h3>{plugin.icon} {plugin.title}</h3>
    <p className="muted">{plugin.description}</p>
    <p className="muted">id: <code>{plugin.id}</code> · v{plugin.version} · {plugin.embed ? 'iframe 內嵌' : '新分頁'}</p>
    {plugin.tier === 3 && <p className="muted">本旅 endpoint：{plugin.unitEndpoint || '尚未在 units.endpoints 登記'}</p>}
    <label>由上級設定最低可見角色
      <select value={minRole} onChange={e=>setMinRole(e.target.value as Role)}>
        {ROLE_ORDER.map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </select>
    </label>
    <div className="card" style={{ background: '#f8fbff', boxShadow: 'none' }}>
      <strong>實際可見：</strong> {visible.map(r=>ROLE_LABEL[r]).join('、')}
      <p className="muted" style={{ marginBottom: 0 }}>下級可見時，上級自動可見；例如開放給成員，家長、領袖、團長、管理員亦可見。</p>
    </div>
    <div className="row">
      <button className="btn primary" disabled={!plugin.available} onClick={async ()=>{
        try {
          await apiSavePluginSetting({ pluginId: plugin.id, title: plugin.title, icon: plugin.icon, tier: plugin.tier });
          alert('✅ 已加入控制台');
        } catch(e: any) { alert(e.message); }
      }}>{plugin.available ? '加入本旅控制台' : '不能安裝'}</button>
      {plugin.available && target && <a className="btn" href={target} target={plugin.embed ? '_self' : '_blank'}>測試開啟</a>}
    </div>
    {target && <pre className="code">{target}</pre>}
  </div>
}

export function ConnectorPanel() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [unitCode, setUnitCode] = useState('0082');
  const [role, setRole] = useState<Role>('admin');
  useEffect(() => {
    const s = getSession();
    if (s?.troopCode) setUnitCode(s.troopCode);
    if (s?.role) setRole(s.role);
    fetchRegistry().then(r => setRegistry(r.registry));
  }, []);
  const list = useMemo(() => registry ? resolvePlugins(registry, unitCode).filter(p => !isCoreNotPlugin(p.id)) : [], [registry, unitCode]);
  const session = getSession();
  return <div className="stack">
    <section className="card row" style={{ justifyContent: 'space-between' }}>
      <div><strong>目前單位：</strong>{unitCode} · <span className="muted">開啟元件會帶 u={unitCode}</span></div>
      <span className="badge gold">Registry Live</span>
    </section>
    <section className="card"><table className="table"><thead><tr><th>元件</th><th>級別</th><th>安裝</th><th>解析 URL</th><th>測試</th></tr></thead><tbody>{list.map(p=>{const url=buildPluginUrl(p,unitCode,role,p.embed,session?.memberId);return <tr key={p.id}><td>{p.icon} {p.title}<br/><span className="muted">{p.id}</span></td><td>第 {p.tier} 級</td><td>{p.installed?'✅':'—'} {p.available?'':'需部署'}</td><td style={{maxWidth:360,wordBreak:'break-all'}}>{p.resolvedUrl||'未設定'}</td><td>{url?<a className="btn" href={url} target="_blank">開啟</a>:<span className="badge red">不可用</span>}</td></tr>})}</tbody></table></section>
    <section className="card"><h3>主系統開啟合約</h3><pre className="code">?u={unitCode}&role={role}&from=portal{`&embed=1`}</pre><p className="muted">第 3 級元件真正 URL 由 registry 的 units.endpoints 解析；不把空 URL 寫入卡片。</p></section>
  </div>
}
