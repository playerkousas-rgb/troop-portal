#!/usr/bin/env node
/**
 * 公開資料「三張卡片」模型檢查（npm run check:public）
 *
 * 用戶要求：管理員以卡片形式公開 行事曆／相簿／通告，三張卡可以全開、開兩個、開一個（互相獨立）。
 * 「卡片開了不等於內容開」——
 *   ・旅（全旅）內容由管理員決定，卡片一開就默認公開（但亦可以關）
 *   ・各支部內容要由該支部團長開放
 *   ・當所有支部＋旅都關了 ⇒ 該卡片等於重新關閉，要再由管理員開返
 *
 * 做法：import 前端同後端共用嘅 lib/publicScope.ts（單一真相來源），
 * 逐條規則斷言。唔需要 dev server —— 純邏輯檢查。
 *
 * 用法：npm run check:public
 */
import {
  PUBLIC_CARD_IDS, TROOP_SCOPE,
  toggleCard, toggleScope,
  cardOpen, cardEffective, scopeOpen, isItemPublic,
  canToggleCard, canToggleScope,
  normalizeCardId, openScopes, openCards,
} from '../lib/publicScope.ts';

const errors = [];
let checked = 0;
const t = (name, got, want) => {
  checked++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) errors.push(`${name}\n       got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
};

/* ── 1. 三張卡 ── */
t('三張公開資料卡', PUBLIC_CARD_IDS, ['calendar', 'albums', 'activities']);

/* ── 2. 卡片開咗默認全旅內容公開（scope 為空時自動加 troop）── */
let r = toggleCard('', '', 'albums', true);
t('開卡（scope 空）→ 自動公開全旅', [r.cards, r.scopes], ['albums', TROOP_SCOPE]);
t('  → 卡片即時有效', cardEffective({ PUBLIC_CARDS: r.cards, PUBLIC_SCOPE_ALBUMS: r.scopes }, 'albums'), true);

/* ── 3. 三張卡獨立：可全開／開兩個／開一個 ── */
let cards = '';
for (const c of PUBLIC_CARD_IDS) cards = toggleCard(cards, TROOP_SCOPE, c, true).cards;
t('三張全開', cards, 'activities,albums,calendar');          // setInList 刻意排序
const two = toggleCard(cards, TROOP_SCOPE, 'albums', false).cards;
t('關相簿 → 剩兩張', two, 'activities,calendar');
t('  相簿卡已關', cardOpen({ PUBLIC_CARDS: two }, 'albums'), false);
t('  其餘兩張照開', [cardOpen({ PUBLIC_CARDS: two }, 'calendar'), cardOpen({ PUBLIC_CARDS: two }, 'activities')], [true, true]);
const one = toggleCard(two, TROOP_SCOPE, 'activities', false).cards;
t('再關活動 → 剩一張', one, 'calendar');

/* ── 4. 關卡保留 scope（重開唔使重設）── */
const closed = toggleCard('activities,calendar', 'troop,b2,b3', 'calendar', false);
t('關卡後 cards', closed.cards, 'activities');
t('關卡後 scopes 保留', closed.scopes, 'troop,b2,b3');
const reopened = toggleCard(closed.cards, closed.scopes, 'calendar', true);
t('重開卡 → cards', reopened.cards, 'activities,calendar');
t('重開卡 → scopes 冇被改走', reopened.scopes, 'troop,b2,b3');

/* ── 5. 所有支部＋旅都關 ⇒ 卡片等於重新關閉 ── */
let sc = 'troop,b2';
for (const s of ['troop', 'b2']) sc = toggleScope(sc, s, false);
t('範圍全部關晒', sc, '');
t('  卡仍喺 cards 列表', cardOpen({ PUBLIC_CARDS: 'calendar' }, 'calendar'), true);
t('  但 cardEffective=false（卡片等於未開）', cardEffective({ PUBLIC_CARDS: 'calendar', PUBLIC_SCOPE_CALENDAR: '' }, 'calendar'), false);
t('  重開一個 scope → 又有效', cardEffective({ PUBLIC_CARDS: 'calendar', PUBLIC_SCOPE_CALENDAR: toggleScope('', 'b3', true) }, 'calendar'), true);

/* ── 6. toggleScope 冪等 + troop 排最前 ── */
t('troop 排最前', toggleScope(toggleScope('', 'b3', true), TROOP_SCOPE, true), 'troop,b3');
t('重複開同一個 scope（冪等）', toggleScope('troop,b3', 'b3', true), 'troop,b3');
t('關唔存在嘅 scope 唔會出錯', toggleScope('troop', 'b5', false), 'troop');

/* ── 7. isItemPublic 三層一起檢查 ── */
const cfg = (card, scope) => ({ PUBLIC_VIEW: 'TRUE', PUBLIC_CARDS: card, [`PUBLIC_SCOPE_${card.toUpperCase()}`]: scope });
t('卡開＋scope 命中 → 公開', isItemPublic(cfg('calendar', 'troop,b3'), 'calendar', 'b3'), true);
t('卡開＋scope 未命中 → 唔公開', isItemPublic(cfg('calendar', 'troop,b3'), 'calendar', 'b2'), false);
t('卡關閉 → 就算 scope 命中都唔公開', isItemPublic(cfg('activities', 'troop,b2'), 'calendar', 'b2'), false);
t('全旅項目（branchId 空）用 troop scope', isItemPublic(cfg('calendar', 'troop'), 'calendar', ''), true);
t('全旅項目受 troop scope 控制', isItemPublic(cfg('calendar', 'b3'), 'calendar', ''), false);
t('總掣關 → 一律唔公開', isItemPublic({ PUBLIC_VIEW: 'FALSE', PUBLIC_CARDS: 'calendar', PUBLIC_SCOPE_CALENDAR: 'troop' }, 'calendar', 'troop'), false);
t('scopeOpen 同 isItemPublic 一致', scopeOpen(cfg('calendar', 'troop,b3'), 'calendar', 'b3'), true);

/* ── 8. 權限：卡片只准管理層；內容層 troop 只准管理層、支部只准自己 ── */
for (const role of ['super_admin', 'troop_leader', 'admin'])
  t(`${role} 可以開關卡片`, canToggleCard(role), true);
for (const role of ['group_leader', 'branch_leader', 'coach', 'member', 'parent', ''])
  t(`${role || '訪客'} 唔可以開關卡片`, canToggleCard(role), false);

for (const role of ['super_admin', 'troop_leader', 'admin'])
  t(`${role} 可以改全旅內容`, canToggleScope(role, '', TROOP_SCOPE), true);
t('支部領袖唔可以改全旅內容', canToggleScope('branch_leader', 'b3', TROOP_SCOPE), false);
t('團長唔可以改全旅內容', canToggleScope('group_leader', 'b3', TROOP_SCOPE), false);
t('支部領袖可以改自己支部', canToggleScope('branch_leader', 'b3', 'b3'), true);
t('團長可以改自己支部', canToggleScope('group_leader', 'b3', 'b3'), true);
t('教練員可以改自己支部', canToggleScope('coach', 'b3', 'b3'), true);
t('支部領袖唔可以改其他支部', canToggleScope('branch_leader', 'b3', 'b2'), false);
t('家長唔可以改任何範圍', canToggleScope('parent', 'b3', 'b3'), false);
t('成員唔可以改任何範圍', canToggleScope('member', 'b3', 'b3'), false);

/* ── 9. ★ 舊卡 id 歸一（2026-09-03：第三張卡由 notices 改成 activities）──
 *
 * 呢一節係今次改動嘅**真正風險點**。82 旅 live Sheet 入面係：
 *   PUBLIC_CARDS = 'calendar,notices'
 *   PUBLIC_SCOPE_NOTICES = 'troop'
 * 如果讀入時唔歸一：
 *   ・openCards 認唔到 'notices' → 第三張卡無聲無息變「已關閉」
 *   ・scopeKey('activities') 會去搵 PUBLIC_SCOPE_ACTIVITIES（唔存在）→ 各支部
 *     已設定嘅公開範圍全部消失
 * 兩者都係**靜默失敗**：管理員明明開咗卡，訪客卻乜都睇唔到，冇任何錯誤訊息。
 */
const LEGACY = { PUBLIC_VIEW: 'TRUE', PUBLIC_CARDS: 'calendar,notices', PUBLIC_SCOPE_NOTICES: 'troop,b2' };

t('normalizeCardId：notices → activities', normalizeCardId('notices'), 'activities');
t('normalizeCardId：新 id 原樣返回', normalizeCardId('activities'), 'activities');
t('normalizeCardId：其他卡唔受影響', [normalizeCardId('calendar'), normalizeCardId('albums')], ['calendar', 'albums']);
t('normalizeCardId：未知字串原樣返回（交由 PUBLIC_CARD_IDS 過濾）', normalizeCardId('nonsense'), 'nonsense');

t('舊 PUBLIC_CARDS 讀出嚟係新 id', openCards(LEGACY), ['calendar', 'activities']);
t('  → 第三張卡仍然係「開」（唔會無聲無息變關）', cardOpen(LEGACY, 'activities'), true);
t('  → cardEffective 仍然有效', cardEffective(LEGACY, 'activities'), true);
t('舊 PUBLIC_SCOPE_NOTICES 由 fallback 讀到', openScopes(LEGACY, 'activities'), ['troop', 'b2']);
t('  → 全旅內容公開', isItemPublic(LEGACY, 'activities', ''), true);
t('  → b2 內容公開（支部領袖之前同意過）', isItemPublic(LEGACY, 'activities', 'b2'), true);
t('  → b3 內容唔公開（之前冇同意）', isItemPublic(LEGACY, 'activities', 'b3'), false);

/* 新 key 存在時要優先用新 key（唔好被舊值蓋過） */
const MIGRATED = { PUBLIC_VIEW: 'TRUE', PUBLIC_CARDS: 'calendar,activities',
  PUBLIC_SCOPE_ACTIVITIES: 'troop,b3', PUBLIC_SCOPE_NOTICES: 'troop,b2' };
t('新 key 存在 → 優先用新 key', openScopes(MIGRATED, 'activities'), ['troop', 'b3']);
t('  → b3 公開、b2 唔公開（跟新 key）',
  [isItemPublic(MIGRATED, 'activities', 'b3'), isItemPublic(MIGRATED, 'activities', 'b2')], [true, false]);

/* 其他卡唔應該被 legacy fallback 污染 */
t('albums 唔會誤讀 PUBLIC_SCOPE_NOTICES', openScopes(LEGACY, 'albums'), []);

if (errors.length) {
  console.error(`❌ 公開資料卡片模型有問題（${errors.length}/${checked}）：\n` + errors.map(x => '  - ' + x).join('\n'));
  process.exit(1);
}
console.log(`✅ 公開資料卡片模型正確（三張卡獨立；開卡默認公開全旅；範圍全關⇒卡片等於未開；權限分層 — ${checked} 項斷言全過）`);
