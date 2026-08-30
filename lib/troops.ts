// 2026 Scout System 已接入旅團登記表
// 由系統管理員維護：旅團提交申請（/onboard）→ 管理員審核 → 在這裡加入
// 用戶只能看到旅團名稱和號碼，看不到後台 URL
// API Key 存在 Vercel 環境變數（TROOP_{旅團號}_APIKEY），不會出現在前端 JS

export type ApprovedTroop = {
  key: string;       // 唯一識別（給前端下拉用）
  id: string;        // 旅團號
  name: string;
  webAppUrl: string; // Apps Script Web App URL
  status: 'active' | 'testing';
  note?: string;
};

export const APPROVED_TROOPS: ApprovedTroop[] = [
  {
    key: 'troop_0082',
    id: '0082',
    name: '第82旅（測試）',
    webAppUrl: 'https://script.google.com/macros/s/AKfycbwATtCXH8t8bV5VOBVY-ocPJR1RgV4iQebJp_oo_NGV7-90xJZ0d4pAVlFf_f51FHYW/exec',
    // API Key → 設 Vercel env var: TROOP_0082_APIKEY=ak_xxxxxxxx
    status: 'testing',
    note: '測試旅團',
  },
  // 新旅團接入後在這裡加入，格式：
  // { key: 'troop_0084', id: '0084', name: '第84旅', webAppUrl: 'https://script.google.com/...', status: 'active' },
  // 然後在 Vercel 設定環境變數 TROOP_0084_APIKEY=ak_xxxxxxxx
];

export function findTroopByKey(key: string): ApprovedTroop | null {
  return APPROVED_TROOPS.find(t => t.key === key) || null;
}

export function activeTroops(): ApprovedTroop[] {
  return APPROVED_TROOPS.filter(t => t.status === 'active' || t.status === 'testing');
}
