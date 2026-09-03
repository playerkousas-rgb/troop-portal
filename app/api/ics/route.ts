import { NextRequest, NextResponse } from 'next/server';
import { buildIcs } from '@/lib/ics';
import { branches } from '@/lib/model';
import { isItemPublic, cardEffective, openScopes } from '@/lib/publicScope';

/**
 * 行事曆訂閱 feed（.ics）—— 真正「一鍵加入自己嘅行事曆」
 *
 * 點解要呢個 route：
 *   旅團行事曆係存喺 Google **Sheet**（Events／RegularMeetings），唔係旅團 Google 帳戶嘅
 *   Google Calendar，所以冇現成嘅訂閱連結可以畀用戶。呢個 route 由後台即時產生標準
 *   RFC 5545 feed，Google／Apple／Outlook 就可以**訂閱**（自動同步），
 *   唔使每次下載 .ics 再手動匯入。
 *
 * 用法：
 *   GET /api/ics?troopKey=troop_0083                 → 全旅已公佈活動＋全部恆常集會
 *   GET /api/ics?troopKey=troop_0083&branch=b2,b3    → 只包指定支部
 *
 * ★ 訂閱 feed 必然係**公開**嘅（Google 嘅伺服器唔會帶你嘅登入 cookie 嚟攞）。
 *   所以內容限定為「未登入訪客都睇到嘅嘢」＝已公佈活動＋已啟用恆常集會，
 *   同 /calendar 嘅公開版完全一致；PRIVATE 活動、報名名單、聯絡電話一概唔會出現。
 *   旅團若把 PUBLIC_VIEW 設為關閉，呢個 feed 會直接 403。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 由請求推斷對外 origin（Vercel 會經 proxy，唔可以信 request.url 嘅 host） */
function publicOrigin(req: NextRequest): string {
  const fwdProto = req.headers.get('x-forwarded-proto') || 'http';
  const fwdHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  return new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const troopKey = sp.get('troopKey') || '';
  const branchParam = (sp.get('branch') || '').trim();

  if (!troopKey || troopKey === 'unknown') {
    return new NextResponse('缺少 troopKey', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  // 經現有 proxy 攞資料 → 旅團解析、API Key、MOCK 全部重用，唔使複製一套
  const origin = publicOrigin(req);
  const upstream = new URL(`${origin}/api/proxy`);
  upstream.searchParams.set('action', 'getState');
  upstream.searchParams.set('troopKey', troopKey);
  upstream.searchParams.set('userId', '');
  upstream.searchParams.set('keys', 'events,regularMeetings,cancelledMeetings,config');

  let state: any;
  try {
    const res = await fetch(upstream.toString(), { cache: 'no-store', headers: { Accept: 'application/json' } });
    const json = await res.json();
    if (!json?.success || !json?.state) {
      return new NextResponse(json?.error || '無法讀取旅團行事曆', { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    state = json.state;
  } catch (e: any) {
    return new NextResponse('後台連線失敗：' + (e?.message || e), { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  // 第 0＋1 層：總掣（PUBLIC_VIEW）關閉，或管理員未開放「行事曆」卡（或卡內 scope 全關）→ 冇 feed
  if (!cardEffective(state.config, 'calendar')) {
    return new NextResponse('此旅團未開放公開行事曆，無法訂閱。', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  // 第 2 層：只有 scope 開咗嘅內容先入 feed —— troop（全旅，管理員決定）＋各支部（該支部團長決定）
  const opted = openScopes(state.config, 'calendar');

  const wanted = branchParam ? branchParam.split(',').map(x => x.trim()).filter(Boolean) : [];
  // isItemPublic 已經包埋三層判斷（總掣／卡片／scope）
  const inScope = (b?: string) => isItemPublic(state.config, 'calendar', b)
    && (wanted.length === 0 || !b || b === 'troop' || wanted.includes(b));

  const troopName = state.config?.TROOP_NAME || '旅團';
  // ★ 用靜態支部表譯名 —— 訂閱 feed 係公開嘅，後台唔會回 patrols 畀未登入者，
  //   直接用 branches 常量先至唔會顯示成「[b2]」呢類代號。
  const label = (b?: string) => (!b || b === 'troop' ? '全旅' : (branches.find(x => x.id === b)?.short || b));

  const events = (state.events || [])
    .filter((e: any) => e.status === 'published')
    .filter((e: any) => inScope(e.branchId))
    .map((e: any) => ({
      id: e.id,
      title: `[${label(e.branchId)}] ${e.title}`,
      date: e.date,
      location: e.location || '',
      // 只放通告連結，唔放報名名單／聯絡資料
      description: e.noticeUrl ? `通告：${e.noticeUrl}` : '',
      branchLabel: label(e.branchId),
    }));

  const rules = (state.regularMeetings || [])
    .filter((r: any) => r.enabled)
    .filter((r: any) => inScope(r.branchId))
    .map((r: any) => ({
      id: r.id,
      title: `[${label(r.branchId)}] ${r.title}`,
      weekday: Number(r.weekday),
      frequency: r.frequency,
      startTime: r.startTime,
      endTime: r.endTime,
      location: r.location,
      branchLabel: label(r.branchId),
      // 取消日子按支部分開，唔好把其他支部嘅取消混埋入嚟
      cancelledDates: (state.cancelledMeetings || [])
        .filter((c: any) => c.branchId === r.branchId)
        .map((c: any) => c.date),
    }));

  const ics = buildIcs({ calendarName: `${troopName} 行事曆`, events, rules });

  const filename = `scout-${troopKey}${wanted.length ? '-' + wanted.join('-') : ''}.ics`;
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      // 訂閱端會定期返嚟攞；唔好 cache 太耐，但都唔好每次都打後台
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
