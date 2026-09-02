/**
 * 活動相簿連結處理。
 *
 * 重點：能唔能夠喺 App 內直接睇到相，唔係我哋設定決定，
 * 而係對方個網肯唔肯畀人 iframe（X-Frame-Options / CSP frame-ancestors）。
 * 所以呢度按平台分類，內嵌得就內嵌，內嵌唔到就老老實實顯示「新分頁開啟」，
 * 唔會扮到可以然後畀用戶見到一片空白。
 */

export type AlbumKind = 'embed' | 'link';

export type AlbumInfo = {
  kind: AlbumKind;
  /** 實際放入 iframe 嘅網址（kind==='embed' 先有意義） */
  embedUrl: string;
  /** 平台名，用嚟畀領袖睇「系統認得呢個連結」 */
  platform: string;
  /** 內嵌唔到時，解釋原因 + 點做先內嵌到 */
  hint?: string;
};

const trim = (u: string) => String(u || '').trim();

/** 明確封鎖 iframe 嘅平台（貼咗都係白畫面，所以直接當連結處理） */
const BLOCKED: { test: RegExp; platform: string; hint: string }[] = [
  {
    test: /photos\.google\.com|photos\.app\.goo\.gl/i,
    platform: 'Google 相簿',
    hint: 'Google 相簿唔准第三方網站內嵌，只可以新分頁開啟。想喺 App 內直接睇相，可以改用 Google Drive 資料夾。',
  },
  {
    test: /facebook\.com|fb\.com|fb\.watch/i,
    platform: 'Facebook',
    hint: 'Facebook 唔准第三方網站內嵌相冊，只可以新分頁開啟。',
  },
  {
    test: /instagram\.com/i,
    platform: 'Instagram',
    hint: 'Instagram 唔准第三方網站內嵌，只可以新分頁開啟。',
  },
  {
    test: /icloud\.com/i,
    platform: 'iCloud 共享相簿',
    hint: 'iCloud 相簿唔准第三方網站內嵌，只可以新分頁開啟。',
  },
  {
    test: /onedrive\.live\.com|1drv\.ms/i,
    platform: 'OneDrive',
    hint: 'OneDrive 分享連結一般唔准內嵌。如果係 SharePoint／OneDrive 商業版，可以用「內嵌」功能攞 embed 連結。',
  },
];

/**
 * 判斷一條相簿連結可唔可以喺 App 內直接顯示，並轉成可內嵌嘅網址。
 */
export function resolveAlbum(rawUrl: string): AlbumInfo | null {
  const u = trim(rawUrl);
  if (!u) return null;

  // 只接受 http(s)，擋 javascript: / data: 等
  if (!/^https?:\/\//i.test(u)) {
    return { kind: 'link', embedUrl: '', platform: '未知', hint: '連結必須以 http:// 或 https:// 開頭。' };
  }

  for (const b of BLOCKED) {
    if (b.test.test(u)) return { kind: 'link', embedUrl: u, platform: b.platform, hint: b.hint };
  }

  // ── 內嵌得嘅平台 ──

  // Google Drive 資料夾：/drive/folders/XXX → /embeddedfolderview（格仔檢視）
  const folder = u.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/i);
  if (folder) {
    return {
      kind: 'embed',
      embedUrl: `https://drive.google.com/embeddedfolderview?id=${folder[1]}#grid`,
      platform: 'Google Drive 資料夾',
    };
  }

  // Google Drive 單一檔案／相片
  const file = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/i);
  if (file) {
    return { kind: 'embed', embedUrl: `https://drive.google.com/file/d/${file[1]}/preview`, platform: 'Google Drive 檔案' };
  }

  // Google 相簿「內嵌相簿」產生嘅 embed 碼（同一般分享連結唔同，呢個係可以內嵌嘅）
  if (/photos\.google\.com\/share\/.*[?&]key=/i.test(u)) {
    return { kind: 'embed', embedUrl: u, platform: 'Google 相簿（內嵌版）' };
  }

  // Google Sites / Docs 類
  if (/docs\.google\.com|sites\.google\.com/i.test(u)) {
    const base = u.replace(/\/edit.*$/, '/preview');
    return { kind: 'embed', embedUrl: base + (base.includes('?') ? '&' : '?') + 'embedded=true', platform: 'Google 文件' };
  }

  // Flickr 相簿
  if (/flickr\.com/i.test(u)) {
    return { kind: 'embed', embedUrl: u, platform: 'Flickr' };
  }

  // 自建圖床 / Cloudflare R2 / Pages / 任何自己控制嘅網址
  // —— 自己嘅網一定可以自己開放內嵌，所以預設當內嵌得。
  if (/\.r2\.dev|pages\.dev|workers\.dev|imgur\.com\/a\//i.test(u)) {
    return { kind: 'embed', embedUrl: u, platform: '自建相簿 / 圖床' };
  }

  // 直接指向圖片檔 → 當單張相顯示
  if (/\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(u)) {
    return { kind: 'embed', embedUrl: u, platform: '圖片檔' };
  }

  // 其他：唔肯定對方肯唔肯畀內嵌，預設試內嵌，並提示可能顯示唔到
  return {
    kind: 'embed',
    embedUrl: u,
    platform: '其他網站',
    hint: '系統未認得呢個平台。如果內嵌後一片空白，代表對方網站唔准內嵌，請改用「新分頁開啟」或轉用 Google Drive 資料夾。',
  };
}
