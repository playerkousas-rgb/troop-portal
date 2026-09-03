/**
 * `next/navigation` 嘅最小 stub —— 俾 render 測試用。
 *
 * 同 `next/link` stub 同一個理由：`node_modules/next/navigation` 喺 Next runtime
 * 之外冇 ESM entry，node 直接 import 會「Cannot find module」。冇佢嘅話
 * `/admin/registrations`、`/leader`、`/library/import`、`/login` 四個 route
 * 喺 render 測試入面會炸，令全 route render 檢查永遠差四格。
 *
 * 只實作 repo 實際用到嘅三個 hook（`useRouter` / `usePathname` /
 * `useSearchParams`）。`redirect()` 冇人用，故 stub 冇實作。
 * router 嘅導航方法全部記錄到 `__nav` 陣列，方便測試斷言。
 */
import React from 'react';

const nav: string[] = [];
(globalThis as any).__nav = nav;

/**
 * ★ 必須係 module 層級嘅**單一穩定物件**。
 *
 * 原本寫成每次 call 都 `return { push, replace, … }`（新物件），結果
 * `app/page.tsx:39` 同 `app/leader/page.tsx:44` 都係 `useEffect(…, [router])`：
 * 依賴項身份每次 render 都變 → effect 每次 render 都重跑 → setState → 再 render
 * → **無限循環**，實測 route `/` 卡死（>26s 且記憶體一路涨，批次跑會 OOM）。
 * 真正嘅 Next `useRouter()` 回傳穩定引用，故 stub 都要穩定。
 */
const router = {
  push: (to: string) => { nav.push(to); },
  replace: (to: string) => { nav.push(to); },
  back: () => { nav.push('(back)'); },
  forward: () => {},
  refresh: () => {},
  prefetch: () => {},
};

export function useRouter() {
  return router;
}

export function usePathname(): string {
  try { return globalThis.window.location.pathname; } catch { return '/'; }
}

export function useSearchParams() {
  const sp = new URLSearchParams('');
  try {
    // 用 forEach 而唔係 `for…of …entries()`：後者係 iterator，tsc 喺呢個 repo 嘅
    // target 設定下會報 TS2802（需要 --downlevelIteration）。
    new URLSearchParams(globalThis.window.location.search).forEach((v, k) => sp.set(k, v));
  } catch { /* SSR 冇 window */ }
  return sp;
}

export default React;
