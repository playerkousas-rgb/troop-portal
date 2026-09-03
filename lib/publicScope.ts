/**
 * 公開範圍 —— 三層模型（用戶要求）
 *
 * ┌ 第 0 層：總掣 `PUBLIC_VIEW`（既有）
 * │   管理員：「未登入可唔可以睇公開資料」。關 → 乜都唔公開。
 * │
 * ├ 第 1 層：卡片 `PUBLIC_CARDS`（管理員）
 * │   三張卡各自獨立：**行事曆 📅 / 相簿 📷 / 活動 🎯**
 * │   可以全開、開兩張、開一張。
 * │
 * └ 第 2 層：內容 `PUBLIC_SCOPE_<card>`
 *     卡片開咗 ≠ 內容開咗。每張卡入面再分：
 *       ・`troop`（全旅內容）→ 由**管理員**決定。卡片一開就**預設公開**（但可以關）。
 *       ・`b1..b5`（各支部內容）→ 由**該支部團長／支部領袖**自己決定。
 *     ★ 當 troop ＋ 所有支部都關晒 → 該張卡等於重新關閉，要再由管理員開返。
 *
 * 例：管理員開咗「行事曆」＋「活動」兩張卡；行事曆入面 troop＋b2＋b4 開、b3 關
 *   → 訪客睇到：全旅行事曆 ＋ b2 ＋ b4 行事曆；b3 行事曆睇唔到
 *   → 相簿完全睇唔到（卡未開）
 *   → 活動按活動卡自己嘅 scope
 */

import { publicViewEnabled } from './model';

/* ══════════════════════════════════════════════════════════
   卡片定義
   ══════════════════════════════════════════════════════════ */

export const PUBLIC_CARDS = [
  { id: 'calendar',   icon: '📅', name: '行事曆', desc: '已公佈活動＋恆常集會' },
  { id: 'albums',     icon: '📷', name: '相簿',   desc: '活動相簿連結' },
  { id: 'activities', icon: '🎯', name: '活動',   desc: '活動詳情＋通告文件' },
] as const;

export type PublicCardId = 'calendar' | 'albums' | 'activities';
export const PUBLIC_CARD_IDS: PublicCardId[] = ['calendar', 'albums', 'activities'];

/**
 * ★ 舊卡 id 歸一（2026-09-03 用戶決定）。
 *
 * 第三張卡原本叫 `notices`（通告）。用戶：「應該沒有 NOTICE 卡的，
 * 也只有活動管理，根本沒有通告管理，通告是由活動管理去上載的。」
 * → 第三張卡改成 `activities`（活動）。
 *
 * 點解唔直接改名就算：82 旅嘅 live Sheet 已經有
 *   ・`PUBLIC_CARDS` 入面寫住 `notices`
 *   ・`PUBLIC_SCOPE_NOTICES` 呢個 key（存住 troop／各支部嘅公開範圍）
 * 直接改名會令嗰張卡**無聲無息變「已關閉」**（openCards 認唔到 `notices`，
 * scopeKey 亦會去搵一個唔存在嘅 `PUBLIC_SCOPE_ACTIVITIES`）——
 * 管理員明明開咗卡，訪客卻乜都睇唔到，而且冇任何錯誤訊息。
 *
 * 所以同 `normalizeRole()` 同一個做法：**讀入時歸一，唔改寫原始資料**。
 */
const LEGACY_CARD_ID: Record<string, PublicCardId> = { notices: 'activities' };

/** 把舊卡 id 歸一做新 id（未知字串原樣返回，交由 PUBLIC_CARD_IDS 過濾） */
export function normalizeCardId(raw: string): PublicCardId | string {
  return LEGACY_CARD_ID[raw] || raw;
}

/** 全旅內容喺 scope 清單入面嘅代號 */
export const TROOP_SCOPE = 'troop';

/* ══════════════════════════════════════════════════════════
   SystemConfig keys
   ══════════════════════════════════════════════════════════ */

/** 管理員開咗邊幾張卡（comma list） */
export const PUBLIC_CARDS_KEY = 'PUBLIC_CARDS';
/** 每張卡嘅內容 scope（comma list：`troop` 及／或 branchId） */
export const scopeKey = (card: PublicCardId) => `PUBLIC_SCOPE_${card.toUpperCase()}`;
/**
 * 舊 key —— 讀入時 fallback 用（見上面 LEGACY_CARD_ID 嘅說明）。
 * 寫入一律用新 key；舊 key 只讀唔寫，所以 Sheet 上面嘅原始值唔會被改寫。
 */
const LEGACY_SCOPE_KEY: Partial<Record<PublicCardId, string>> = {
  activities: 'PUBLIC_SCOPE_NOTICES',
};

/* ══════════════════════════════════════════════════════════
   讀取
   ══════════════════════════════════════════════════════════ */

