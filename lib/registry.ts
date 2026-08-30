import { Role } from './model';
import { isCoreNotPlugin } from './attendance';

export const REGISTRY_URL = 'https://troop-router.vercel.app/api/registry.json';

export type RegistryPlugin = {
  id: string;
  title: string;
  icon: string;
  url: string;
  description: string;
  version: string;
  tier: 2 | 3;
  embed: boolean;
  type: 'jump' | 'builtin';
  status: 'active' | 'disabled';
  needsUnitBackend: boolean;
  roles?: string[];
  scopes?: string[];
};

export type RegistryUnit = {
  id: string;
  name: string;
  installs: string[];
  endpoints: Record<string, string>;
};

export type Registry = {
  schema: number;
  hub: string;
  scope: string;
  updated: string;
  unitParam: 'u';
  unitLabel: string;
  plugins: RegistryPlugin[];
  units: RegistryUnit[];
};

export type ResolvedPlugin = RegistryPlugin & {
  resolvedUrl: string;
  available: boolean;
  installed: boolean;
  unitEndpoint?: string;
  minRole: Role;
};

export const fallbackRegistry: Registry = {
  schema: 3,
  hub: 'troop-service-hub',
  scope: 'troop',
  updated: '2026-06-16',
  unitParam: 'u',
  unitLabel: '旅團',
  plugins: [
    { id: 'troop_lib', title: '旅團圖書館', icon: '📚', url: 'https://scout-circulars.vercel.app/', description: '全旅共用的圖書館 / 通告系統，啟用即用。', version: '1.0.0', tier: 2, embed: true, type: 'jump', status: 'active', needsUnitBackend: false, roles: ['member','parent','leader','admin'], scopes: ['district','troop'] },
    { id: 'troop_dbs', title: 'DBS 3.0 徽章系統', icon: '🎖️', url: '', description: '獨立徽章考核系統。第3級：每個旅團自部署一份。', version: '3.0.0', tier: 3, embed: false, type: 'jump', status: 'active', needsUnitBackend: true, roles: ['member','leader'], scopes: ['troop'] },
    { id: 'troop_finance', title: '旅團財務管家', icon: '💰', url: '', description: '獨立財務模塊，各旅團獨立帳目。第3級：每個旅團自部署一份。', version: '1.0.0', tier: 3, embed: false, type: 'jump', status: 'active', needsUnitBackend: true, roles: ['admin','leader'], scopes: ['troop'] },
  ],
  units: [
    { id: '82', name: '第82旅', installs: ['troop_lib','troop_dbs'], endpoints: { troop_dbs: 'https://dbs-82.vercel.app' } },
    { id: '83', name: '第83旅', installs: ['troop_lib','troop_finance'], endpoints: { troop_finance: 'https://finance-83.vercel.app' } },
    { id: '104', name: '第104旅', installs: ['troop_lib'], endpoints: {} },
  ],
};

export async function fetchRegistry(): Promise<{ registry: Registry; fromFallback: boolean; error?: string }> {
  try {
    const res = await fetch(REGISTRY_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { registry: await res.json(), fromFallback: false };
  } catch (e: any) {
    return { registry: fallbackRegistry, fromFallback: true, error: e?.message || String(e) };
  }
}

function mapHubRoleToMinRole(roles?: string[]): Role {
  if (!roles || roles.length === 0) return 'admin';
  if (roles.includes('member')) return 'member';
  if (roles.includes('parent')) return 'parent';
  if (roles.includes('leader')) return 'coach';
  if (roles.includes('admin')) return 'admin';
  return 'admin';
}

export function resolvePlugins(registry: Registry, unitCode: string): ResolvedPlugin[] {
  const normalizedUnit = unitCode.replace(/^0+/, '') || unitCode;
  const unit = registry.units.find(u => u.id === unitCode || u.id === normalizedUnit);
  return registry.plugins.filter(p => p.status !== 'disabled' && !isCoreNotPlugin(p.id)).map(p => {
    const endpoint = unit?.endpoints?.[p.id] || '';
    const resolvedUrl = p.tier === 3 ? endpoint : p.url;
    return {
      ...p,
      resolvedUrl,
      unitEndpoint: endpoint,
      available: p.tier === 2 ? !!p.url : !!endpoint,
      installed: !!unit?.installs?.includes(p.id),
      minRole: mapHubRoleToMinRole(p.roles),
    };
  });
}

export function buildPluginUrl(plugin: ResolvedPlugin, unitCode: string, role: Role, embed = false, ymis?: string) {
  if (!plugin.resolvedUrl) return '';
  const url = new URL(plugin.resolvedUrl, typeof window !== 'undefined' ? window.location.origin : 'https://placeholder.local');
  url.searchParams.set('u', unitCode);
  url.searchParams.set('role', role);
  url.searchParams.set('from', 'portal');
  if (embed) url.searchParams.set('embed', '1');
  if (ymis) url.searchParams.set('ymis', ymis);
  return url.toString();
}
