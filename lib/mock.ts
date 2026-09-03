'use client';
/**
 * 演示旅團（MOCK）— 前端 UI 輔助
 *
 * MOCK 已實作進 MAIN：
 *   演示旅團（troop_demo / 0088）的所有資料請求現在都經真實 HTTP 路徑
 *   （前端 fetch → /api/proxy → 內置 MOCK 後台 lib/mockServer.ts），
 *   與真實 Google Apps Script 後台走完全相同的前後端連線流程，
 *   不再在瀏覽器裡直接模擬回應。
 *
 * 此檔案只保留 UI 需要的小工具：
 *   - isMockMode / setMockMode（演示模式開關）
 *   - MOCK_TROOP（演示旅團常數）
 *   - DEMO_ACCOUNTS（登入頁一鍵演示帳號清單）
 */
import { MOCK_TROOP, DEMO_TROOP_KEY } from './mockConstants';

const MOCK_KEY = 'scoutsystem2_mock_mode';

export { MOCK_TROOP, DEMO_TROOP_KEY };

export function isMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // MOCK 只屬於演示旅團。即使瀏覽器殘留了開關，只要目前選的是真實旅團，
    // API 仍然必須走真實旅團後台，避免把真旅團誤當成 MOCK。
    const selected = JSON.parse(localStorage.getItem('scoutsystem2_selected_troop') || 'null');
    return localStorage.getItem(MOCK_KEY) === '1' && selected?.key === DEMO_TROOP_KEY;
  } catch { return false; }
}

export function setMockMode(on: boolean) {
  if (typeof window === 'undefined') return;
  try { if (on) localStorage.setItem(MOCK_KEY, '1'); else localStorage.removeItem(MOCK_KEY); } catch {}
}

/** 演示帳號：一鍵登入用（登入頁）。密碼不需要 —— MOCK 後台按 userId 直接放行。 */
export const DEMO_ACCOUNTS: { userId: string; label: string; desc: string; dashboard: string }[] = [
  { userId: 'u_m1', label: '🧒 成員(未成年)', desc: '陳大文 16 歲 · 可表達 ❤️ 有興趣，報名要家長代操作', dashboard: '/member' },
  { userId: 'u_m14', label: '🧒 成員(幼童軍)', desc: '陳小美 9 歲 · 與陳大文同一位家長但不同支部', dashboard: '/member' },
  { userId: 'u_m4', label: '🧑 成員(成年)', desc: '張磊磊 18 歲 · 可自行報名（冇 ❤️ 有興趣／想考的章）', dashboard: '/member' },
  { userId: 'u5', label: '👩 家長(兩名子女不同支部)', desc: '王秀蘭 · 陳大文(童軍 b3) ＋ 陳小美(幼童軍 b2)，有一名子女表達咗 ❤️ 有興趣', dashboard: '/parent' },
  { userId: 'u_bl', label: '🏹 支部領袖', desc: '黃志遠 · 本支部活動 / 成員 / 點名', dashboard: '/admin' },
  { userId: 'u_coach', label: '🧑‍🏫 教練員(獲授全旅點名)', desc: '何健 · 即使教練員，有權限亦可點全旅', dashboard: '/admin' },
  { userId: 'u_gl', label: '📋 團長', desc: '李偉國 · 全旅活動 / 集會 / 會議', dashboard: '/admin' },
  { userId: 'u_admin', label: '🛠️ 管理員', desc: '陳堅強 · 全部管理功能', dashboard: '/admin' },
];
