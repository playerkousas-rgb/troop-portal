/**
 * 演示旅團（MOCK）共用常數 — client / server 兩邊都會用到，不可放入
 * 任何瀏覽器專用 API（localStorage / window）。
 */
export const DEMO_TROOP_KEY = 'troop_demo';

export const MOCK_TROOP = {
  key: DEMO_TROOP_KEY,
  id: '0088',
  name: '演示旅團(Mock)',
} as const;
