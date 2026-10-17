import { NextResponse } from 'next/server';
import { APPROVED_TROOPS } from '@/lib/troops';
import { handleMockRequest, DEMO_TROOP_KEY } from '@/lib/mockServer';

export type ProxyContext = {
  troopKey: string;
  action: string;
  apiKey: string;
  webAppUrl: string;
  mock: boolean;
  debug?: Record<string, unknown>;
};

/** Resolve a troop and its server-side credentials from proxy query parameters. */
export function getProxyContext(searchParams: URLSearchParams): NextResponse | ProxyContext {
  const troopKey = searchParams.get('troopKey') || '';
  const action = searchParams.get('action') || 'health';

  if (!troopKey || troopKey === 'unknown') {
    return NextResponse.json({ success: false, error: '請先選擇旅團' }, { status: 400 });
  }

  // 演示旅團直接使用內置 MOCK 後台，不需環境變數。
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
        // 正式部署不回傳金鑰片段、長度或環境變數清單。
        ...(process.env.NODE_ENV !== 'production' ? {
          apiKeyPrefix: apiKey ? apiKey.substring(0, 6) + '...' : '(empty)',
          apiKeyLength: apiKey.length,
          allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('TROOP_')),
          webAppUrl: troop.webAppUrl,
        } : {}),
      },
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

async function parseAppsScriptResponse(res: Response): Promise<NextResponse> {
  const text = await res.text();

  if (/<!doctype html|<html/i.test(text)) {
    return NextResponse.json(
      { success: false, error: 'Apps Script 未公開（請確認 Deploy → Anyone）' },
      { status: 502 },
    );
  }

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(
      { success: false, error: 'Apps Script 回傳不是有效 JSON', raw: text.slice(0, 300) },
      { status: 502 },
    );
  }
}

/** Run the existing GET proxy behavior in-process for either route handler. */
export async function handleProxyGet(
  context: ProxyContext,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  if (context.debug) return NextResponse.json(context.debug);

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
    if (key !== 'troopKey' && key !== 'action') url.searchParams.set(key, value);
  });

  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    return parseAppsScriptResponse(res);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Proxy fetch failed' },
      { status: 502 },
    );
  }
}

/** Run the existing POST proxy behavior in-process for the proxy route. */
export async function handleProxyPost(
  context: ProxyContext,
  body: Record<string, any>,
): Promise<NextResponse> {
  if (context.debug) return NextResponse.json(context.debug);

  if (context.mock) {
    return NextResponse.json(handleMockRequest(context.action, body));
  }

  try {
    const res = await fetch(context.webAppUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        // Apps Script doPost reliably exposes text/plain JSON in e.postData.contents.
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ ...body, action: context.action, apiKey: context.apiKey }),
    });
    return parseAppsScriptResponse(res);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Proxy POST failed' },
      { status: 502 },
    );
  }
}