function csv(v: any): string[] {
  return String(v ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

/** 管理員開咗邊幾張卡 */
export function openCards(config: any): PublicCardId[] {
  return csv(config?.[PUBLIC_CARDS_KEY])
    .map((c) => normalizeCardId(c))          // ★ 舊 `notices` → `activities`
    .filter((c): c is PublicCardId => (PUBLIC_CARD_IDS as string[]).includes(c));
}

/** 某張卡管理員開咗未 */
export function cardOpen(config: any, card: PublicCardId): boolean {
  return openCards(config).includes(card);
}

/** 某張卡入面，邊啲 scope 開咗 */
export function openScopes(config: any, card: PublicCardId): string[] {
  const own = csv(config?.[scopeKey(card)]);
  if (own.length) return own;
  // ★ 舊 key fallback：82 旅 live Sheet 入面係 PUBLIC_SCOPE_NOTICES。
  //   新 key 未寫過就要讀舊 key，否則嗰張卡會無聲無息變「全部 scope 關晒」。
  const legacy = LEGACY_SCOPE_KEY[card];
  return legacy ? csv(config?.[legacy]) : [];
}

/** 某張卡嘅某個 scope 開咗未 */
export function scopeOpen(config: any, card: PublicCardId, scope: string): boolean {
  return openScopes(config, card).includes(scope);
}

/**
 * 一張卡係咪「真正有效開放」——
 * 管理員開咗卡 ＋ 至少有一個 scope（troop 或任何支部）開住。
 * 全部 scope 關晒 → 卡等於關閉（用戶要求：要再由管理員開返）。
 */
export function cardEffective(config: any, card: PublicCardId): boolean {
  return cardOpen(config, card) && openScopes(config, card).length > 0;
}

/**
 * 一項內容可唔可以公開畀未登入嘅人？三層都要過。
 * @param branchId 內容所屬支部；`troop`／空字串＝全旅內容
 */
export function isItemPublic(config: any, card: PublicCardId, branchId?: string): boolean {
  if (!publicViewEnabled(config)) return false;          // 第 0 層
  if (!cardEffective(config, card)) return false;        // 第 1 層（含「全部 scope 關晒＝卡關」）
  const scope = !branchId || branchId === TROOP_SCOPE ? TROOP_SCOPE : branchId;
  return scopeOpen(config, card, scope);                 // 第 2 層
}

/** 把清單 filter 做「可公開」嗰啲 */
export function filterPublicItems<T extends { branchId?: string }>(
  config: any, card: PublicCardId, items: T[]
): T[] {
  return items.filter(i => isItemPublic(config, card, i.branchId));
}

/* ══════════════════════════════════════════════════════════
   寫入（純函式，前後端共用）
   ══════════════════════════════════════════════════════════ */

function setInList(current: string | undefined, value: string, on: boolean): string {
  const list = csv(current);
  const has = list.includes(value);
  if (on && !has) list.push(value);
  if (!on && has) list.splice(list.indexOf(value), 1);
  // troop 排最前，其餘按 id 排序 → 唔同人改完都係同一個字串
  return list.sort((a, b) => (a === TROOP_SCOPE ? -1 : b === TROOP_SCOPE ? 1 : a.localeCompare(b))).join(',');
}

/** 開／關一張卡。★ 開卡時預設把 troop 內容一齊公開（用戶要求：卡片開咗默認旅內容公開） */
export function toggleCard(
  cardsCurrent: string | undefined,
  scopeCurrent: string | undefined,
  card: PublicCardId,
  on: boolean
): { cards: string; scopes: string } {
  const cards = setInList(cardsCurrent, card, on);
  // 開卡 → scope 未設定過就預設開 troop；關卡 → scope 原封不動（保留各支部選擇，方便日後開返）
  const scopes = on && csv(scopeCurrent).length === 0
    ? setInList(scopeCurrent, TROOP_SCOPE, true)
    : csv(scopeCurrent).join(',');
  return { cards, scopes };
}

/** 開／關某張卡入面嘅某個 scope（troop 或 branchId） */
export function toggleScope(current: string | undefined, scope: string, on: boolean): string {
  return setInList(current, scope, on);
}

/* ══════════════════════════════════════════════════════════
   權限
   ══════════════════════════════════════════════════════════ */

const ADMIN_TIER = ['super_admin', 'troop_leader', 'admin'];
const BRANCH_SCOPED = ['group_leader', 'branch_leader', 'coach'];

/** 邊個可以開／關卡片 → 只有管理層 */
export function canToggleCard(role?: string): boolean {
  return ADMIN_TIER.includes(role || '');
}

/** 邊個可以改某張卡嘅某個 scope */
export function canToggleScope(
  role: string | undefined,
  ownBranchId: string | undefined,
  scope: string
): boolean {
  if (ADMIN_TIER.includes(role || '')) return true;                 // 管理層：任何 scope（包括 troop）
  if (scope === TROOP_SCOPE) return false;                          // 全旅內容只有管理層可以改
  return BRANCH_SCOPED.includes(role || '') && !!ownBranchId && ownBranchId === scope;
}
