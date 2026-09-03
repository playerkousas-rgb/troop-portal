/**
 * 給 check:* 腳本用嘅 Node module resolve hook。
 *
 * 前端 .ts 檔用 extensionless relative import（例：`from './model'`），
 * Next.js／TS bundler resolution 認得，但 Node 直接跑 `--experimental-strip-types` 認唔到。
 * 呢個 hook 喺解析失敗前補返 `.ts`，令 check 腳本可以 import 前端真正用緊嘅模組
 * （而唔係複製一份邏輯出嚟測 —— 咁樣先係真正行到被檢查嘅 code path）。
 *
 * 用法：node --import ./scripts/node-ts-resolve.mjs --experimental-strip-types <script.mjs>
 */
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.(ts|tsx|mjs|cjs|js|json)$/.test(specifier)) {
      try { return nextResolve(specifier + '.ts', context); } catch { /* 照舊行落去 */ }
    }
    return nextResolve(specifier, context);
  },
});
