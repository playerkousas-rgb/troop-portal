#!/usr/bin/env node
/**
 * 行事曆「支部可見範圍」檢查（npm run check:calendar）
 *
 * 用戶要求 #3 #4：家長只睇到全旅＋子女支部；支部領袖／成員只睇到全旅＋自己支部；
 * 家長／成員亦唔應該見到「會議」（領袖會議）分類。
 *
 * 做法：import 前端真正用嘅 lib/calendarScope.ts，再向 MOCK 後台（經 /api/proxy，
 * 同真實 GS 後台同一條路）攞每個示範角色嘅成員／活動／集會資料，
 * 計出佢實際會見到嘅項目，確認冇其他支部嘅嘢漏入去。
 *
 * 用法：先起 dev server（npm run dev），再 npm run check:calendar
 */
import { calendarScope, CALENDAR_ADMIN_TIER } from '../lib/calendarScope.ts';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const KEYS = 'users,members,events,regularMeetings,meetings';

/** 示範帳號（lib/mock.ts DEMO_ACCOUNTS） */
const CASES = [
  { userId: 'u5', role: 'parent', label: '家長（兩名子女：b3＋b2）' },
  { userId: 'u_m14', role: 'member', label: '未成年成員（b2 幼童軍）' },
  { userId: 'u_m4', role: 'member', label: '成年成員（b3 童軍）' },
  { userId: 'u_bl', role: 'branch_leader', label: '支部領袖（b3 童軍）' },
  { userId: 'u_gl', role: 'group_leader', label: '團長（b4 深資）' },
  { userId: 'u_admin', role: 'admin', label: '管理員' },
];

async function stateOf(userId) {
  const url = `${BASE}/api/proxy?action=getState&troopKey=troop_demo&keys=${KEYS}&userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ← ${url}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'MOCK 後台回傳失敗');
  return data.state || {};
}

const errors = [];

try {
  for (const c of CASES) {
    const s = await stateOf(c.userId);
    const me = (s.users || []).find(u => u.id === c.userId) || {};
    const children = (s.members || []).filter(
      m => (me.childMemberIds || []).includes(m.id) || m.parentUserId === c.userId
    );
    const ownMember = (s.members || []).find(m => m.id === me.memberId);

    // 同 app/calendar/page.tsx 完全一樣嘅計法
    const scope = calendarScope({
      role: c.role,
      ownBranchId: ownMember?.branchId || me.branchId,
      childBranchIds: children.map(k => k.branchId),
    });

    const events = (s.events || []).filter(e => e.status === 'published');
    const seenEvents = events.filter(e => scope.inScope(e.branchId));
    const rules = (s.regularMeetings || []).filter(r => scope.inScope(r.branchId));
    const oneoff = (s.meetings || []).filter(m => scope.inScope(m.branchId));

    const eventBranches = Array.from(new Set(seenEvents.map(e => e.branchId || 'troop'))).sort();
    console.log(
      `${c.userId}（${c.label}）→ 支部=${scope.adminTier ? '全部' : scope.branchIds.join('/') || '（冇）'}` +
      `｜活動 ${seenEvents.length}/${events.length} 個（${eventBranches.join(',')}）` +
      `｜恆常集會 ${rules.length}/${(s.regularMeetings || []).length}` +
      `｜會議分類 ${scope.hideMeetings ? '隱藏' : '顯示'}`
    );

    // 1) 非管理員唔應該見到其他支部嘅項目
    if (!scope.adminTier) {
      const allowed = new Set(['troop', ...scope.branchIds]);
      for (const e of seenEvents) {
        const bid = e.branchId || 'troop';
        if (!allowed.has(bid)) errors.push(`${c.role} 見到其他支部嘅活動「${e.title}」（${bid}）`);
      }
      for (const r of rules) {
        if (!allowed.has(r.branchId || 'troop')) errors.push(`${c.role} 見到其他支部嘅恆常集會（${r.branchId}）`);
      }
      // 全旅項目一定要睇到
      const troopEvents = events.filter(e => !e.branchId || e.branchId === 'troop' || e.scope === 'troop');
      const missed = troopEvents.filter(e => !seenEvents.includes(e));
      if (missed.length) errors.push(`${c.role} 睇唔到全旅活動：${missed.map(e => e.title).join('、')}`);
    }

    // 2) 家長／成員唔應該有「會議」分類
    const shouldHide = c.role === 'parent' || c.role === 'member';
    if (scope.hideMeetings !== shouldHide) {
      errors.push(`${c.role} 嘅「會議」分類應該${shouldHide ? '隱藏' : '顯示'}`);
    }

    // 3) 管理員級一定要睇到全部
    if (CALENDAR_ADMIN_TIER.includes(c.role)) {
      if (seenEvents.length !== events.length) errors.push(`${c.role} 應該睇到全部活動`);
      if (rules.length !== (s.regularMeetings || []).length) errors.push(`${c.role} 應該睇到全部恆常集會`);
      if (oneoff.length !== (s.meetings || []).length) errors.push(`${c.role} 應該睇到全部會議`);
    }
  }
} catch (e) {
  console.error(`❌ 未能向 MOCK 後台取得資料：${e.message}`);
  console.error('   請先起 dev server（npm run dev）再執行 npm run check:calendar');
  process.exit(1);
}

if (errors.length) {
  console.error('❌ 行事曆支部範圍有問題：\n' + errors.map(x => '  - ' + x).join('\n'));
  process.exit(1);
}
console.log('✅ 行事曆支部範圍正確（非管理員只睇到全旅＋自己／子女支部；家長／成員冇「會議」分類）');
