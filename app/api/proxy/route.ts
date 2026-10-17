import { NextRequest, NextResponse } from 'next/server';
import { getProxyContext, handleProxyGet, handleProxyPost } from '@/lib/proxy';

/**
 * 2026 Scout System — API Proxy
 *
 * 前端不直接呼叫 Google Apps Script，而是經此代理。
 * API Key 存在 Vercel 環境變數，不會出現在前端 JS。
 *
 * 環境變數命名：TROOP_{旅團號}_APIKEY
 * 例如：TROOP_0083_APIKEY=ak_xxxxxxxx
 *
 * 路由：/api/proxy?troopKey=troop_0083&action=xxx&...
 * Debug：/api/proxy?troopKey=troop_0083&action=proxyDebug
 *
 * ★ MOCK 已實作進 MAIN：troopKey = troop_demo（演示旅團 0088）的請求
 *   不再轉去 Apps Script，而是交給內置 MOCK 後台（lib/mockServer.ts）。
 *   資料格式與 GS 後台完全一致，可以實測整條前後端連線。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const context = getProxyContext(searchParams);
  if (context instanceof NextResponse) return context;

  return handleProxyGet(context, searchParams);
}

export async function POST(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const context = getProxyContext(searchParams);
  if (context instanceof NextResponse) return context;

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  return handleProxyPost(context, body);
}
