/**
 * 俾 render 測試用嘅 Node loader hook。
 *
 * 要解決三件事（`--experimental-strip-types`  alone 做唔到）：
 *   1. `@/*` path alias（tsconfig `paths: {"@/*": ["./*"]}`）—— Node 唔認
 *   2. extensionless relative import（`from './model'`）
 *   3. **TSX / JSX** —— strip-types 只剝 type，唔會 transform JSX，
 *      所以要用 typescript 嘅 `transpileModule` 配合 `jsx: 'react-jsx'`
 */
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** `@/x` → 絕對檔案路徑；唔係 alias 就回 null（交返俾 Node 自己解） */
function toFile(specifier) {
  if (!specifier.startsWith('@/')) return null;
  const base = path.join(ROOT, specifier.slice(2));
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    const p = base + ext;
    if (existsSync(p)) return p;
  }
  return existsSync(base) ? base : null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // 0. Next 專屬模組 stub —— `next/link` / `next/navigation` 喺 Next runtime 之外
    //    resolve 唔到（node_modules 入面冇 ESM entry）。冇呢兩個 stub 嘅話，
    //    /admin/registrations、/leader、/library/import、/login 四個 route
    //    喺 render 測試會直接炸。
    if (specifier === 'next/link') {
      return { url: pathToFileURL(path.join(ROOT, 'scripts/stubs/next-link.tsx')).href, shortCircuit: true, format: 'module' };
    }
    if (specifier === 'next/navigation') {
      return { url: pathToFileURL(path.join(ROOT, 'scripts/stubs/next-navigation.tsx')).href, shortCircuit: true, format: 'module' };
    }

    // 1. @/ alias
    const aliased = toFile(specifier);
    if (aliased) return { url: pathToFileURL(aliased).href, shortCircuit: true, format: 'module' };

    // 2. extensionless relative → 試 .tsx 先（元件），再 .ts
    if (specifier.startsWith('.') && !/\.(ts|tsx|mjs|cjs|js|json)$/.test(specifier)) {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : ROOT;
      for (const ext of ['.tsx', '.ts']) {
        const p = path.resolve(parentDir, specifier + ext);
        if (existsSync(p)) return { url: pathToFileURL(p).href, shortCircuit: true, format: 'module' };
      }
    }
    return nextResolve(specifier, context);
  },

  load(url, context, nextLoad) {
    if (!url.startsWith('file://')) return nextLoad(url, context);
    const p = fileURLToPath(url);
    if (!/\.(ts|tsx)$/.test(p)) return nextLoad(url, context);

    const src = readFileSync(p, 'utf8');
    const out = ts.transpileModule(src, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,          // ★ 用 react/jsx-runtime，唔使手動 import React
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: p,
    }).outputText;
    return { format: 'module', source: out, shortCircuit: true };
  },
});
