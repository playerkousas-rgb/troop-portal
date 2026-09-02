import { NextRequest, NextResponse } from 'next/server';
import { APPROVED_TROOPS } from '@/lib/troops';
import { handleMockRequest, DEMO_TROOP_KEY } from '@/lib/mockServer';

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

type ProxyContext = {
  troopKey: string;
  action: string;
  apiKey: string;
  webAppUrl: string;
  mock: boolean;
  debug?: Record<string, unknown>;
};

function getProxyContext(request: NextRequest): NextResponse | ProxyContext {
  const { searchParams } = new URL(request.url);
  const troopKey = searchParams.get('troopKey') || '';
  const action = searchParams.get('action') || 'health';

  if (!troopKey || troopKey === 'unknown') {
    return NextResponse.json({ success: false, error: '請先選擇旅團' }, { status: 400 });
  }

  // ★ 演示旅團：直接進內置 MOCK 後台，不需環境變數
  if (troopKey === DEMO_TROOP_KEY) {
    if (action === 'proxyDebug') {
      return {
        troopKey,
        action,
        apiKey: '',
        webAppUrl: '',
        mock: true,
        debug: {
          success: true,
          debug: true,
          troopKey,
          troopId: '0088',
          troopName: '演示旅團(Mock)',
          envVarName: '',
          apiKeyFound: true,
          mock: true,
          webAppUrl: '(內置 MOCK 後台)',
        },
      };
    }
    return { troopKey, action, apiKey: '', webAppUrl: '', mock: true };
  }

  const troop = APPROVED_TROOPS.find(t => t.key === troopKey);
  if (!troop) {
    return NextResponse.json({ success: false, error: '未知旅團，請確認已開通' }, { status: 400 });
  }

  const envVarName = `TROOP_${troop.id}_APIKEY`;
  const apiKey = process.env[envVarName] || '';

  if (action === 'proxyDebug') {
    return {
      troopKey,
      action,
      apiKey,
      webAppUrl: troop.webAppUrl,
      mock: false,
      debug: {
        success: true,
        debug: true,
        troopKey,
        troopId: troop.id,
        troopName: troop.name,
        envVarName,
        apiKeyFound: !!apiKey,
        // ⚠️ 安全：金鑰片段／長度／環境變數清單只喺本機開發環境先顯示，
        //    正式部署唔會回傳，避免經公開 URL 洩漏後台金鑰資料。
        ...(process.env.NODE_ENV !== 'production' ? {
          apiKeyPrefix: apiKey ? apiKey.substring(0, 6) + '...' : '(empty)',
          apiKeyLength: apiKey.length,
          allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('TROOP_')),
          webAppUrl: troop.webAppUrl,
        } : {}),
      }
    };
  }

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: `旅團 API Key 尚未設定（需要環境變數 ${envVarName}），請聯絡平台管理員`,
    }, { status: 500 });
  }

  return { troopKey, action, apiKey, webAppUrl: troop.webAppUrl, mock: false };
}

async function parseAppsScriptResponse(res: Response) {
  const text = await res.text();

  if (/<!doctype html|<html/i.test(text)) {
    return NextResponse.json(
      { success: false, error: 'Apps Script 未公開（請確認 Deploy → Anyone）' },
      { status: 502 }
    );
  }

  try {
    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Apps Script 回傳不是有效 JSON', raw: text.slice(0, 300) },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  const context = getProxyContext(request);
  if (context instanceof NextResponse) return context;
  if (context.debug) return NextResponse.json(context.debug);

  const { searchParams } = new URL(request.url);

  // ★ 演示旅團 → 內置 MOCK 後台（與 GS 相同資料格式）
  if (context.mock) {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'troopKey' && key !== 'action') params[key] = value;
    });
    return NextResponse.json(handleMockRequest(context.action, params));
  }

  const url = new URL(context.webAppUrl);
  url.searchParams.set('action', context.action);
  url.searchParams.set('apiKey', context.apiKey);

  searchParams.forEach((value, key) => {
    if (key !== 'troopKey' && key !== 'action') {
      url.searchParams.set(key, value);
    }
  });

  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    });
    return parseAppsScriptResponse(res);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Proxy fetch failed' },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const context = getProxyContext(request);
  if (context instanceof NextResponse) return context;
  if (context.debug) return NextResponse.json(context.debug);

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // ★ 演示旅團 → 內置 MOCK 後台（與 GS 相同資料格式）
  if (context.mock) {
    return NextResponse.json(handleMockRequest(context.action, body));
  }

  try {
    const res = await fetch(context.webAppUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        // Apps Script doPost reliably exposes text/plain JSON in e.postData.contents.
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ ...body, action: context.action, apiKey: context.apiKey }),
    });
    return parseAppsScriptResponse(res);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Proxy POST failed' },
      { status: 502 }
    );
  }
}
