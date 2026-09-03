'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, dashboardFor } from '@/lib/session';
import { canAccessRoute } from '@/lib/routeAccess';

/**
 * 舊「領袖控制台」（/leader）已併入「管理中心」（/admin）。
 *
 * 用戶要求（#8 #9 #10 #11 #12 #13）：
 *   ・團長／支部領袖／教練員嘅管理中心要同管理員一樣（同一個版面），
 *     只係顯示嘅管理項目按權限多寡不同，而且冇「系統管理」。
 *   ・領袖唔應該見到「擴充元件」—— 擴充元件只屬管理員，喺右上角「⋯」選單。
 *
 * 所以呢一路由淨係做轉址，保留舊連結（書籤／外部連結）仍然入到管理中心。
 *
 * ## ★ 2026-09-03 修正：唔可以再無條件 redirect 去 /admin
 *
 * 之前呢頁係 server component 做 `redirect('/admin')`，但 `/leader` 本身**冇 Auth gate**，
 * 而 `/admin` 嘅 gate 只收管理層＋支部領袖＋教練員。家長／成員跟舊書籤入 `/leader`
 * 就會被轉去 `/admin`，然後撞「未獲授權」牆 —— 明明佢哋自己有控制台
 * （`/parent` `/member`）。呢個係全 repo 連結掃描（601 條「源頁可達 × 對外連結」
 * 組合）測出嚟嘅 4 條真斷連結之中嘅 2 條。
 *
 * 修法：改用 `dashboardFor(role)` 決定去邊 —— 同 `app/page.tsx` 嘅登入後跳轉
 * 同一個函數，所以行為一定一致。
 *
 * ⚠️ 必須係 **client** component：session 只存喺 localStorage
 *   （`SESSION_KEY = 'scoutsystem2_current_user'`），server component 讀唔到，
 *   而呢個 repo 亦冇把 role 鏡像落 cookie。用 server component 會令所有人
 *   都被當未登入。
 */
export default function LeaderPage() {
  const router = useRouter();

  useEffect(() => {
    const s = getSession();
    // 未登入 → 去登入頁（唔好送去 /admin，咁樣只會撞「需要登入」牆）
    if (!s || s.role === 'guest') { router.replace('/login'); return; }

    const target = dashboardFor(s.role);
    // 雙重保險：萬一 dashboardFor 回傳嘅目標其實唔收呢個角色，送去主頁而唔係撞牆
    router.replace(canAccessRoute(target, s.role) ? target : '/');
  }, [router]);

  return <div className="card">正在前往你的控制台…</div>;
}
