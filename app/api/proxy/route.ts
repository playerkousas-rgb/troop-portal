import { NextRequest, NextResponse } from 'next/server';
import { APPROVED_TROOPS } from '@/lib/troops';

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
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProxyContext = {
  troopKey: string;
  action: string;
  apiKey: string;
  webAppUrl: string;
  debug?: Record<string, unknown>;
};

function getProxyContext(request: NextRequest): NextResponse | ProxyContext {
  const { searchParams } = new URL(request.url);
  const troopKey = searchParams.get('troopKey') || '';
  const action = searchParams.get('action') || 'health';

  if (!troopKey || troopKey === 'unknown') {
    return NextResponse.json({ success: false, error: '請先選擇旅團' }, { status: 400 });
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
      debug: {
        success: true,
        debug: true,
        troopKey,
        troopId: troop.id,
        troopName: troop.name,
        envVarName,
        apiKeyFound: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 6) + '...' : '(empty)',
        apiKeyLength: apiKey.length,
        allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('TROOP_')),
        webAppUrl: troop.webAppUrl,
      }
    };
  }

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: `旅團 API Key 尚未設定（需要環境變數 ${envVarName}），請聯絡平台管理員`,
    }, { status: 500 });
  }

  return { troopKey, action, apiKey, webAppUrl: troop.webAppUrl };
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
