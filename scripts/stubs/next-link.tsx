/**
 * `next/link` 嘅最小 stub —— 俾 render 測試用。
 *
 * `next/link` 喺 Next runtime 之外 resolve 唔到（`node_modules/next/link`
 * 冇 ESM entry），但 `components/Auth.tsx` 有用佢。呢度用原生 `<a>` 頂住，
 * 因為測試只關心渲染出嚟嘅 DOM 結構同 href，唔關心 client-side routing。
 */
import React from 'react';

export default function Link({ href, children, ...rest }: any) {
  return React.createElement('a', { ...rest, href: typeof href === 'string' ? href : href?.pathname }, children);
}
