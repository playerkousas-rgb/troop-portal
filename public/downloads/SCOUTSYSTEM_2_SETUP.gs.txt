/**
 * 2026 Scout System — 完整後台（Setup + API + 角色過濾）
 *
 * 核心改動 vs 之前版本：
 *   - getState → getDashboard(userId)：按角色過濾，不再回傳全部資料
 *   - setReply 加 18 歲 GS 端 guard（1.0 邏輯）
 *   - Sheet 讀寫改用 header-based（大小寫不敏感，不怕欄位順序被改）
 *   - Patrols 預設改英文（TIGER / SEAGULL 等）
 *   - STAFF_TOKEN setup 時自動生成
 *   - 新增 applyJoin（公開，不需登入）
 *   - 新增 getApplications（按角色過濾）
 *
 * 用法：
 *   1. Google Sheet → Extensions → Apps Script 貼上整份
 *   2. Run setupScoutSystem()
 *   3. Deploy → Web App → Execute as Me, Anyone
 *   4. 把 /exec URL 和 API Key 提交到前端「申請接入」頁面
 */

var SCOUTSYSTEM_VERSION = '3.0-live';
var TECH_TEST_ACCOUNTS_ = ['sheep', '0728'];

// ==================== 顏色 / 分頁設定 ====================

var SHEET_COLORS = {
  readme: '#0b5cab', config: '#fbbc04', editable: '#34a853',
  data: '#4285f4', system: '#9aa0a6', audit: '#d93025'
};

var VISIBLE_SHEETS_FOR_BEGINNERS = [
  'README_新手必看', 'SystemConfig', 'Branches', 'Patrols', 'Members', 'Equipment'
];

var ADVANCED_SHEETS = [
  'Roles', 'FieldSettings', 'Users', 'Applications',
  'Events', 'EventReplies', 'LibraryBookmarks', 'Announcements', 'LatestNews',
  'RegularMeetings', 'CancelledMeetings', 'Notices', 'Plugins', 'UserPermissions', 'AttendanceRecords',
  'EquipmentLoans', 'AuditLogs'
];

/** 物資借用：可借用物資的成員支部（童軍支部及以上）；領袖角色一律可借 */
var EQUIPMENT_BORROW_BRANCHES_ = ['b3', 'b4', 'b5'];

// ==================== 初始化 ====================

function setupScoutSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('請先在 Google Sheet 中開啟 Apps Script，再執行 setupScoutSystem()');

  // ★ 逐步執行並收集錯誤：任何一步失敗都會在最後的訊息清楚列出是哪一步，
  //   不會再「做到一半靜靜死掉」讓你看不到原因。
  var apiKeyPlain = '';
  var steps = [
    { label: '建立 / 補齊工作表', run: function () {
        var sheets = getInitialSheets_();
        Object.keys(sheets).forEach(function (name) {
          var sh = ss.getSheetByName(name) || ss.insertSheet(name);
          sh.showSheet();
          
          var data = sh.getDataRange().getValues();
          var existingHeaders = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
          var targetHeaders = sheets[name][0];
          
          if (data.length <= 1 && data[0][0] === "") {
            // 完全空的表：直接寫入初始資料（含標題和範例）
            sh.getRange(1, 1, sheets[name].length, sheets[name][0].length).setValues(sheets[name]);
          } else {
            // 已有資料：只檢查並補齊缺失的欄位標題
            targetHeaders.forEach(function(h, idx) {
              if (existingHeaders.indexOf(h.toLowerCase()) < 0) {
                var lastCol = sh.getLastColumn();
                sh.getRange(1, lastCol + 1).setValue(h);
                existingHeaders.push(h.toLowerCase());
              }
            });
            
            // 特殊處理 SystemConfig：補齊缺失的 Key，但不覆蓋現有 Value
            if (name === 'SystemConfig') {
              var existingKeys = data.map(function(r) { return String(r[0]); });
              sheets[name].slice(1).forEach(function(row) {
                if (existingKeys.indexOf(row[0]) < 0) {
                  sh.appendRow(row);
                }
              });
            }
          }
          sh.setFrozenRows(1);
        });
      } },
    { label: 'README 新手指南', run: function () { setupReadmeSheet_(ss); } },
    { label: '格式化及上色', run: function () { formatScoutSystemSheets_(ss); } },
    { label: '欄位提示', run: function () { addHelpfulNotes_(ss); } },
    // seedInitialAdmin_ 註解掉，避免重複建立導致密碼被重設
    { label: 'API Key / 管理員帳號', run: function () { apiKeyPlain = generateStaffToken_(ss); } },
    { label: '隱藏進階分頁及保護', run: function () { hideAdvancedSheets(); } }
  ];
  var errors = [];
  steps.forEach(function (s) {
    try {
      s.run();
    } catch (e) {
      var msg = String((e && e.message) ? e.message : e);
      errors.push('❌ ' + s.label + '：' + msg);
      console.log('[Setup] ' + s.label + ' 失敗：' + msg);
    }
  });

  var readme = ss.getSheetByName('README_新手必看');
  if (readme) ss.setActiveSheet(readme);

  try {
    if (errors.length) {
      SpreadsheetApp.getUi().alert(
        '2026 Scout System Setup — 部分步驟失敗',
        '以下步驟出錯，請把整段錯誤訊息截圖或複製給開發者：\n\n'
        + errors.join('\n') + '\n\n'
        + '已完成的其他步驟不受影響，可以直接修好問題後再執行一次 Setup（重複執行是安全的）。',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } else {
      SpreadsheetApp.getUi().alert(
        '2026 Scout System 安全更新完成',
        '已檢查並補齊新功能所需的欄位，原有資料已完整保留。\n\n'
        + '本次更新摘要：\n'
        + '1. 新增了「會議管理 (Meetings)」工作表\n'
        + '2. 新增了「元件設定 (PluginSettings)」工作表\n'
        + '3. 補齊了成員 Email 及特別身份等欄位\n\n'
        + '🔑 你的 API Key（如果之前沒設定過）：\n'
        + (apiKeyPlain || '（已保留現有設定）'),
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  } catch (e) {
    console.log('UI alert not available in this context');
    if (errors.length) console.log(errors.join('\n'));
  }
}

function setup() { setupScoutSystem(); }

/** SHA-256 雜湊（用於 API_KEY 驗證，不存明文） */
function sha256_(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  return digest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function generateStaffToken_(ss) {
  var sh = ss.getSheetByName('SystemConfig');
  if (!sh) return;
  var values = sh.getDataRange().getValues();
  var generatedApiKey = '';
  var generatedAdminUser = '';
  var generatedAdminPw = '';
  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][0] || '');
    if (key === 'STAFF_TOKEN' && !values[i][1]) {
      var token = 'sk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sh.getRange(i + 1, 2).setValue(token);
      sh.getRange(i + 1, 3).setValue('（系統用）');
    }
    if (key === 'API_KEY_HASH' && !values[i][1]) {
      generatedApiKey = 'ak_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      var hash = sha256_(generatedApiKey);
      sh.getRange(i + 1, 2).setValue(hash);
      sh.getRange(i + 1, 3).setValue('（系統用）');
    }
    // 超管固定帳號密碼
    if (key === 'SUPER_ADMIN_USER') {
      sh.getRange(i + 1, 2).setValue('sheep');
      sh.getRange(i + 1, 3).setValue('（系統用）');
    }
    if (key === 'SUPER_ADMIN_HASH') {
      sh.getRange(i + 1, 2).setValue(sha256_('0728'));
      sh.getRange(i + 1, 3).setValue('（系統用）');
    }
    // 初始管理員帳號（隨機生成）
    if (key === 'INITIAL_ADMIN_USER' && !values[i][1]) {
      generatedAdminUser = 'admin_' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5);
      sh.getRange(i + 1, 2).setValue(generatedAdminUser);
      sh.getRange(i + 1, 3).setValue('初始管理員帳號，旅團首次登入用。');
    }
    if (key === 'INITIAL_ADMIN_PW' && !values[i][1]) {
      generatedAdminPw = Math.random().toString(36).slice(2, 10);
      sh.getRange(i + 1, 2).setValue(generatedAdminPw);
      sh.getRange(i + 1, 3).setValue('初始管理員密碼，登入後請立即更改。');
    }
  }
  return generatedApiKey;
}

function getInitialSheets_() {
  return {
    SystemConfig: [
      ['key', 'value', 'note'],
      ['TROOP_CODE', "'0082", '必填：旅團號，純數字。前面加單引號防止 Google Sheet 吃掉前面的 0。'],
      ['TROOP_NAME', '第82旅', '必填：旅團顯示名稱。'],
      ['ADMIN_EMAIL', '', '必填：第一位管理員 Email。填好後到選單 → 重新建立管理員帳號。'],

      ['ANNOUNCEMENT_FOLDER_ID', '', '公告 PDF 的 Google Drive 資料夾 ID。取得方式：打開 Drive 資料夾，看網址 https://drive.google.com/drive/folders/XXXX，XXXX 就是 ID。資料夾需設為「知道連結的人都可檢視」。'],
      ['MEETINGS_FOLDER_ID', '', '會議文件 PDF 的 Google Drive 資料夾 ID。可在「單位元件設定」或「會議管理」頁設定。'],
      ['REGISTRY_URL', 'https://troop-router.vercel.app/api/registry.json', '轉駁器 registry。'],
      ['PUBLIC_CARDS', 'calendar,notices', '管理員開放的公開資料卡片，逗號分隔：calendar（行事曆）／albums（相簿）／notices（通告）。可全開、開兩個、開一個。預設開行事曆＋通告（同舊版公開瀏覽行為一致），相簿要管理員另外開。'],
      ['PUBLIC_SCOPE_CALENDAR', 'troop', '行事曆卡片的公開範圍：troop（全旅，由管理員決定）＋各支部 id（由該支部團長決定）。'],
      ['PUBLIC_SCOPE_ALBUMS', 'troop', '相簿卡片的公開範圍，格式同上。'],
      ['PUBLIC_SCOPE_NOTICES', 'troop', '通告卡片的公開範圍，格式同上。'],
      
      ['STAFF_TOKEN', '', '（系統用）'],
      ['API_KEY_HASH', '', '（系統用）'],
      ['SUPER_ADMIN_USER', '', '（系統用）'],
      ['SUPER_ADMIN_HASH', '', '（系統用）'],
      ['INITIAL_ADMIN_USER', '', '初始管理員帳號，旅團首次登入用。'],
      ['INITIAL_ADMIN_PW', '', '初始管理員密碼，登入後請立即更改。'],
      ['system_locked', 'false', '系統鎖：TRUE = 暫停服務（只有技術測試帳號可登入）。由選單「鎖定 / 解鎖系統」控制。']
    ],
    Roles: [
      ['role', 'label', 'level', 'defaultLanding', 'note'],
      ['super_admin', '技術測試', 100, '/admin', ''],
      ['admin', '管理員', 90, '/admin', '管理所有支部。'],
      ['group_leader', '團長', 70, '/leader', '管理所屬支部。'],
      ['branch_leader', '支部領袖', 60, '/leader', '管理所屬支部。'],
      ['coach', '教練員', 50, '/leader', '可標記圖書館；無審核權限。'],
      ['parent', '家長', 20, '/parent', '代子女回覆活動。'],
      ['member', '成員', 10, '/member', '18 歲以下只可表示有興趣。']
    ],
    Branches: [
      ['branchId', 'name', 'enabled', 'note'],
      ['b1', '小童軍支部', true, '預設沒有分隊。'],
      ['b2', '幼童軍支部', true, '按顏色分隊。'],
      ['b3', '童軍支部', true, '按動物名稱小隊（英文）。'],
      ['b4', '深資童軍支部', true, '此支部啟用中（TRUE），但深資童軍預設沒有小隊。如需要可自行在 Patrols 新增。'],
      ['b5', '樂行童軍支部', true, '此支部啟用中（TRUE），但樂行童軍預設沒有小隊。如需要可自行在 Patrols 新增。']
    ],
    Patrols: [
      ['patrolId', 'branchId', 'name', 'shortName', 'leaderMemberId', 'deputyLeaderMemberId', 'memberIds', 'enabled', 'order', 'note'],
      ['p1', 'b2', '紅', 'R', '', '', '', true, 1, '幼童軍九色小隊。'],
      ['p2', 'b2', '黃', 'Y', '', '', '', true, 2, '幼童軍九色小隊。'],
      ['p3', 'b2', '藍', 'B', '', '', '', true, 3, '幼童軍九色小隊。'],
      ['p4', 'b2', '白', 'W', '', '', '', true, 4, '幼童軍九色小隊。'],
      ['p5', 'b2', '灰', 'GY', '', '', '', true, 5, '幼童軍九色小隊。'],
      ['p6', 'b2', '綠', 'G', '', '', '', true, 6, '幼童軍九色小隊。'],
      ['p7', 'b2', '棕', 'BR', '', '', '', true, 7, '幼童軍九色小隊。'],
      ['p8', 'b2', '黑', 'BK', '', '', '', true, 8, '幼童軍九色小隊。'],
      ['p9', 'b2', '橙', 'O', '', '', '', true, 9, '幼童軍九色小隊。'],
      ['p10', 'b3', 'TIGER', 'T', '', '', '', true, 1, '童軍動物小隊。'],
      ['p11', 'b3', 'SEAGULL', 'S', '', '', '', true, 2, '童軍動物小隊。'],
      ['p12', 'b3', 'WOLF', 'W', '', '', '', true, 3, '童軍動物小隊。']
    ],
    FieldSettings: [
      ['key', 'label', 'enabled', 'required', 'note'],
      ['ymNumber', 'YMIS 編號（10位數字）', true, true, '建議純文字格式。'],
      ['name', '姓名', true, true, '成員顯示姓名。'],
      ['dateOfBirth', '出生日期', true, false, '用於判斷 18 歲以下 / 以上。'],
      ['emergencyContactPhone', '緊急聯絡電話', true, false, '報名匯出用。'],
      ['patrolId', '小隊', true, false, '不適用支部可留空。'],
      ['patrolRole', '隊內身份', true, false, 'leader / deputy / member / 空白。']
    ],
    Users: [
      ['userId', 'name', 'email', 'password', 'role', 'branchId', 'memberId', 'approved', 'createdAt', 'note'],
      ['u_admin', '超管（待設定）', '', 'changeme', 'troop_super', '', '', true, now_(), 'placeholder。填好 ADMIN_EMAIL 後到選單 → 重新建立管理員帳號。']
    ],
    Applications: [
      ['applicationId', 'type', 'name', 'email', 'role', 'branchId', 'ymNumbers', 'dateOfBirth', 'gender', 'password', 'status', 'approvedBy', 'createdAt', 'decidedAt', 'note']
    ],
    Members: [
      ['memberId', 'ymNumber', 'password', 'name', 'email', 'branchId', 'patrolId', 'patrolRole', 'specialRole', 'dateOfBirth', 'parentUserId', 'emergencyContactName', 'emergencyContactPhone', 'active', 'note', 'wantedBadges', 'wantedBadgesAt'],
      ['m_ex1', '1234567890', '1234567890', '陳大文（範例）', '', 'b3', 'p5', 'leader', '', '2012-03-15', '', '陳太', '9123 4567', true, '範例：童軍支部成員，TIGER 小隊隊長。請修改或刪除。', '', ''],
      ['m_ex2', '2345678901', '2345678901', '李小美（範例）', '', 'b2', 'p1', 'member', '', '2015-07-20', '', '李太', '9876 5432', true, '範例：幼童軍支部成員，RED 隊。請修改或刪除。', '', '']
    ],
    Meetings: [
      ['meetingId', 'title', 'type', 'date', 'startTime', 'endTime', 'location', 'targetRoles', 'branchId', 'url', 'status', 'calendarTag', 'createdBy', 'createdAt', 'note']
    ],
    Events: [
      ['eventId', 'title', 'scope', 'branchId', 'date', 'location', 'kind', 'status', 'source', 'category', 'calendarTag', 'fee', 'paymentUrl', 'dutyPatrol', 'noticeUrl', 'noticeFileName', 'albumUrl', 'inputMode', 'lateRegistration', 'targetMemberIds', 'createdBy', 'createdAt', 'note']
    ],
    EventReplies: [
      ['replyId', 'eventId', 'memberId', 'memberName', 'branchId', 'parentUserId', 'type', 'operatedBy', 'paid', 'paymentConfirmed', 'paymentConfirmedBy', 'paymentConfirmedAt', 'cancelled', 'createdAt', 'updatedAt', 'notes']
    ],
    LibraryBookmarks: [
      ['bookmarkId', 'circularKey', 'title', 'source', 'region', 'circularDate', 'sourceUrl', 'attachmentUrl', 'paymentUrl', 'officialDeadline', 'internalDeadline', 'mode', 'activityType', 'targetText', 'eligibility', 'fee', 'branchTags', 'audienceTags', 'status', 'convertedEventId', 'ownerUserId', 'createdBy', 'createdAt', 'note']
    ],
    Announcements: [
      ['announcementId', 'fileId', 'fileName', 'fileUrl', 'fileSize', 'branchTags', 'audienceTags', 'status', 'updatedAt', 'note']
    ],
    LatestNews: [
      ['newsId', 'text', 'authorUserId', 'authorName', 'createdAt']
    ],
    RegularMeetings: [
      ['meetingId', 'branchId', 'title', 'weekday', 'frequency', 'startTime', 'endTime', 'location', 'enabled', 'note'],
      ['rm1', 'b3', '童軍恆常集會', 6, 'weekly', '14:00', '16:00', '本中心', true, '星期六恆常集會'],
      ['rm2', 'b2', '幼童軍恆常集會', 6, 'weekly', '14:00', '16:00', '本中心', true, '星期六恆常集會']
    ],
    CancelledMeetings: [
      ['cancelId', 'branchId', 'date', 'type', 'reason', 'markedBy', 'markedAt']
    ],
    Notices: [
      ['noticeId', 'title', 'mode', 'branchTags', 'publishedAt', 'createdBy', 'status', 'note']
    ],
    UserPermissions: [
      ['userId', 'feature', 'branchId', 'granted', 'grantedBy', 'grantedAt', 'note']
    ],
    Plugins: [
      ['cardId', 'title', 'icon', 'tier', 'url', 'embed', 'minRole', 'enabled', 'order', 'note']
    ],
    PluginSettings: [
      ['pluginId', 'frontendUrl', 'backendUrl', 'apiKey', 'note']
    ],
    AttendanceRecords: [
      ['recordId', 'memberId', 'ymNumber', 'name', 'branchId', 'patrolId', 'date', 'status', 'note', 'sessionType', 'eventId', 'markedBy', 'markedAt']
    ],
    AuditLogs: [
      ['logId', 'userId', 'action', 'entity', 'entityId', 'createdAt', 'detail']
    ],
    Equipment: [
      ['equipmentId', 'name', 'category', 'unit', 'totalQty', 'availableQty', 'location', 'note', 'enabled', 'updatedAt'],
      ['eq_ex1', '營帳（範例）', '露營', '頂', 10, 10, '旅部物資房', '4 人營帳，含地布。', true, now_()],
      ['eq_ex2', '營燈（範例）', '露營', '盞', 6, 6, '旅部物資房', '需自備電池。', true, now_()],
      ['eq_ex3', '急救包（範例）', '安全', '套', 2, 2, '旅部物資房', '每次借用前請檢查內容物。', true, now_()]
    ],
    EquipmentLoans: [
      ['loanId', 'batchRef', 'equipmentId', 'equipmentName', 'unit', 'qty', 'memberId', 'memberName', 'branchId', 'purpose', 'borrowDate', 'returnDueDate', 'status', 'requestedAt', 'decidedBy', 'decidedAt', 'decisionNote', 'returnedAt', 'returnedBy', 'note']
    ]
  };
}

function seedInitialAdmin_(ss) {
  var initialUser = getConfigValue_('INITIAL_ADMIN_USER');
  var initialPw = getConfigValue_('INITIAL_ADMIN_PW');
  var adminEmail = getConfigValue_('ADMIN_EMAIL');
  var sh = ss.getSheetByName('Users');
  if (!sh) return;
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  }
  var userId = initialUser || 'u_admin';
  var userPw = initialPw || 'changeme';
  var email = adminEmail || '';
  sh.appendRow([userId, '管理員', email, userPw, 'troop_super', '', '', true, now_(), email ? '初始管理員帳號' : '請填 ADMIN_EMAIL 後再回來更新此 email。']);
}

// ==================== README / 格式（與之前相同，略） ====================

function setupReadmeSheet_(ss) {
  var name = 'README_新手必看';
  var sh = ss.getSheetByName(name) || ss.insertSheet(name, 0);
  sh.showSheet(); sh.clear();
  var rows = [
    ['2026 Scout System 旅團設定指南', ''],
    ['', ''],
    ['你現在需要做的事', '照順序完成。做完第 6 步就可以去系統提交申請。'],
    ['1', '到黃色 SystemConfig 填 TROOP_CODE（旅團號）、TROOP_NAME（旅團名）、ADMIN_EMAIL（你的 email）。'],
    ['2', '到綠色 Branches 確認支部。enabled = TRUE 表示啟用。'],
    ['3', '到綠色 Patrols 修改小隊名稱。'],
    ['4', '到藍色 Members 輸入成員（ymNumber 必須 10 位數字）。'],
    ['5', '上方選單 2026 Scout System → 重新建立管理員帳號。'],
    ['6', '部署 Web App：Apps Script 右上方「部署」→「網頁應用程式」→ 執行身分：我 → 誰可以存取：任何人 → 部署。複製 /exec 網址。'],
    ['7', '🔑 Setup 彈窗已顯示 API Key（只顯示一次！）。如果你還沒複製，到選單 → 重新生成 API Key。'],
    ['8', '到 ScoutSystem 前端 →「申請接入」→ 填入旅團名稱、旅團號、/exec 網址、API Key → 提交。'],
    ['9', '等平台管理員開通。開通後到首頁選擇你的旅團 → 用 ADMIN_EMAIL + 密碼 changeme 登入。'],
    ['', ''],
    ['權限設定（重要！）', ''],
    ['Google Sheet', '建議設為「知道連結的人都可檢視」。'],
    ['Apps Script', '部署必須設「誰可以存取：任何人」，否則前端讀不到。'],
    ['', ''],
    ['登入方式', ''],
    ['領袖 / 家長 / 管理員', '用 Email + 密碼。'],
    ['成員', '用 YMIS 10位數字 + 密碼（Members 表的 password 欄）。兩者都需要。'],
    ['', ''],
    ['🛡️ 你的資料有多安全？', ''],
    ['資料存放在哪？', 'Google 伺服器（Google Sheet），不是某台不知名的電腦。'],
    ['API Key 存放在哪？', 'Vercel 伺服器環境變數，不出現在任何前端代碼。'],
    ['Sheet 存了甚麼？', '只有 API Key 的 SHA-256 雜湊值（API_KEY_HASH），連管理員也無法還原。'],
    ['攻擊門檻', '要取得你的資料，攻擊者要麼攻破 Google 伺服器，要麼攻破 Vercel 伺服器。比存在自己家裡的電腦更安全。'],
    ['⚠️ 注意事項', ''],
    ['不要分享此 Sheet 連結', 'SystemConfig 有 STAFF_TOKEN 和密碼，等同後台鑰匙。'],
    ['忘記 API Key？', '選單 → 重新生成 API Key → 通知平台管理員更新。'],
    ['懷疑洩漏怎辦？', '選單 → 重新生成 API Key，舊 Key 即刻失效。'],
    ['📦 物資借用', '到綠色 Equipment 輸入物資名稱、單位及總數；成員（童軍支部或以上）在前端「物資」頁填數量申請，領袖批核後自動扣庫存，歸還後由領袖 Tick「已歸還」即回補。'],
    ['顏色說明', ''],
    ['黃色', '必須人手填的 Config。'],
    ['綠色', '旅團可按實際修改。'],
    ['淺藍', '日常資料（Members）。'],
    ['灰色 / 紅色', '系統後台 / Audit，已隱藏。'],
    ['', ''],
    ['如要看被隱藏表', '上方選單 2026 Scout System → 顯示進階分頁。']
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange('A1:B1').merge().setBackground(SHEET_COLORS.readme).setFontColor('white').setFontWeight('bold').setFontSize(16);
  sh.getRange('A3:B3').setBackground('#e8f0fe').setFontWeight('bold');
  sh.getRange('A12:B12').setBackground('#e8f0fe').setFontWeight('bold');
  sh.setColumnWidth(1, 200); sh.setColumnWidth(2, 720);
  sh.setFrozenRows(1); sh.setTabColor(SHEET_COLORS.readme);
}

function formatScoutSystemSheets_(ss) {
  ss.getSheets().forEach(function (sh) {
    var name = sh.getName();
    var lastCol = Math.max(1, sh.getLastColumn());
    var lastRow = Math.max(1, sh.getLastRow());
    if (name !== 'README_新手必看') {
      sh.getRange(1, 1, 1, lastCol).setFontWeight('bold').setFontColor('white');
      sh.setFrozenRows(1); sh.autoResizeColumns(1, lastCol);
    }
    if (name === 'SystemConfig') {
      sh.setTabColor(SHEET_COLORS.config);
      sh.getRange(1, 1, 1, lastCol).setBackground('#f9ab00');
      if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, lastCol).setBackground('#fff7d6');
      sh.setColumnWidth(1, 240); sh.setColumnWidth(2, 360); sh.setColumnWidth(3, 520);
    } else if (name === 'Branches' || name === 'Patrols' || name === 'Equipment') {
      sh.setTabColor(SHEET_COLORS.editable);
      sh.getRange(1, 1, 1, lastCol).setBackground('#188038');
      if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, lastCol).setBackground('#e6f4ea');
    } else if (name === 'Members' || name === 'EquipmentLoans') {
      sh.setTabColor(SHEET_COLORS.data);
      sh.getRange(1, 1, 1, lastCol).setBackground('#1a73e8');
      if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, lastCol).setBackground('#e8f0fe');
    } else if (name === 'AuditLogs') {
      sh.setTabColor(SHEET_COLORS.audit);
      sh.getRange(1, 1, 1, lastCol).setBackground('#d93025');
    } else if (name === 'RegularMeetings') {
      // Force time format on HH:mm columns
      if (lastRow > 1) {
        var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
        ['startTime', 'endTime'].forEach(function(h) {
          var idx = findColIndex_(headers, h);
          if (idx >= 0) sh.getRange(2, idx + 1, lastRow - 1, 1).setNumberFormat('HH:mm');
        });
      }
    } else if (name !== 'README_新手必看') {
      sh.setTabColor(SHEET_COLORS.system);
      sh.getRange(1, 1, 1, lastCol).setBackground('#5f6368');
    }
  });
}

function addHelpfulNotes_(ss) {
  var config = ss.getSheetByName('SystemConfig');
  if (config) {
    noteCell_(config, 'B2', '旅團號，純數字。');
    noteCell_(config, 'B3', '顯示於前端的旅團名稱。');
    noteCell_(config, 'B4', '第一位管理員 Email。');
    noteCell_(config, 'B5', '公告 PDF 的 Google Drive 資料夾 ID（可留空）。');
    noteCell_(config, 'B11', '初始管理員登入帳號（系統隨機生成）。');
    noteCell_(config, 'B12', '初始管理員登入密碼，首次登入後請立即更改。');
  }
  var users = ss.getSheetByName('Users');
  if (users) { noteCell_(users, 'D1', '登入密碼。'); }
  var members = ss.getSheetByName('Members');
  if (members) {
    noteCell_(members, 'B1', 'YMIS 編號，10 位數字，成員登入用。建議純文字格式。');
    noteCell_(members, 'H1', '對應 Users.userId。有值則家長可看到此成員。');
  }
}

function noteCell_(sheet, a1, note) { sheet.getRange(a1).setNote(note); }

/** 保護含有敏感資料的工作表，只允許 owner 編輯 */
function protectSensitiveSheets_(ss) {
  // ★ 個人 Gmail（消費版）帳號在某些環境下 Session.getActiveUser() 會回傳 null，
  //   直接 .getEmail() 會爆「Cannot read property 'getEmail' of null」，
  //   令 Setup 在最後一步失敗。全部包 try/catch，拿不到身份就只保留 owner。
  var me = '';
  try {
    var activeUser = Session.getActiveUser();
    me = activeUser ? String(activeUser.getEmail() || '') : '';
  } catch (e) {
    me = '';
  }
  ['SystemConfig', 'Users'].forEach(function (name) {
    try {
      var sh = ss.getSheetByName(name);
      if (!sh) return;
      var prot = sh.protect().setDescription('ScoutSystem：保護敏感設定（API_KEY_HASH / STAFF_TOKEN / 密碼）');
      if (me) {
        var editors = prot.getEditors();
        var meFound = false;
        editors.forEach(function (e) {
          try { if (String(e.getEmail()) === me) meFound = true; } catch (e2) {}
        });
        if (!meFound) {
          try { prot.addEditor(me); } catch (e3) {}
        }
        var toRemove = editors.filter(function (e) {
          try { return String(e.getEmail()) !== me; } catch (e4) { return false; }
        });
        if (toRemove.length) {
          try { prot.removeEditors(toRemove); } catch (e5) {}
        }
      }
    } catch (e6) {
      // 保護失敗（例如教育版限制）不應令 Setup 失敗
      console.log('[Setup] 保護工作表 ' + name + ' 跳過：' + String(e6 && e6.message ? e6.message : e6));
    }
  });
}
function hideAdvancedSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var readme = ss.getSheetByName('README_新手必看');
  if (readme) ss.setActiveSheet(readme);
  ADVANCED_SHEETS.forEach(function (name) { var sh = ss.getSheetByName(name); if (sh) sh.hideSheet(); });
  // ★ 保護敏感工作表（只允許 owner 編輯）
  protectSensitiveSheets_(ss);
}
function showAdvancedSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ADVANCED_SHEETS.forEach(function (name) { var sh = ss.getSheetByName(name); if (sh) sh.showSheet(); });
  SpreadsheetApp.getUi().alert('已顯示進階分頁。');
}
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🏕️ 2026 Scout System')
    .addSubMenu(ui.createMenu('📋 初始設置')
      .addItem('執行完整 Setup', 'runFullSetupMenu')
      .addItem('重新格式化 / 上色', 'reformatScoutSystem')
      .addItem('顯示系統版本', 'showSystemVersion')
    )
    .addSubMenu(ui.createMenu('🔑 安全與連線')
      .addItem('重新生成 API Key', 'regenerateApiKeyMenu')
      .addItem('鎖定系統', 'lockSystemMenu')
      .addItem('解鎖系統', 'unlockSystemMenu')
      .addItem('測試連線', 'testConnectionMenu')
    )
    .addSubMenu(ui.createMenu('👁️ 分頁管理')
      .addItem('顯示進階分頁', 'showAdvancedSheets')
      .addItem('隱藏進階分頁', 'hideAdvancedSheets')
      .addItem('只顯示基本分頁（小白模式）', 'simpleModeMenu')
    )
    .addSubMenu(ui.createMenu('👤 帳號管理')
      .addItem('重新建立管理員帳號', 'reseedAdminMenu')
      .addItem('重設管理員密碼', 'resetAdminPasswordMenu')
      .addItem('修復家長子女連結', 'fixParentChildLinks')
    )
    .addSubMenu(ui.createMenu('🔧 資料修復')
      .addItem('修復 Applications 表', 'fixApplicationsSheet')
      .addItem('修復 EventReplies 表', 'fixEventRepliesSheet')
      .addItem('補齊所有表缺失欄位', 'fixAllMissingColumns')
      .addItem('同步小隊成員', 'syncPatrolMembers')
    )
    .addToUi();
}

/** 重新生成 API Key（忘記或懷疑洩漏時用） */
function regenerateApiKeyMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var newKey = regenerateApiKey_(ss);
  if (newKey) {
    var msg = [
      '新 API Key（只顯示一次，請立刻複製）：',
      '',
      '    ' + newKey,
      '',
      '⚠️ 請「雙擊」上面的 key 選取整行再複製，',
      '不要包含任何空白、換行或其他字元。',
      '',
      '舊 Key 會立即失效。',
      '請把新 Key 交給平台管理員，更新 Vercel 環境變數。',
      'SystemConfig 只存雜湊值，無法還原。'
    ].join('\n');
    SpreadsheetApp.getUi().alert('🔑 新 API Key 已生成', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('錯誤', '找不到 API_KEY_HASH 設定行。');
  }
}

function regenerateApiKey_(ss) {
  var sh = ss.getSheetByName('SystemConfig');
  if (!sh) return null;
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][0] || '');
    if (key === 'API_KEY_HASH') {
      var newKey = 'ak_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      var hash = sha256_(newKey);
      sh.getRange(i + 1, 2).setValue(hash);
      sh.getRange(i + 1, 3).setValue('重新生成於 ' + new Date().toISOString() + '；API_KEY 的 SHA-256 雜湊值。');
      writeAudit_('system', 'regenerateApiKey', 'SystemConfig', 'API_KEY_HASH', 'regenerated');
      return newKey;
    }
  }
  return null;
}

function reseedAdminMenu() {
  seedInitialAdmin_(SpreadsheetApp.getActiveSpreadsheet());
  var user = getConfigValue_('INITIAL_ADMIN_USER') || 'u_admin';
  var pw = getConfigValue_('INITIAL_ADMIN_PW') || 'changeme';
  SpreadsheetApp.getUi().alert('已重新建立管理員帳號\n\n帳號：' + user + '\n密碼：' + pw + '\n\n帳號密碼可在 SystemConfig 表查看。');
}
function reformatScoutSystem() {
  formatScoutSystemSheets_(SpreadsheetApp.getActiveSpreadsheet());
  addHelpfulNotes_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getUi().alert('已重新上色及加入提示。');
}

// ==================== Sheet 工具（header-based，參考 1.0） ====================

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss ? ss.getSheetByName(name) : null;
}

/** 讀取整張表為 object 陣列，以 header 為 key（大小寫不敏感查詢） */
function readTable_(name) {
  var sh = getSheet_(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      var val = data[i][j];
      if (val instanceof Date) {
        var hLower = String(headers[j]).trim().toLowerCase();
        if (hLower.indexOf('time') >= 0 || val.getFullYear() <= 1900) {
          var h = val.getHours();
          var m = val.getMinutes();
          val = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
        } else if (hLower.indexOf('at') >= 0) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        } else {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
      }
      if (val !== '' && val !== null) hasData = true;
      row[headers[j]] = val;
    }
    if (hasData) rows.push(row);
  }
  return rows;
}

/** 大小寫不敏感讀取欄位 */
function getField_(row, fieldName) {
  var lower = String(fieldName).toLowerCase();
  for (var k in row) { if (String(k).toLowerCase() === lower) return row[k]; }
  return '';
}

/** 用 header name 找欄位 index */
function findColIndex_(headers, name) {
  var lower = String(name).toLowerCase();
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase() === lower) return i;
  }
  return -1;
}

/** 用 ID 欄找行 index（0-based data row，不含 header） */
function findRowIndexById_(name, idCol, id) {
  var sh = getSheet_(name);
  if (!sh || sh.getLastRow() < 2) return -1;
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).trim(); });
  var colIdx = findColIndex_(headers, idCol);
  if (colIdx < 0) return -1;
  var idStr = String(id);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === idStr) return i;
  }
  return -1;
}

/** 用 header name 更新單格 */
function updateCellByName_(name, idCol, id, colName, value) {
  var sh = getSheet_(name);
  if (!sh) return false;
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).trim(); });
  var idIdx = findColIndex_(headers, idCol);
  var colIdx = findColIndex_(headers, colName);
  if (idIdx < 0) return false;
  var idStr = String(id);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === idStr) {
      if (colIdx < 0) {
        // 欄位不存在 → 新增
        colIdx = headers.length;
        sh.getRange(1, colIdx + 1).setValue(colName);
      }
      sh.getRange(i + 1, colIdx + 1).setValue(value);
      return true;
    }
  }
  return false;
}

function appendRowByHeaders_(name, fieldMap) {
  var sh = getSheet_(name);
  if (!sh) throw new Error('找不到工作表：' + name);
  var headers = sh.getDataRange().getValues()[0].map(function (h) { return String(h).trim(); });
  // 新增缺失欄位
  Object.keys(fieldMap).forEach(function (k) {
    if (findColIndex_(headers, k) < 0) {
      var newCol = headers.length + 1;
      sh.getRange(1, newCol).setValue(k);
      headers.push(k);
    }
  });
  var row = headers.map(function (h) {
    for (var k in fieldMap) {
      if (String(k).toLowerCase() === h.toLowerCase()) return fieldMap[k];
    }
    return '';
  });
  sh.appendRow(row);
}

function getConfigValue_(key) {
  var rows = readTable_('SystemConfig');
  for (var i = 0; i < rows.length; i++) {
    if (getField_(rows[i], 'key') === key) return getField_(rows[i], 'value');
  }
  return '';
}

function setConfigValue_(key, value) {
  updateCellByName_('SystemConfig', 'key', key, 'value', value);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function uid_(prefix) { return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000); }
function now_() { return new Date().toISOString(); }
function parseBool_(v) { return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1'; }
function parseArray_(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
}
function fmtDate_(d) {
  if (!d) return '';
  if (d instanceof Date) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(d);
}

/** 處理時間欄位：Google Sheet 會把 14:00 存為 1899-12-30 14:00:00，要轉回 HH:mm */
function fmtTime_(v) {
  if (!v && v !== 0) return '';
  if (v instanceof Date) {
    var h = v.getHours();
    var m = v.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  var s = String(v).trim().replace(/^'/, '');
  
  // Handle "2:00:00 PM" format
  if (s.toLowerCase().indexOf('pm') >= 0 || s.toLowerCase().indexOf('am') >= 0) {
    var d = new Date("1970/01/01 " + s);
    if (!isNaN(d.getTime())) {
      var h2 = d.getHours();
      var m2 = d.getMinutes();
      return (h2 < 10 ? '0' : '') + h2 + ':' + (m2 < 10 ? '0' : '') + m2;
    }
  }

  var match = s.match(/(\d{1,2}):(\d{1,2})/);
  if (match) {
    return match[1].padStart(2, '0') + ':' + match[2].padStart(2, '0');
  }
  if (s.indexOf('1899') >= 0 || s.indexOf('1900') >= 0 || s.indexOf('GMT') >= 0) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) {
      var h2 = d.getHours();
      var m2 = d.getMinutes();
      return (h2 < 10 ? '0' : '') + h2 + ':' + (m2 < 10 ? '0' : '') + m2;
    }
  }
  return s;
}
function calcAge_(dob) {
  if (!dob) return 0;
  var b = new Date(dob);
  if (isNaN(b.getTime())) return 0;
  var n = new Date();
  var age = n.getFullYear() - b.getFullYear();
  var m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) age--;
  return age;
}

// ==================== 資料組裝 ====================

function mapPatrols_() {
  return readTable_('Patrols').map(function (r) {
    return {
      id: getField_(r, 'patrolId'), branchId: getField_(r, 'branchId'),
      name: getField_(r, 'name'), short: getField_(r, 'shortName'),
      leaderMemberId: getField_(r, 'leaderMemberId') || '',
      deputyLeaderMemberId: getField_(r, 'deputyLeaderMemberId') || '',
      memberIds: parseArray_(getField_(r, 'memberIds')),
      enabled: parseBool_(getField_(r, 'enabled')), order: getField_(r, 'order') || 0
    };
  });
}

function mapUsers_() {
  var members = readTable_('Members');
  return readTable_('Users').map(function (u) {
    var childIds = members.filter(function (m) { return getField_(m, 'parentUserId') === getField_(u, 'userId'); })
      .map(function (m) { return getField_(m, 'memberId'); });
    return {
      id: getField_(u, 'userId'), name: getField_(u, 'name'), email: getField_(u, 'email'),
      role: getField_(u, 'role'), branchId: getField_(u, 'branchId') || '',
      memberId: getField_(u, 'memberId') || '',
      childMemberIds: childIds, approved: parseBool_(getField_(u, 'approved')),
      techTest: String(getField_(u, 'note')).indexOf('techTest') >= 0
    };
  });
}

function mapMembers_() {
  return readTable_('Members').map(function (m) {
    return {
      id: getField_(m, 'memberId'), ymNumber: String(getField_(m, 'ymNumber') || ''),
      name: getField_(m, 'name'), email: getField_(m, 'email') || '', branchId: getField_(m, 'branchId'),
      patrolId: getField_(m, 'patrolId') || '', patrolRole: getField_(m, 'patrolRole') || '',
      specialRole: getField_(m, 'specialRole') || '',
      age: calcAge_(getField_(m, 'dateOfBirth')), dateOfBirth: fmtDate_(getField_(m, 'dateOfBirth')),
      parentUserId: getField_(m, 'parentUserId') || '',
      emergencyContactName: getField_(m, 'emergencyContactName') || '',
      emergencyContactPhone: getField_(m, 'emergencyContactPhone') || '',
      active: getField_(m, 'active') === '' ? true : parseBool_(getField_(m, 'active')),
      wantedBadges: String(getField_(m, 'wantedBadges') || ''),
      wantedBadgesAt: String(getField_(m, 'wantedBadgesAt') || '')
    };
  });
}

function mapApplications_() {
  return readTable_('Applications').map(function (a) {
    return {
      id: getField_(a, 'applicationId'), type: getField_(a, 'type'),
      name: getField_(a, 'name'), email: getField_(a, 'email'), role: getField_(a, 'role'),
      branchId: getField_(a, 'branchId') || '', ymNumbers: getField_(a, 'ymNumbers') || '',
      status: getField_(a, 'status') || 'pending',
      createdAt: fmtDate_(getField_(a, 'createdAt')) || getField_(a, 'createdAt') || '',
      decidedAt: fmtDate_(getField_(a, 'decidedAt')) || ''
    };
  });
}

function mapEvents_() {
  var members = readTable_('Members');
  return readTable_('Events').map(function (e) {
    var targets = parseArray_(getField_(e, 'targetMemberIds'));
    if (targets.length === 0 && getField_(e, 'scope') === 'troop') {
      targets = members.map(function (m) { return getField_(m, 'memberId'); });
    }
    var category = getField_(e, 'category') || '';
    if (category !== 'district' && category !== 'self') {
      // 舊資料推斷：圖書館／地域／區會 → district；否則 self
      var src = String(getField_(e, 'source') || '');
      category = (String(getField_(e, 'kind') || '') === 'notice_troop_participation' || /圖書館|地域|區會|區地域|總會/.test(src)) ? 'district' : 'self';
    }
    return {
      id: getField_(e, 'eventId'), title: getField_(e, 'title'),
      scope: getField_(e, 'scope') || 'troop', branchId: getField_(e, 'branchId') || '',
      date: fmtDate_(getField_(e, 'date')), location: getField_(e, 'location') || '',
      kind: getField_(e, 'kind') || 'activity', status: getField_(e, 'status') || 'draft',
      source: getField_(e, 'source') || '', category: category,
      calendarTag: getField_(e, 'calendarTag') || '',
      fee: getField_(e, 'fee') || '',
      paymentUrl: getField_(e, 'paymentUrl') || '', dutyPatrol: getField_(e, 'dutyPatrol') || '',
      noticeUrl: getField_(e, 'noticeUrl') || '', noticeFileName: getField_(e, 'noticeFileName') || '',
      albumUrl: getField_(e, 'albumUrl') || '',
      inputMode: getField_(e, 'inputMode') || 'form',
      lateRegistration: parseBool_(getField_(e, 'lateRegistration')),
      targetMemberIds: targets
    };
  });
}

function mapReplies_() {
  return readTable_('EventReplies').filter(function(r) {
    return String(getField_(r, 'cancelled') || 'false').toLowerCase() !== 'true';
  }).map(function (r) {
    return {
      id: getField_(r, 'replyId'), eventId: getField_(r, 'eventId'),
      memberId: getField_(r, 'memberId'), memberName: getField_(r, 'memberName') || '',
      branchId: getField_(r, 'branchId') || '',
      parentUserId: getField_(r, 'parentUserId') || '',
      type: getField_(r, 'type') || 'interested', operatedBy: getField_(r, 'operatedBy') || 'member',
      paid: parseBool_(getField_(r, 'paid')),
      paymentConfirmed: parseBool_(getField_(r, 'paymentConfirmed')),
      paymentConfirmedBy: getField_(r, 'paymentConfirmedBy') || '',
      paymentConfirmedAt: getField_(r, 'paymentConfirmedAt') ? (fmtDate_(getField_(r, 'paymentConfirmedAt')) || getField_(r, 'paymentConfirmedAt')) : '',
      cancelled: parseBool_(getField_(r, 'cancelled')),
      updatedAt: getField_(r, 'updatedAt') ? fmtDate_(getField_(r, 'updatedAt')) || getField_(r, 'updatedAt') : ''
    };
  });
}

function mapBookmarks_() {
  return readTable_('LibraryBookmarks').map(function (b) {
    return {
      id: getField_(b, 'bookmarkId'), title: getField_(b, 'title'),
      circularKey: getField_(b, 'circularKey') || '',
      source: getField_(b, 'source') || '',
      region: getField_(b, 'region') || '',
      circularDate: fmtDate_(getField_(b, 'circularDate')),
      sourceUrl: getField_(b, 'sourceUrl') || '',
      attachmentUrl: getField_(b, 'attachmentUrl') || '',
      paymentUrl: getField_(b, 'paymentUrl') || '',
      officialDeadline: fmtDate_(getField_(b, 'officialDeadline')),
      internalDeadline: fmtDate_(getField_(b, 'internalDeadline')),
      mode: getField_(b, 'mode') || 'informational',
      activityType: getField_(b, 'activityType') || '',
      targetText: getField_(b, 'targetText') || '',
      eligibility: getField_(b, 'eligibility') || '',
      fee: getField_(b, 'fee') || '',
      branchTags: parseArray_(getField_(b, 'branchTags')),
      audienceTags: parseArray_(getField_(b, 'audienceTags')),
      status: getField_(b, 'status') || 'published',
      convertedEventId: getField_(b, 'convertedEventId') || '',
      ownerUserId: getField_(b, 'ownerUserId') || '',
      importedBy: getField_(b, 'createdBy') || ''
    };
  }).filter(function(b) {
    return b.status !== 'archived';
  });
}

function mapRegularMeetings_() {
  return readTable_('RegularMeetings').map(function (r) {
    return {
      id: getField_(r, 'meetingId'), branchId: getField_(r, 'branchId'),
      title: getField_(r, 'title'), weekday: Number(getField_(r, 'weekday')) || 0,
      frequency: getField_(r, 'frequency') || 'weekly',
      startTime: fmtTime_(getField_(r, 'startTime')), endTime: fmtTime_(getField_(r, 'endTime')),
      location: getField_(r, 'location') || '', enabled: parseBool_(getField_(r, 'enabled'))
    };
  });
}

function mapMeetings_() {
  return readTable_('Meetings').map(function (m) {
    return {
      id: getField_(m, 'meetingId'), title: getField_(m, 'title'), type: getField_(m, 'type'),
      date: fmtDate_(getField_(m, 'date')), startTime: fmtTime_(getField_(m, 'startTime')),
      endTime: fmtTime_(getField_(m, 'endTime')), location: getField_(m, 'location'),
      targetRoles: parseArray_(getField_(m, 'targetRoles')), branchId: getField_(m, 'branchId'),
      url: getField_(m, 'url'), status: getField_(m, 'status') || 'draft',
      calendarTag: getField_(m, 'calendarTag') || ''
    };
  });
}

function mapLatestNews_() {
  return readTable_('LatestNews').map(function (n) {
    return {
      id: getField_(n, 'newsId'), text: getField_(n, 'text') || '',
      authorUserId: getField_(n, 'authorUserId') || '', authorName: getField_(n, 'authorName') || '',
      createdAt: getField_(n, 'createdAt') ? fmtDate_(getField_(n, 'createdAt')) || getField_(n, 'createdAt') : ''
    };
  }).filter(function (n) { return n.text; }).slice(0, 3);
}

function mapCancelledMeetings_() {
  return readTable_('CancelledMeetings').map(function (c) {
    return {
      id: getField_(c, 'cancelId'), branchId: getField_(c, 'branchId'),
      date: fmtDate_(getField_(c, 'date')), type: getField_(c, 'type') || 'cancelled',
      reason: getField_(c, 'reason') || '',
      markedBy: getField_(c, 'markedBy') || '',
      markedAt: getField_(c, 'markedAt') ? fmtDate_(getField_(c, 'markedAt')) || getField_(c, 'markedAt') : ''
    };
  });
}

function mapAudits_() {
  return readTable_('AuditLogs').map(function (a) {
    return {
      id: getField_(a, 'logId'), userId: getField_(a, 'userId') || '',
      action: getField_(a, 'action') || '', entity: getField_(a, 'entity') || '',
      entityId: getField_(a, 'entityId') || '',
      createdAt: getField_(a, 'createdAt') ? fmtDate_(getField_(a, 'createdAt')) || getField_(a, 'createdAt') : '',
      detail: getField_(a, 'detail') || ''
    };
  }).reverse();
}

function mapPlugins_() {
  return readTable_('Plugins').map(function (r) {
    return {
      id: getField_(r, 'cardId'), title: getField_(r, 'title'), icon: getField_(r, 'icon'),
      tier: Number(getField_(r, 'tier')), url: getField_(r, 'url'),
      embed: parseBool_(getField_(r, 'embed')), minRole: getField_(r, 'minRole'),
      enabled: parseBool_(getField_(r, 'enabled')), order: Number(getField_(r, 'order')) || 0
    };
  }).filter(function (p) {
    // 點名已內建，不再當成插件卡片回傳。
    return p.id !== 'troop_attendance';
  });
}

function mapPluginSettings_() {
  return readTable_('PluginSettings').map(function (r) {
    return {
      pluginId: getField_(r, 'pluginId'), frontendUrl: getField_(r, 'frontendUrl'),
      backendUrl: getField_(r, 'backendUrl'), apiKey: getField_(r, 'apiKey')
    };
  });
}

function mapEquipment_() {
  return readTable_('Equipment').map(function (r) {
    var total = Number(getField_(r, 'totalQty')) || 0;
    var avail = Number(getField_(r, 'availableQty'));
    if (isNaN(avail)) avail = total;
    return {
      id: getField_(r, 'equipmentId'), name: getField_(r, 'name'),
      category: getField_(r, 'category') || '其他', unit: getField_(r, 'unit') || '件',
      totalQty: total, availableQty: avail,
      location: getField_(r, 'location'), note: getField_(r, 'note'),
      enabled: parseBool_(getField_(r, 'enabled')),
      updatedAt: getField_(r, 'updatedAt')
    };
  }).filter(function (e) { return !!e.id; });
}

function mapEquipmentLoans_() {
  return readTable_('EquipmentLoans').map(function (r) {
    return {
      id: getField_(r, 'loanId'), batchRef: getField_(r, 'batchRef'),
      equipmentId: getField_(r, 'equipmentId'), equipmentName: getField_(r, 'equipmentName'),
      unit: getField_(r, 'unit') || '件', qty: Number(getField_(r, 'qty')) || 0,
      memberId: getField_(r, 'memberId'), memberName: getField_(r, 'memberName'),
      branchId: getField_(r, 'branchId'), purpose: getField_(r, 'purpose'),
      borrowDate: getField_(r, 'borrowDate'), returnDueDate: getField_(r, 'returnDueDate'),
      status: String(getField_(r, 'status') || 'pending').toLowerCase(),
      requestedAt: getField_(r, 'requestedAt'), decidedBy: getField_(r, 'decidedBy'),
      decidedAt: getField_(r, 'decidedAt'), decisionNote: getField_(r, 'decisionNote'),
      returnedAt: getField_(r, 'returnedAt'), returnedBy: getField_(r, 'returnedBy'),
      note: getField_(r, 'note')
    };
  }).filter(function (l) { return !!l.id; });
}

function mapConfig_() {
  var cfg = {};
  readTable_('SystemConfig').forEach(function (r) { var k = getField_(r, 'key'); if (k) cfg[k] = getField_(r, 'value'); });
  return cfg;
}

/**
 * 敏感設定绝不回傳前端（含未登入的公開視圖）。
 * 管理員如需查看 / 修改，直接看 Sheet 的 SystemConfig 表。
 */
var SENSITIVE_CONFIG_KEYS_ = ['STAFF_TOKEN', 'API_KEY_HASH', 'API_KEY', 'SUPER_ADMIN_USER', 'SUPER_ADMIN_HASH', 'INITIAL_ADMIN_USER', 'INITIAL_ADMIN_PW'];

function publicConfig_(cfg) {
  var out = {};
  Object.keys(cfg || {}).forEach(function (k) {
    if (SENSITIVE_CONFIG_KEYS_.indexOf(k) >= 0) return;
    // 未來新增的敏感欄位（token / hash / 密碼 / 密鑰）一併擋下
    if (/(TOKEN|_HASH$|_PW$|PASSWORD|SECRET|API_KEY)/i.test(k)) return;
    out[k] = cfg[k];
  });
  return out;
}

// ==================== ★ 角色過濾 Dashboard（取代 getState） ====================

/**
 * getDashboard(userId) — 按角色過濾回傳 AppState
 *
 * admin/super_admin：全部
 * group_leader / branch_leader：所屬支部
 * coach：所屬支部（無申請、無使用者管理）
 * parent：只看到自己 + 子女 + 子女相關活動
 * member：只看到自己 + 自己支部活動
 * 未登入：只回 config + branches
 */
function buildDashboard(userId) { return buildDashboardCore_(userId, true); }

function buildDashboardCore_(userId, loadPdfs) {
  // 技術測試帳號
  var techAccounts = TECH_TEST_ACCOUNTS_;
  var isTechTest = techAccounts.indexOf(userId) >= 0;

  // 找使用者（先 Users，找不到再查 Members —— 成員可能只有 Members 沒有 Users）
  var allUsers = mapUsers_();
  var user = null;
  if (isTechTest) {
    user = { id: userId, name: userId + '（技術測試）', role: 'super_admin', branchId: '', memberId: '', approved: true, techTest: true };
  } else if (userId === 'SUPER_ADMIN') {
    // 隱藏超管（sheep）登入後回傳的 userId，不在 Users 表，固定最高權限
    user = { id: userId, name: '超級管理員', role: 'super_admin', branchId: '', memberId: '', approved: true, techTest: true };
  } else if (userId === 'staff_token') {
    // STAFF_TOKEN 登入，不在 Users 表
    user = { id: userId, name: 'STAFF_TOKEN 管理員', role: 'admin', branchId: '', memberId: '', approved: true };
  } else {
    user = allUsers.filter(function (u) { return u.id === userId; })[0] || null;
  }

  // ★ 如果 Users 表找不到，檢查是否是 Members 表的成員（直接後台建立的成員沒有 Users 記錄）
  if (!user && !isTechTest) {
    var allMembersForCheck = mapMembers_();
    var memberUser = allMembersForCheck.filter(function (m) { return m.id === userId; })[0];
    if (memberUser) {
      user = {
        id: memberUser.id, name: memberUser.name, role: 'member',
        branchId: memberUser.branchId || '', memberId: memberUser.id,
        childMemberIds: [], approved: true, techTest: false
      };
    }
  }

  var role = user ? user.role : '';
  var branchId = user ? (user.branchId || '') : '';

  // 全部載入（GS 端，不出網）
  var allPatrols = mapPatrols_();
  var allMembers = mapMembers_();
  var allEvents = mapEvents_();
  var allReplies = mapReplies_();
  var allBookmarks = mapBookmarks_();
  var allRegularMeetings = mapRegularMeetings_();
  var allCancelledMeetings = mapCancelledMeetings_();
  var allMeetings = mapMeetings_();
  var allPlugins = mapPlugins_();
  var allPluginSettings = mapPluginSettings_();
  var allApplications = mapApplications_();
  var allEquipment = mapEquipment_();
  var allEquipmentLoans = mapEquipmentLoans_();
  var allAudits = mapAudits_();
  var allLatestNews = mapLatestNews_();
  var config = mapConfig_();

  var state = {
    patrols: [], users: [], members: [], applications: [],
    events: [], replies: [], bookmarks: [],
    announcements: [], announcementPdfs: [],
    regularMeetings: [], cancelledMeetings: [],
    meetings: [],
    plugins: [],
    pluginSettings: [],
    audits: [], config: publicConfig_(config),
    equipment: [], equipmentLoans: [], latestNews: [],
    userFeatures: []  // 當前用戶的功能權限
  };
  // Fill userFeatures for current user
  try { state.userFeatures = getUserFeatures_(userId, role); } catch(e) {}

  // Load announcement PDFs and filter by user role
  // 切片模式（loadPdfs=false）跳過 Drive 呼叫，加快回應
  if (loadPdfs) try {
    var pdfResult = apiListAnnouncementPdfs();
    if (pdfResult.success) {
      var allPdfs = pdfResult.files || [];
      // Filter by user's branches and audience
      if (role === 'admin' || role === 'super_admin' || role === 'troop_super' || role === 'troop_leader') {
        state.announcementPdfs = allPdfs;
      } else if (role === 'member') {
        var myBranchShort = '';
        var myMember = allMembers.filter(function(m){return m.id === userId || m.id === (user.memberId||'');})[0];
        if (myMember) {
          // Find branch short name
          var branchRow = readTable_('Branches').filter(function(b){return getField_(b,'branchId')===myMember.branchId;})[0];
          myBranchShort = branchRow ? getField_(branchRow,'name') : myMember.branchId;
        }
        state.announcementPdfs = allPdfs.filter(function(pdf) {
          if (!pdf.visible) return false;
          if (!pdf.branchTags || pdf.branchTags.indexOf('全旅') >= 0) return true;
          return pdf.branchTags.indexOf(myBranchShort) >= 0 || pdf.branchTags.indexOf(myMember ? myMember.branchId : '') >= 0;
        });
      } else if (role === 'parent') {
        // Show PDFs for any branch the children belong to
        // （此處 children 尚未定義，需另行計算 — 修復原來的 ReferenceError）
        var pdfParentUser = allUsers.filter(function (u) { return u.id === userId; })[0];
        var pdfChildIds = (pdfParentUser ? pdfParentUser.childMemberIds : []) || [];
        var pdfChildren = allMembers.filter(function (m) {
          return pdfChildIds.indexOf(m.id) >= 0 || m.parentUserId === userId;
        });
        var childBranchShorts = pdfChildren.map(function(m) {
          var br = readTable_('Branches').filter(function(b){return getField_(b,'branchId')===m.branchId;})[0];
          return br ? getField_(br,'name') : m.branchId;
        });
        state.announcementPdfs = allPdfs.filter(function(pdf) {
          if (!pdf.visible) return false;
          if (!pdf.branchTags || pdf.branchTags.indexOf('全旅') >= 0) return true;
          return childBranchShorts.some(function(bs){return pdf.branchTags.indexOf(bs) >= 0;});
        });
      } else if (role === 'group_leader' || role === 'branch_leader' || role === 'coach') {
        var leaderBranchRow = readTable_('Branches').filter(function(b){return getField_(b,'branchId')===branchId;})[0];
        var leaderBranchName = leaderBranchRow ? getField_(leaderBranchRow,'name') : branchId;
        state.announcementPdfs = allPdfs.filter(function(pdf) {
          if (!pdf.visible) return false;
          if (!pdf.branchTags || pdf.branchTags.indexOf('全旅') >= 0) return true;
          return pdf.branchTags.indexOf(leaderBranchName) >= 0 || pdf.branchTags.indexOf(branchId) >= 0;
        });
      } else {
        state.announcementPdfs = allPdfs.filter(function(pdf){return pdf.visible;});
      }
    }
  } catch (e) {}

  // 未登入或無效使用者：只回 config
  if (!user) {
    return state;
  }

  // 最新消息：登入後所有人都見到（最多 3 條）
  state.latestNews = allLatestNews.slice(0, 3);

  // 當前使用者永遠包含
  state.users = [user];

  if (role === 'admin' || role === 'super_admin' || role === 'troop_super') {
    // 管理員：全部
    state.patrols = allPatrols;
    state.users = allUsers;
    state.members = allMembers;
    state.applications = allApplications;
    state.events = allEvents;
    state.replies = allReplies;
    state.bookmarks = allBookmarks;
    state.regularMeetings = allRegularMeetings;
    state.cancelledMeetings = allCancelledMeetings;
    state.meetings = allMeetings;
    state.plugins = allPlugins;
    state.pluginSettings = allPluginSettings;
    state.audits = allAudits;

  } else if (role === 'group_leader' || role === 'branch_leader' || role === 'coach') {
    // 領袖：自己支部 ＋ 獲其他支部團長授權嘅支部（教練員冇固定支部，全靠授權）
    var scopeBranches = visibleBranchesFor_(userId, role, branchId);
    var inScope_ = function (b) { return !b || scopeBranches.indexOf(b) >= 0; };
    state.patrols = allPatrols.filter(function (p) { return inScope_(p.branchId); });
    state.members = allMembers.filter(function (m) { return inScope_(m.branchId); });
    state.users = allUsers.filter(function (u) {
      return inScope_(u.branchId) || u.role === 'parent' || u.id === userId;
    });
    state.applications = allApplications.filter(function (a) { return inScope_(a.branchId); });
    state.events = allEvents.filter(function (e) { return e.scope === 'troop' || inScope_(e.branchId); });
    var leaderEventIds = state.events.map(function (e) { return e.id; });
    state.replies = allReplies.filter(function (r) { return leaderEventIds.indexOf(r.eventId) >= 0; });
    state.bookmarks = allBookmarks;
    state.regularMeetings = allRegularMeetings.filter(function (r) { return r.branchId === branchId; });
    state.cancelledMeetings = allCancelledMeetings.filter(function (c) { return c.branchId === branchId; });
    state.meetings = allMeetings.filter(function (m) {
      if (m.branchId && m.branchId !== branchId) return false;
      if (m.status !== 'published') return false;
      // Filter by targetRoles
      return true; // Simplified for now
    });
    state.audits = allAudits.filter(function (a) { return a.userId === userId; });
    state.plugins = allPlugins.filter(function (p) { return p.enabled; });
    state.pluginSettings = allPluginSettings; // Leaders usually need these for Tier 3 cards

  } else if (role === 'coach') {
    // 教練員：所屬支部，無申請管理
    state.patrols = allPatrols.filter(function (p) { return p.branchId === branchId; });
    state.members = allMembers.filter(function (m) { return m.branchId === branchId; });
    state.events = allEvents.filter(function (e) { return e.scope === 'troop' || e.branchId === branchId; });
    var coachEventIds = state.events.map(function (e) { return e.id; });
    state.replies = allReplies.filter(function (r) { return coachEventIds.indexOf(r.eventId) >= 0; });
    state.bookmarks = allBookmarks;
    state.regularMeetings = allRegularMeetings.filter(function (r) { return r.branchId === branchId; });
    state.cancelledMeetings = allCancelledMeetings.filter(function (c) { return c.branchId === branchId; });

  } else if (role === 'parent') {
    // 家長：只看自己 + 子女（含完整活動列表，1.0 邏輯）
    var fullParentUser = allUsers.filter(function (u) { return u.id === userId; })[0];
    if (fullParentUser) { state.users = [fullParentUser]; user = fullParentUser; }
    var childIds = (fullParentUser ? fullParentUser.childMemberIds : []) || [];
    var children = allMembers.filter(function (m) {
      return childIds.indexOf(m.id) >= 0 || m.parentUserId === userId;
    });
    // Also return emergency contact from parent user for each child
    children = children.map(function(m) {
      return {
        id: m.id, ymNumber: m.ymNumber, name: m.name, branchId: m.branchId,
        patrolId: m.patrolId, patrolRole: m.patrolRole, age: m.age,
        dateOfBirth: m.dateOfBirth,
        parentUserId: m.parentUserId,
        emergencyContactName: fullParentUser ? fullParentUser.name : '',
        emergencyContactPhone: '',
        active: m.active
      };
    });
    state.members = children;
    var childBranchIds = children.map(function (m) { return m.branchId; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    state.events = allEvents.filter(function (e) {
      if (e.status !== 'published') return false;
      if (e.scope === 'troop') return true;
      return childBranchIds.indexOf(e.branchId) >= 0;
    });
    var parentMemberIds = children.map(function (m) { return m.id; });
    state.replies = allReplies.filter(function (r) { return parentMemberIds.indexOf(r.memberId) >= 0; });
    state.bookmarks = allBookmarks.filter(function (b) { return b.status === 'published'; });
    state.regularMeetings = allRegularMeetings.filter(function (r) { return childBranchIds.indexOf(r.branchId) >= 0; });
    state.cancelledMeetings = allCancelledMeetings.filter(function (c) { return childBranchIds.indexOf(c.branchId) >= 0; });

  } else if (role === 'member') {
    // 成員：只看自己（含 emergencyContact，1.0 邏輯）
    var member = allMembers.filter(function (m) { return m.id === user.memberId || m.id === userId; })[0];
    // ★ 緊急聯絡資料：一旦連結咗家長帳戶，緊急聯絡人就直接係嗰位家長
    //   （唔使領袖再手動抄一次，家長改咗資料成員嗰邊即刻跟住變）。
    //   除咗抄個名，亦要把家長帳戶本身回傳畀前端，前端先顯示到家長 email。
    var linkedParent = null;
    if (member && member.parentUserId) {
      var parentUser = allUsers.filter(function(u){return u.id===member.parentUserId;})[0];
      if (parentUser) {
        linkedParent = parentUser;
        member.emergencyContactName = parentUser.name || member.emergencyContactName || '';
      }
    } else if (member && !member.parentUserId) {
      // Auto-link: try to find parent by ymNumber (1.0 logic)
      var memberYm = member.ymNumber;
      var parents = allUsers.filter(function(u){return u.role==='parent';});
      for (var pi = 0; pi < parents.length; pi++) {
        var childYms = parseArray_(parents[pi].childMemberIds || parents[pi].ymNumbers || '');
        if (childYms.indexOf(memberYm) >= 0) {
          member.parentUserId = parents[pi].id;
          member.emergencyContactName = parents[pi].name || '';
          linkedParent = parents[pi];
          break;
        }
      }
    }
    if (linkedParent) {
      state.users = [user, { id: linkedParent.id, name: linkedParent.name, email: linkedParent.email,
        role: 'parent', branchId: linkedParent.branchId || '', childMemberIds: linkedParent.childMemberIds || [],
        approved: linkedParent.approved }];
    }
    if (member) {
      var isSemiLeader = (member.specialRole && member.specialRole !== '') || (state.userFeatures && state.userFeatures.length > 0);
      if (isSemiLeader) {
        state.members = allMembers.filter(function (m) { return m.branchId === member.branchId; });
        state.applications = allApplications.filter(function (a) { return a.branchId === member.branchId; });
        state.events = allEvents.filter(function (e) { return e.scope === 'troop' || e.branchId === member.branchId; });
        var semiEventIds = state.events.map(function (e) { return e.id; });
        state.replies = allReplies.filter(function (r) { return semiEventIds.indexOf(r.eventId) >= 0 || r.memberId === member.id; });
        state.regularMeetings = allRegularMeetings.filter(function (r) { return r.branchId === member.branchId; });
        state.cancelledMeetings = allCancelledMeetings.filter(function (c) { return c.branchId === member.branchId; });
        state.meetings = allMeetings.filter(function (m) { return !m.branchId || m.branchId === member.branchId; });
        state.patrols = allPatrols.filter(function (p) { return p.branchId === member.branchId; });
      } else {
        state.members = [member];
        state.events = allEvents.filter(function (e) {
          if (e.status !== 'published') return false;
          if (e.scope === 'troop' || e.branchId === member.branchId) return true;
          return false;
        });
        state.replies = allReplies.filter(function (r) { return r.memberId === member.id; });
        state.regularMeetings = allRegularMeetings.filter(function (r) { return r.branchId === member.branchId; });
        state.cancelledMeetings = allCancelledMeetings.filter(function (c) { return c.branchId === member.branchId; });
        state.patrols = allPatrols.filter(function (p) { return p.branchId === member.branchId; });
      }
    }
  }

  // ── 物資清單與借用紀錄（依角色）──
  // 管理員：全部；領袖：全部物資 + 自己支部／自己的紀錄；成員：可借物資 + 自己的紀錄
  var isEquipManager = (role === 'admin' || role === 'super_admin' || role === 'troop_super');
  state.equipment = isEquipManager ? allEquipment : allEquipment.filter(function (e) { return e.enabled; });

  try {
    if (isEquipManager) {
      state.equipmentLoans = allEquipmentLoans;
    } else if (role === 'group_leader' || role === 'branch_leader' || role === 'coach') {
      state.equipmentLoans = allEquipmentLoans.filter(function (l) {
        return !l.branchId || l.branchId === branchId || l.memberId === userId;
      });
    } else if (role === 'member') {
      state.equipmentLoans = allEquipmentLoans.filter(function (l) {
        return l.memberId === userId || (user && user.memberId && l.memberId === user.memberId);
      });
    } else if (role === 'parent') {
      var loanChildIds = (typeof parentMemberIds !== 'undefined' && parentMemberIds) ? parentMemberIds : [];
      state.equipmentLoans = allEquipmentLoans.filter(function (l) { return loanChildIds.indexOf(l.memberId) >= 0; });
    } else {
      state.equipmentLoans = [];
    }
  } catch (e) {
    state.equipmentLoans = [];
  }

  return state;
}

// ==================== 按需載入：資料切片（3.0 API 拆分） ====================

/**
 * buildStateSlice_(userId, keys) — 只回傳指定欄位的 AppState 切片
 *
 * - keys：逗號分隔的欄位名，例如 'members,patrols' 或
 *         'regularMeetings,cancelledMeetings,events,meetings'
 * - 角色過濾邏輯與 buildDashboard 完全相同（走同一份 buildDashboardCore_）
 * - 未請求的欄位回傳空值（空陣列 / 空物件），前端不會因缺欄位而崩潰
 * - config 與 userFeatures 永遠附上（每個頁面都要）
 * - keys 不含 announcementPdfs 時跳過 Drive 呼叫（大幅加快回應）
 *
 * 前端經 /api/proxy 呼叫對應 action：
 *   getBootstrap / getCalendar / getActivities / getMembers /
 *   getEvents / getNotices / getUsers / getSettings /
 *   getAuditLogs / getMeetings / getState?keys=...
 */
function buildStateSlice_(userId, keys) {
  var keyList = String(keys || 'users,config')
    .split(',')
    .map(function (k) { return String(k).trim(); })
    .filter(Boolean);
  var needPdfs = keyList.indexOf('announcementPdfs') >= 0;
  var full = buildDashboardCore_(userId, needPdfs);

  var out = {
    patrols: [], users: [], members: [], applications: [],
    events: [], replies: [], bookmarks: [],
    announcements: [], announcementPdfs: [],
    regularMeetings: [], cancelledMeetings: [],
    meetings: [],
    plugins: [],
    pluginSettings: [],
    audits: [],
    equipment: [], equipmentLoans: [], latestNews: [],
    config: full.config || {},
    userFeatures: full.userFeatures || []
  };
  keyList.forEach(function (k) {
    if (full.hasOwnProperty(k)) out[k] = full[k];
  });
  return out;
}



// ==================== 用戶功能權限 ====================

var FEATURE_DEFAULTS = {
  // admin 以上預設全部有
  'admin': ['branches','members','applications','events','registrations','attendance','meetings','library_import','notices','users','permissions','settings','plugins','audit','calendar','equipment'],
  'troop_super': ['branches','members','applications','events','registrations','attendance','meetings','library_import','notices','users','permissions','settings','plugins','audit','calendar','equipment'],
  'super_admin': ['branches','members','applications','events','registrations','attendance','meetings','library_import','notices','users','permissions','settings','plugins','audit','calendar','equipment'],
  // 旅長：實際職級最高，權限同管理員（管理員 = 代旅長操作嘅旅內電腦人）
  'troop_leader': ['branches','members','applications','events','registrations','attendance','meetings','library_import','notices','users','permissions','settings','plugins','audit','calendar','equipment'],
  // 團長：自己支部全部（包括支部管理 branches 及使用者管理 users —— 但只限自己支部內的事，
  // 可見範圍由 buildDashboardCore_ 按 branchId 過濾）
  'group_leader': ['branches','members','applications','events','registrations','attendance','meetings','library_import','notices','users','calendar','equipment','permissions'],
  // 支部領袖：自己支部
  'branch_leader': ['members','applications','events','registrations','attendance','meetings','library_import','notices','calendar','equipment'],
  // 教練員：冇固定支部，預設權限＝家長（即冇任何管理功能）。
  // 要幫邊個支部做邊樣嘢，就由嗰個支部嘅團長逐項授權（UserPermissions 有 branchId 欄）。
  'coach': [],
  // 家長和成員不需要管理卡片
  'parent': [],
  'member': []
};

/**
 * 攞用戶功能清單。
 * @param branchScope 可選：只計適用於呢個支部嘅授權。
 *        UserPermissions 有 branchId 欄（空 或 '*' = 全旅通用）。
 *        唔傳 = 唔理支部（攤平，淨係用嚟決定卡片顯示）。
 */
function getUserFeatures_(userId, role, branchScope) {
  var defaults = FEATURE_DEFAULTS[role] || [];
  var overrides = {};
  readTable_('UserPermissions').filter(function(p) {
    return getField_(p, 'userId') === userId;
  }).forEach(function(p) {
    var feature = getField_(p, 'feature');
    var granted = String(getField_(p, 'granted') || '').toLowerCase() === 'true';
    var gBranch = String(getField_(p, 'branchId') || '');
    // 有指定支部範圍時，唔夾嘅授權當唔存在
    if (branchScope && gBranch && gBranch !== '*' && gBranch !== branchScope) return;
    overrides[feature] = granted;
  });
  // Merge: start with defaults, apply overrides
  var result = [];
  var seen = {};
  // First add defaults that aren't overridden
  defaults.forEach(function(f) {
    if (overrides[f] !== false) { // not explicitly revoked
      result.push(f);
      seen[f] = true;
    }
  });
  // Then add explicitly granted features not in defaults
  Object.keys(overrides).forEach(function(f) {
    if (overrides[f] && !seen[f]) {
      result.push(f);
    }
  });
  return result;
}

/** 系統內建的高權限操作者（不在 Users 表，跳過角色校驗） */


/**
 * 某人睇得到邊幾個支部嘅資料 = 自己支部 ＋ 獲授權嘅支部。
 * 可見範圍必須同寫入權限一致，否則會出現「改唔到但睇得曬」嘅漏洞
 * （例如團長睇到別團所有成員同家長電話）。
 */
function visibleBranchesFor_(userId, role, ownBranchId) {
  var out = [];
  if (role !== 'coach' && ownBranchId) out.push(ownBranchId);
  readTable_('UserPermissions').forEach(function (p) {
    if (getField_(p, 'userId') !== userId) return;
    if (String(getField_(p, 'granted') || '').toLowerCase() !== 'true') return;
    var b = String(getField_(p, 'branchId') || '');
    if (b === '*') {
      readTable_('Branches').forEach(function (br) {
        var id = getField_(br, 'branchId');
        if (out.indexOf(id) < 0) out.push(id);
      });
    } else if (b && out.indexOf(b) < 0) {
      out.push(b);
    }
  });
  return out;
}


/**
 * 相簿預設關閉（相片涉及小朋友私隱）→ 冇 photos 權限就唔准寫 albumUrl。
 * 前端已鎖住個欄位，但 request 可以繞過 UI，所以後台再驗一次。
 */
function albumAllowed_(operatedBy, url) {
  if (!url) return '';
  var users = readTable_('Users');
  var actor = users.filter(function (u) { return getField_(u, 'userId') === operatedBy; })[0];
  if (!actor) return '';
  var role = String(getField_(actor, 'role') || '').toLowerCase();
  if (getUserFeatures_(operatedBy, role).indexOf('photos') < 0) return '';
  return url;
}

var TROOP_WIDE_ROLES_ = ['super_admin', 'troop_super', 'troop_leader', 'admin'];

/** 旅團自選功能：預設關閉，團長可為自己支部開通（唔屬階級權限） */
var OPT_IN_FEATURES_ = ['photos'];

/**
 * 某人喺某支部有冇某項功能。
 * 旅長／管理員／超管 = 全旅通行；
 * 團長／支部領袖 = 只限自己支部（除非另有 scoped 授權）；
 * 教練員 = 冇固定支部，全部靠 scoped 授權。
 */
function hasFeatureInBranch_(userRow, feature, branchId) {
  var role = String(getField_(userRow, 'role') || '').toLowerCase();
  if (TROOP_WIDE_ROLES_.indexOf(role) >= 0) return true;
  var userId = getField_(userRow, 'userId');
  var own = String(getField_(userRow, 'branchId') || '');
  // 教練員冇固定支部 → 唔會自動擁有任何支部嘅預設權限
  if (role !== 'coach' && own && branchId === own) {
    if ((FEATURE_DEFAULTS[role] || []).indexOf(feature) >= 0) return true;
  }
  return getUserFeatures_(userId, role, branchId).indexOf(feature) >= 0;
}

/** 由 request 參數推斷目標支部 */
function resolveTargetBranch_(p) {
  if (p.branchId) return String(p.branchId);
  var i;
  if (p.memberId) {
    var ms = readTable_('Members');
    for (i = 0; i < ms.length; i++) if (getField_(ms[i], 'memberId') === p.memberId) return String(getField_(ms[i], 'branchId') || '');
  }
  if (p.userId) {
    var us = readTable_('Users');
    for (i = 0; i < us.length; i++) if (getField_(us[i], 'userId') === p.userId) return String(getField_(us[i], 'branchId') || '');
  }
  if (p.eventId) {
    var es = readTable_('Events');
    for (i = 0; i < es.length; i++) if (getField_(es[i], 'eventId') === p.eventId) return String(getField_(es[i], 'branchId') || '');
  }
  return '';
}

function isPrivilegedOperator_(id) {
  if (!id) return false;
  if (id === 'system' || id === 'staff_token' || id === 'SUPER_ADMIN') return true;
  return TECH_TEST_ACCOUNTS_.indexOf(id) >= 0;
}

function handleGrantFeature_(p) {
  var operatedBy = p.operatedBy || 'system';
  var targetUserId = p.targetUserId;
  var feature = p.feature;
  
  // 授權範圍：邊個支部。空 = 授權人自己嘅支部。
  var grantBranch = String(p.branchId || '');

  if (!isPrivilegedOperator_(operatedBy)) {
    var users = mapUsers_();
    var operator = users.filter(function(u){return u.id === operatedBy;})[0];
    var opRole = operator ? operator.role : '';
    if (TROOP_WIDE_ROLES_.indexOf(opRole) < 0) {
      var opBranch = operator ? String(operator.branchId || '') : '';
      if (!grantBranch) grantBranch = opBranch;
      // ★ 團長只可以授權自己支部 —— 唔可以幫第二個團開權限。
      //   （童軍團團長邀請人幫手，只可以邀請入童軍團。）
      if (grantBranch !== opBranch) {
        return { success: false, error: '你只可以授權自己支部的權限，其他支部須由該支部團長授權。' };
      }
      // 亦唔可以授出自己都冇嘅功能。
      // 例外：OPT_IN_FEATURES_ 屬「旅團自選功能」，團長可以為自己支部開通。
      var opFeatures = getUserFeatures_(operatedBy, opRole, opBranch);
      if (OPT_IN_FEATURES_.indexOf(feature) < 0 && opFeatures.indexOf(feature) < 0) {
        return { success: false, error: '你沒有權限授權此功能給他人。' };
      }
      if (OPT_IN_FEATURES_.indexOf(feature) >= 0 &&
          ['group_leader', 'branch_leader'].indexOf(opRole) < 0) {
        return { success: false, error: '只有團長／支部領袖或管理員可以開通此功能。' };
      }
    } else if (!grantBranch) {
      grantBranch = '*'; // 全旅級角色預設授全旅
    }
  }

  appendRowByHeaders_('UserPermissions', {
    userId: targetUserId,
    feature: feature,
    branchId: grantBranch,
    granted: p.granted !== false ? 'true' : 'false',
    grantedBy: operatedBy,
    grantedAt: now_(),
    note: p.note || ''
  });
  writeAudit_(operatedBy, 'grantFeature', 'UserPermissions', targetUserId, feature + '=' + (p.granted !== false) + ' @branch=' + grantBranch);
  return { success: true };
}

function handleRevokeFeature_(p) {
  var targetUserId = p.targetUserId;
  var feature = p.feature;

  // ★ 級聯撤銷：撤銷 targetUserId 的 feature 時，連帶撤銷所有由 targetUserId 授權的人
  var toRevoke = [{ userId: targetUserId, feature: feature }];
  var revokedSet = {};

  while (toRevoke.length > 0) {
    var current = toRevoke.shift();
    var key = current.userId + '|' + current.feature;
    if (revokedSet[key]) continue;
    revokedSet[key] = true;

    // Find all permissions where grantedBy = current.userId AND feature = current.feature
    var allPerms = readTable_('UserPermissions');
    allPerms.forEach(function(perm) {
      if (getField_(perm, 'grantedBy') === current.userId && getField_(perm, 'feature') === current.feature) {
        var childUserId = getField_(perm, 'userId');
        var childKey = childUserId + '|' + current.feature;
        if (!revokedSet[childKey]) {
          toRevoke.push({ userId: childUserId, feature: current.feature });
        }
      }
    });
  }

  // Now delete all revoked permissions
  var sh = getSheet_('UserPermissions');
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var uidIdx = findColIndex_(headers, 'userId');
  var featIdx = findColIndex_(headers, 'feature');
  var grantedByIdx = findColIndex_(headers, 'grantedBy');

  for (var i = data.length - 1; i >= 1; i--) {
    var rowKey = String(data[i][uidIdx]) + '|' + String(data[i][featIdx]);
    if (revokedSet[rowKey]) {
      sh.deleteRow(i + 1);
    }
  }

  writeAudit_(p.operatedBy || 'system', 'revokeFeature', 'UserPermissions', targetUserId, feature + ' (cascade: ' + Object.keys(revokedSet).length + ' users)');
  return { success: true, cascadeCount: Object.keys(revokedSet).length };
}

// Get all features for a user with grant status (for UI)
function handleGetUserFeatures_(p) {
  var userId = p.targetUserId || '';
  var users = readTable_('Users');
  var user = users.filter(function(u){return getField_(u,'userId')===userId;})[0];
  var role = '';
  if (!user) {
    var members = readTable_('Members');
    var member = members.filter(function(m){return getField_(m,'memberId')===userId;})[0];
    if (!member) return { success: false, error: '找不到用戶' };
    role = 'member';
  } else {
    role = String(getField_(user, 'role')).toLowerCase();
  }
  var defaults = FEATURE_DEFAULTS[role] || [];
  
  var overrides = {};
  readTable_('UserPermissions').filter(function(pm) {
    return getField_(pm, 'userId') === userId;
  }).forEach(function(pm) {
    overrides[getField_(pm, 'feature')] = String(getField_(pm, 'granted') || '').toLowerCase() === 'true';
  });
  
  // 必須涵蓋前端「授權」畫面所有選項，否則管理員 tick 咗都唔會生效
  var allFeatures = ['branches','members','applications','events','registrations','attendance','attendance_all','library_import','notices','users','permissions','settings','audit','calendar','equipment','meetings','plugins','photos'];
  var result = allFeatures.map(function(f) {
    var isDefault = defaults.indexOf(f) >= 0;
    var overridden = overrides[f] !== undefined;
    var enabled = overridden ? overrides[f] : isDefault;
    return { feature: f, enabled: enabled, isDefault: isDefault, overridden: overridden };
  });
  
  return { success: true, features: result, role: role };
}


// ==================== 動作層角色驗證（後端最後防線） ====================
//
// API Key 只證明「請求經過官方 proxy」，唔證明「呢個人有權做呢件事」。
// operatedBy 由前端傳上嚟，已登入嘅低權限用戶（例如成員／家長）可以自己
// 砌一個 request 扮管理員。所以高風險 action 要喺後端再檢查一次角色。
//
// 效能：getUserFeatures_ / readTable_('Users') 本來每個請求都會行（buildDashboard 一定讀 Users），
// 呢度只係喺已讀嘅資料上做一次比對，唔會多一次 I/O。
var ACTION_REQUIRED_FEATURE_ = {
  // 使用者 / 權限（最高危：可提權）
  createUser: 'users', deleteUser: 'users', toggleUser: 'users',
  updateUserRole: 'users', updateUserField: 'users',
  batchCreateUsers: 'users', batchCreateMembers: 'members',
  // 授權：團長喺自己支部就可以授權（唔需要 users＝帳號管理權）
  grantFeature: 'permissions', revokeFeature: 'permissions', updateUserPermissions: 'permissions',
  // 成員資料
  createMember: 'members', updateMember: 'members', deleteMember: 'members', linkParent: 'members',
  // 審批
  decideApplication: 'applications',
  // 支部 / 小隊
  createPatrol: 'branches', togglePatrol: 'branches', deletePatrol: 'branches',
  // 活動
  createEvent: 'events', updateEvent: 'events', deleteEvent: 'events',
  publishEvent: 'events', archiveEvent: 'events', restoreEvent: 'events', reopenEvent: 'events',
  // 收款核實（只有領袖可以核實，家長唔可以自己 tick 話領袖收咗錢）
  togglePaid: 'registrations', confirmPayment: 'registrations',
  // 系統設定 / 元件
  saveConfig: 'settings', updateConfig: 'settings', updateSettings: 'settings',
  savePluginSetting: 'plugins', togglePluginStatus: 'plugins',
  // 會議 / 物資 / 行事曆
  createMeeting: 'meetings', updateMeeting: 'meetings', deleteMeeting: 'meetings', publishMeeting: 'meetings',
  createEquipment: 'equipment', updateEquipment: 'equipment', deleteEquipment: 'equipment',
  adjustEquipmentQty: 'equipment', decideEquipmentLoan: 'equipment', returnEquipmentLoan: 'equipment',
  createRegularMeeting: 'calendar', updateRegularMeeting: 'calendar',
  deleteRegularMeeting: 'calendar', toggleRegularMeeting: 'calendar', toggleMeetingCancel: 'calendar'
};

/**
 * 檢查 operatedBy 有冇權做呢個 action。
 * 回傳 null = 放行；回傳 object = 拒絕（已經係 error payload）。
 */
function checkActionPermission_(action, p) {
  var required = ACTION_REQUIRED_FEATURE_[action];
  if (!required) return null; // 唔喺清單＝讀取類或低風險，照放行

  var operatedBy = String((p && (p.operatedBy || p.userId)) || '');
  if (!operatedBy) {
    return { success: false, error: '未能識別操作者身份，請重新登入' };
  }
  // 技術測試 / 系統帳號直接放行
  if (isPrivilegedOperator_(operatedBy)) return null;

  var users = readTable_('Users');
  var actor = users.filter(function (u) { return getField_(u, 'userId') === operatedBy; })[0];
  if (!actor) {
    return { success: false, error: '找不到操作者帳號，請重新登入' };
  }
  if (!parseBool_(getField_(actor, 'approved'))) {
    return { success: false, error: '帳號已停用，無法執行此操作' };
  }
  var role = String(getField_(actor, 'role') || '').toLowerCase();

  // ★ 支部範圍檢查：唔單止「有冇呢個功能」，仲要「喺邊個支部有」。
  //   深資團團長被童軍團團長邀請去幫手點名，就淨係喺童軍團點到名，
  //   唔會連童軍團其他嘢都管得到。
  var targetBranch = resolveTargetBranch_(p) || String(getField_(actor, 'branchId') || '');
  if (!hasFeatureInBranch_(actor, required, targetBranch)) {
    var own = String(getField_(actor, 'branchId') || '');
    writeAudit_(operatedBy, 'DENIED:' + action, 'Security', '',
      'role=' + role + ' 缺少權限 ' + required + ' @branch=' + targetBranch);
    if (targetBranch && own && targetBranch !== own) {
      return { success: false, error: '權限不足：你未獲授權管理該支部的「' + required + '」，請由該支部團長授權。' };
    }
    return { success: false, error: '權限不足：此操作需要「' + required + '」權限，請聯絡管理員授權。' };
  }
  return null;
}

// ==================== doGet / API 分發 ====================

function doGet(e) {
  var p = (e && e.parameter) || {};

  // 防呆：複製 API Key 時常連帶換行 / 空白，先 trim 再比對
  if (p.apiKey !== undefined && p.apiKey !== null) p.apiKey = String(p.apiKey).trim();

  // ★★★ API Key 認證：保護所有數據 ★★★
  // 新版：比對 API_KEY_HASH（SHA-256），明文不存於 Sheet
  // 舊版兼容：如果只有 API_KEY 明文，也比對
  var requiredApiKeyHash = getConfigValue_('API_KEY_HASH');
  var requiredApiKey = getConfigValue_('API_KEY');
  if (requiredApiKeyHash) {
    if (sha256_(p.apiKey || '') !== requiredApiKeyHash) {
      return json({ success: false, error: 'Unauthorized: invalid or missing apiKey' });
    }
  } else if (requiredApiKey) {
    if ((p.apiKey || '') !== requiredApiKey) {
      return json({ success: false, error: 'Unauthorized: invalid or missing apiKey' });
    }
  }

  var action = p.action || 'health';

  // ★ 後端角色驗證：高風險 action 必須有對應權限（前端守衛可被繞過，呢度係最後防線）
  var permissionError = checkActionPermission_(action, p);
  if (permissionError) return json(permissionError);

  try {
    switch (action) {
      case 'health':
        return json({ success: true, version: SCOUTSYSTEM_VERSION, action: 'health', ready: true });

      case 'login':
        return handleLogin_(p);

      case 'getDashboard':
        return json({ success: true, state: buildDashboard(p.userId || '') });

      // ---- 按需載入：per-page slices（3.0 API 拆分） ----
      // 每個頁面只取自己需要的資料切片，不再一次下載整個 dashboard。
      // 回傳格式與 getDashboard 相同：{ success: true, state: {...} }（state 只含所請求的欄位）。
      case 'getBootstrap':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'users,config,userFeatures') });
      case 'getCalendar':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'regularMeetings,cancelledMeetings,events,meetings') });
      case 'getActivities':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'events,replies,users,members,bookmarks') });
      case 'getMembers':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'members,patrols,users') });
      case 'getEvents':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'events,replies,members,users') });
      case 'getNotices':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'bookmarks,announcements,announcementPdfs') });
      case 'getUsers':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'users,members') });
      case 'getSettings':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'config,plugins,pluginSettings') });
      case 'getAuditLogs':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'audits') });
      case 'getMeetings':
        return json({ success: true, state: buildStateSlice_(p.userId || '', 'meetings') });
      // 通用切片：前端傳 keys=members,patrols,... 取任意組合
      case 'getState':
        return json({ success: true, state: buildStateSlice_(p.userId || '', p.keys || 'users,config') });

      case 'getApplications':
        return json({ success: true, applications: filterApplications_(p.userId || '') });

      case 'getEventReplies':
        return json(getEventReplies(p));
      case 'getEventRegistrationSummary':
        return json(getEventRegistrationSummary(p));

      case 'getSystemStatus':
        return json(getSystemStatus());

      case 'getPublicLibraryBookmarks':
        return json(getPublicLibraryBookmarks());
      case 'getPublicCalendarItems':
        return json(getPublicCalendarItems());
      case 'getTableData':
        return json(getTableData(p));
      case 'getPublicBootstrap':
        return json(getPublicBootstrap());

      case 'listAnnouncementPdfs':
        return json(apiListAnnouncementPdfs());

      // ---- 公開寫入（不需登入） ----
      case 'applyJoin': return wrapPublic_(handleApplyJoin_(p));
      case 'importFromLibrary': return wrapPublic_(handleImportFromLibrary_(p));
      case 'forgotPassword': return wrapPublic_(handleForgotPassword_(p));

      // ---- 需登入寫入 ----
      case 'updatePassword': return wrap_(handleUpdatePassword_(p), p);
      case 'cancelReply': return wrap_(handleCancelReply_(p), p);
      case 'toggleSystemLock': return wrapPublic_(toggleSystemLock(p));
      case 'autoRepairParentLinks': return wrap_(autoRepairParentLinks_(), p);
      case 'updateBookmark': return wrap_(handleUpdateBookmark_(p), p);
      case 'deleteBookmark': return wrap_(handleDeleteBookmark_(p), p);
      case 'createMember': return wrap_(handleCreateMember_(p), p);
      case 'updateMember': return wrap_(handleUpdateMember_(p), p);
      case 'linkParent': return wrap_(handleLinkParent_(p), p);
      case 'deleteMember': return wrap_(handleDeleteMember_(p), p);
      case 'createEvent': return wrap_(handleCreateEvent_(p), p);
      case 'publishEvent': return wrap_(handlePublishEvent_(p), p);
      case 'updateEvent': return wrap_(handleUpdateEvent_(p), p);
      case 'deleteEvent': return wrap_(handleDeleteEvent_(p), p);
      case 'setReply': return wrap_(handleSetReply_(p), p);
      case 'setWantedBadges': return wrap_(handleSetWantedBadges_(p), p);
      case 'setPublicCard': return wrap_(handleSetPublicCard_(p), p);
      case 'setPublicScope': return wrap_(handleSetPublicScope_(p), p);
      case 'togglePaid': return wrap_(handleTogglePaid_(p), p);
      case 'confirmPayment': return wrap_(handleConfirmPayment_(p), p);
      case 'archiveEvent': return wrap_(handleArchiveEvent_(p), p);
      case 'restoreEvent': return wrap_(handleRestoreEvent_(p), p);
      case 'reopenEvent': return wrap_(handleReopenEvent_(p), p);
      case 'decideApplication': return wrap_(handleDecideApplication_(p), p);
      case 'toggleUser': return wrap_(handleToggleUser_(p), p);
      case 'updateUserRole': return wrap_(handleUpdateUserRole_(p), p);
      case 'updateUserField': return wrap_(handleUpdateUserField_(p), p);
      case 'deleteUser': return wrap_(handleDeleteUser_(p), p);
      case 'createUser': {
        var cu = handleCreateUser_(p);
        if (cu.success === false) return json(cu);
        return json({ success: true, state: buildDashboard(p.operatedBy || p.userId || ''), linked: cu.linked || [], created: cu.created || [] });
      }
      case 'batchCreateUsers': return wrap_(handleBatchCreateUsers_(p), p);
      case 'batchCreateMembers': return wrap_(handleBatchCreateMembers_(p), p);
      case 'createPatrol': return wrap_(handleCreatePatrol_(p), p);
      case 'togglePatrol': return wrap_(handleTogglePatrol_(p), p);
      case 'deletePatrol': return wrap_(handleDeletePatrol_(p), p);
      case 'importBookmark': return wrap_(handleImportBookmark_(p), p);
      case 'toggleRegularMeeting': return wrap_(handleToggleRegularMeeting_(p), p);
      case 'createRegularMeeting': return wrap_(handleCreateRegularMeeting_(p), p);
      case 'updateRegularMeeting': return wrap_(handleUpdateRegularMeeting_(p), p);
      case 'deleteRegularMeeting': return wrap_(handleDeleteRegularMeeting_(p), p);
      case 'toggleMeetingCancel': return wrap_(handleToggleMeetingCancel_(p), p);
      case 'updatePdfTags': return wrap_(handleUpdatePdfTags_(p), p);
      case 'grantFeature': return wrap_(handleGrantFeature_(p), p);
      case 'revokeFeature': return wrap_(handleRevokeFeature_(p), p);
      case 'getUserFeatures': return json(handleGetUserFeatures_(p));
      case 'saveConfig': return wrap_(handleSaveConfig_(p), p);
      case 'savePluginSetting': return wrap_(handleSavePluginSetting_(p), p);
      case 'togglePluginStatus': return wrap_(handleTogglePluginStatus_(p), p);
      case 'addAnnouncement': return wrap_(addAnnouncement(p), p);
      case 'getAnnouncements': return json(getAnnouncements(p));
      case 'updateAnnouncement': return wrap_(updateAnnouncement(p), p);
      case 'deleteAnnouncement': return wrap_(deleteAnnouncement(p), p);
      case 'addLatestNews': return wrap_(addLatestNews(p), p);
      case 'deleteLatestNews': return wrap_(deleteLatestNews(p), p);
      case 'addRow': return wrap_(genericAddRow(p), p);
      case 'createMeeting': return wrap_(handleCreateMeeting_(p), p);
      case 'updateMeeting': return wrap_(handleUpdateMeeting_(p), p);
      case 'deleteMeeting': return wrap_(handleDeleteMeeting_(p), p);
      case 'publishMeeting': return wrap_(handlePublishMeeting_(p), p);
      case 'updateUserPermissions': return wrap_(handleUpdateUserPermissions_(p), p);
      case 'getAttendance': return json(handleGetAttendance_(p));
      case 'saveAttendance': return json(handleSaveAttendance_(p));
      case 'getAttendanceMatrix': return json(handleGetAttendanceMatrix_(p));
      case 'getAttendanceSessions': return json(handleGetAttendanceSessions_(p));
      case 'getMemberAttendance': return json(handleGetMemberAttendance_(p));

      // ---- 物資借用 ----
      case 'getEquipment': return json({ success: true, state: buildStateSlice_(p.userId || '', 'equipment,equipmentLoans,members') });
      case 'createEquipment': return wrap_(handleCreateEquipment_(p), p);
      case 'updateEquipment': return wrap_(handleUpdateEquipment_(p), p);
      case 'adjustEquipmentQty': return wrap_(handleAdjustEquipmentQty_(p), p);
      case 'deleteEquipment': return wrap_(handleDeleteEquipment_(p), p);
      case 'requestEquipmentLoan': return wrap_(handleRequestEquipmentLoan_(p), p);
      case 'updateEquipmentLoan': return wrap_(handleUpdateEquipmentLoan_(p), p);
      case 'cancelEquipmentLoan': return wrap_(handleCancelEquipmentLoan_(p), p);
      case 'decideEquipmentLoan': return wrap_(handleDecideEquipmentLoan_(p), p);
      case 'returnEquipmentLoan': return wrap_(handleReturnEquipmentLoan_(p), p);

      default:
        return json({ success: false, error: '未知 action: ' + action });
    }
  } catch (err) {
    return json({ success: false, error: String(err) });
  }
}

/** 公開寫入：不回 dashboard */
function wrapPublic_(result) {
  return json(result);
}

/** 登入寫入：成功後回傳該使用者的 dashboard */
function wrap_(result, p) {
  if (result && result.success === false) return json(result);
  
  // Use Utilities.sleep(1000) or similar to simulate/prevent race? 
  // Better to handle on client.
  
  return json({ success: true, state: buildDashboard((p && p.operatedBy) || (p && p.userId) || '') });
}

function writeAudit_(userId, action, entity, entityId, detail) {
  appendRowByHeaders_('AuditLogs', {
    logId: uid_('log'), userId: userId || 'system', action: action,
    entity: entity, entityId: entityId || '', createdAt: now_(), detail: detail
  });
}


// ==================== 物資（Equipment）／借用（EquipmentLoans） ====================
//
// 流程：
//   1. 領袖在「物資管理」加入物資及總數（Sheet：Equipment）
//   2. 童軍支部（b3）或以上成員／領袖在前端填數量申請借用 → status = pending
//   3. 領袖批核（approved）→ 即時扣減 availableQty
//   4. 成員歸還後，領袖 Tick「已歸還」→ status = returned，availableQty 回補
//
// 借用狀態：pending 待批核 / approved 已批核（未歸還）/ rejected 已拒絕
//           returned 已歸還 / cancelled 已取消

/** 物資表不存在時自動補建（舊部署未重跑 setup 也不會炸） */
function ensureEquipmentSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var defs = getInitialSheets_();
  ['Equipment', 'EquipmentLoans'].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, defs[name][0].length).setValues([defs[name][0]]);
      sh.setFrozenRows(1);
    }
  });
}

/** 誰可以管理物資（新增／修改／調庫存／批核／歸還）：領袖或以上 */
function equipmentManager_(operatedBy) {
  if (isPrivilegedOperator_(operatedBy)) return { ok: true, role: 'super_admin', branchId: '', name: '系統管理員' };
  var u = mapUsers_().filter(function (x) { return x.id === operatedBy; })[0];
  if (!u) return { ok: false, error: '找不到使用者，請重新登入。' };
  if (['admin', 'troop_super', 'super_admin', 'group_leader', 'branch_leader'].indexOf(u.role) < 0) {
    return { ok: false, error: '只有領袖或以上可以管理物資及批核借用。' };
  }
  return { ok: true, role: u.role, branchId: u.branchId || '', name: u.name };
}

/** 誰可以借用：所有領袖角色 + 童軍支部（b3）或以上成員 */
function equipmentBorrower_(userId) {
  if (isPrivilegedOperator_(userId)) return { ok: true, role: 'super_admin', branchId: '', name: '系統管理員', memberId: '' };
  var u = mapUsers_().filter(function (x) { return x.id === userId; })[0];
  if (u) {
    if (['admin', 'troop_super', 'super_admin', 'group_leader', 'branch_leader', 'coach'].indexOf(u.role) >= 0) {
      return { ok: true, role: u.role, branchId: u.branchId || '', name: u.name, memberId: u.memberId || userId };
    }
    return { ok: false, error: '只限領袖及童軍支部或以上成員借用物資。' };
  }
  var m = mapMembers_().filter(function (x) { return x.id === userId; })[0];
  if (!m) return { ok: false, error: '找不到成員資料，請聯絡領袖。' };
  if (EQUIPMENT_BORROW_BRANCHES_.indexOf(m.branchId) < 0) {
    return { ok: false, error: '只限童軍支部或以上成員借用物資（小童軍／幼童軍請由領袖代借）。' };
  }
  return { ok: true, role: 'member', branchId: m.branchId, name: m.name, memberId: m.id };
}

function loanStatusLabel_(status) {
  var map = { pending: '待批核', approved: '已批核（未歸還）', rejected: '已拒絕', returned: '已歸還', cancelled: '已取消' };
  return map[String(status || '').toLowerCase()] || String(status || '');
}

/** 前端可能傳 JSON 字串或陣列 */
function parseLoanItems_(raw) {
  if (!raw) return [];
  var list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch (e) { return []; }
  }
  if (!list || !list.length) return [];
  return list.map(function (x) {
    return { equipmentId: String(x.equipmentId || x.id || ''), qty: Number(x.qty) || 0 };
  }).filter(function (x) { return !!x.equipmentId; });
}

// ---------- 物資清單 ----------

function handleCreateEquipment_(p) {
  var op = equipmentManager_(p.operatedBy);
  if (!op.ok) return { success: false, error: op.error };
  ensureEquipmentSheets_();
  var name = String(p.name || '').trim();
  if (!name) return { success: false, error: '請填寫物資名稱。' };
  var total = Number(p.totalQty);
  if (isNaN(total) || total < 0) total = 0;
  var id = uid_('eq');
  appendRowByHeaders_('Equipment', {
    equipmentId: id, name: name, category: String(p.category || '').trim() || '其他',
    unit: String(p.unit || '').trim() || '件',
    totalQty: total, availableQty: total,
    location: p.location || '', note: p.note || '',
    enabled: p.enabled === false ? false : true, updatedAt: now_()
  });
  writeAudit_(p.operatedBy || 'system', 'createEquipment', 'Equipment', id, name + ' 總數 ' + total);
  return { success: true, equipmentId: id };
}

function handleUpdateEquipment_(p) {
  var op = equipmentManager_(p.operatedBy);
  if (!op.ok) return { success: false, error: op.error };
  var eq = mapEquipment_().filter(function (e) { return e.id === p.equipmentId; })[0];
  if (!eq) return { success: false, error: '找不到物資' };

  var loaned = Math.max(0, eq.totalQty - eq.availableQty); // 已借出未還
  var newTotal = (p.totalQty !== undefined && String(p.totalQty) !== '') ? Number(p.totalQty) : eq.totalQty;
  if (isNaN(newTotal) || newTotal < 0) return { success: false, error: '總數必須是 0 或正整數。' };
  if (newTotal < loaned) return { success: false, error: '總數不可少於已借出未還的數量（' + loaned + ' ' + eq.unit + '）。' };

  ['name', 'category', 'unit', 'location', 'note'].forEach(function (fld) {
    if (p[fld] !== undefined) updateCellByName_('Equipment', 'equipmentId', p.equipmentId, fld, p[fld]);
  });
  if (p.totalQty !== undefined && String(p.totalQty) !== '') {
    updateCellByName_('Equipment', 'equipmentId', p.equipmentId, 'totalQty', newTotal);
    updateCellByName_('Equipment', 'equipmentId', p.equipmentId, 'availableQty', newTotal - loaned);
  }
  if (p.enabled !== undefined) {
    updateCellByName_('Equipment', 'equipmentId', p.equipmentId, 'enabled', parseBool_(p.enabled));
  }
  updateCellByName_('Equipment', 'equipmentId', p.equipmentId, 'updatedAt', now_());
  writeAudit_(p.operatedBy || 'system', 'updateEquipment', 'Equipment', p.equipmentId, eq.name);
  return { success: true };
}

/** 入庫（+delta）／報廢（-delta），自動同步可借數量 */
function handleAdjustEquipmentQty_(p) {
  var op = equipmentManager_(p.operatedBy);
  if (!op.ok) return { success: false, error: op.error };
  var eq = mapEquipment_().filter(function (e) { return e.id === p.equipmentId; })[0];
  if (!eq) return { success: false, error: '找不到物資' };
  var delta = Number(p.delta);
  if (isNaN(delta) || delta === 0) return { success: false, error: '請填寫要增減的數量。' };
  var loaned = Math.max(0, eq.totalQty - eq.availableQty);
  var newTotal = eq.totalQty + delta;
  if (newTotal < loaned) return { success: false, error: '不可減到少於已借出未還的數量（' + loaned + ' ' + eq.unit + '）。' };
  updateCellByName_('Equipment', 'equipmentId', eq.id, 'totalQty', newTotal);
  updateCellByName_('Equipment', 'equipmentId', eq.id, 'availableQty', newTotal - loaned);
  updateCellByName_('Equipment', 'equipmentId', eq.id, 'updatedAt', now_());
  writeAudit_(p.operatedBy || 'system', 'adjustEquipmentQty', 'Equipment', eq.id,
    (delta > 0 ? '入庫 +' : '報廢 ') + delta + '（' + (p.note || '') + '）');
  return { success: true };
}

function handleDeleteEquipment_(p) {
  var op = equipmentManager_(p.operatedBy);
  if (!op.ok) return { success: false, error: op.error };
  var active = mapEquipmentLoans_().filter(function (l) {
    return l.equipmentId === p.equipmentId && (l.status === 'pending' || l.status === 'approved');
  });
  if (active.length) {
    return { success: false, error: '尚有 ' + active.length + ' 筆未完成的借用紀錄，不能刪除（可改為停用）。' };
  }
  var idx = findRowIndexById_('Equipment', 'equipmentId', p.equipmentId);
  if (idx < 0) return { success: false, error: '找不到物資' };
  getSheet_('Equipment').deleteRow(idx + 1);
  writeAudit_(p.operatedBy || 'system', 'deleteEquipment', 'Equipment', p.equipmentId, '');
  return { success: true };
}

// ---------- 借用申請 ----------

function handleRequestEquipmentLoan_(p) {
  ensureEquipmentSheets_();
  var who = equipmentBorrower_(p.memberId || p.operatedBy || p.userId);
  if (!who.ok) return { success: false, error: who.error };

  var items = parseLoanItems_(p.items);
  if (!items.length) return { success: false, error: '請在物資旁填寫最少一項借用數量。' };
  var borrowDate = String(p.borrowDate || '').trim();
  var returnDueDate = String(p.returnDueDate || '').trim();
  if (!borrowDate || !returnDueDate) return { success: false, error: '請填寫借出日期及預計歸還日期。' };
  if (returnDueDate < borrowDate) return { success: false, error: '預計歸還日期不可早於借出日期。' };

  var eqs = mapEquipment_();
  var batchRef = uid_('BR');
  var created = 0;
  for (var i = 0; i < items.length; i++) {
    var eq = eqs.filter(function (e) { return e.id === items[i].equipmentId; })[0];
    if (!eq) return { success: false, error: '找不到物資（' + items[i].equipmentId + '）' };
    var qty = Math.floor(items[i].qty);
    if (!(qty > 0)) continue;
    if (!eq.enabled) return { success: false, error: '「' + eq.name + '」已停用，暫不可借用。' };
    if (qty > eq.availableQty) {
      return { success: false, error: '「' + eq.name + '」目前只餘 ' + eq.availableQty + ' ' + eq.unit + ' 可借。' };
    }
    appendRowByHeaders_('EquipmentLoans', {
      loanId: uid_('ln'), batchRef: batchRef, equipmentId: eq.id, equipmentName: eq.name,
      unit: eq.unit, qty: qty,
      memberId: who.memberId || p.memberId || '', memberName: who.name, branchId: who.branchId,
      purpose: p.purpose || '', borrowDate: borrowDate, returnDueDate: returnDueDate,
      status: 'pending', requestedAt: now_(), note: p.note || ''
    });
    created++;
  }
  if (!created) return { success: false, error: '請填寫借用數量（最少 1 件）。' };

  writeAudit_(p.operatedBy || p.memberId || 'system', 'requestEquipmentLoan', 'EquipmentLoans', batchRef,
    created + ' 項待批核 · ' + who.name);
  return { success: true, batchRef: batchRef, count: created };
}

/** 待批核時可改數量／日期／用途／取消 */
function handleUpdateEquipmentLoan_(p) {
  var loan = mapEquipmentLoans_().filter(function (l) { return l.id === p.loanId; })[0];
  if (!loan) return { success: false, error: '找不到借用紀錄' };
  if (loan.status !== 'pending') {
    return { success: false, error: '只有「待批核」的申請可以修改（現時：' + loanStatusLabel_(loan.status) + '）。' };
  }
  var requesterId = p.memberId || p.operatedBy || '';
  if (loan.memberId !== requesterId && !isPrivilegedOperator_(p.operatedBy)) {
    return { success: false, error: '只能修改自己的借用申請。' };
  }
  if (p.qty !== undefined && String(p.qty) !== '') {
    var qty = Math.floor(Number(p.qty));
    if (!(qty > 0)) return { success: false, error: '借用數量必須大於 0。' };
    var eq = mapEquipment_().filter(function (e) { return e.id === loan.equipmentId; })[0];
    if (eq && qty > eq.availableQty) {
      return { success: false, error: '「' + eq.name + '」目前只餘 ' + eq.availableQty + ' ' + (eq.unit || '') + ' 可借。' };
    }
    updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'qty', qty);
  }
  ['purpose', 'borrowDate', 'returnDueDate', 'note'].forEach(function (fld) {
    if (p[fld] !== undefined) updateCellByName_('EquipmentLoans', 'loanId', p.loanId, fld, p[fld]);
  });
  writeAudit_(p.operatedBy || 'system', 'updateEquipmentLoan', 'EquipmentLoans', p.loanId, '');
  return { success: true };
}

function handleCancelEquipmentLoan_(p) {
  var loan = mapEquipmentLoans_().filter(function (l) { return l.id === p.loanId; })[0];
  if (!loan) return { success: false, error: '找不到借用紀錄' };
  if (loan.status !== 'pending') {
    return { success: false, error: '只有「待批核」的申請可以取消（現時：' + loanStatusLabel_(loan.status) + '）。' };
  }
  var requesterId = p.memberId || p.operatedBy || '';
  if (loan.memberId !== requesterId && !isPrivilegedOperator_(p.operatedBy)) {
    return { success: false, error: '只能取消自己的借用申請。' };
  }
  updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'status', 'cancelled');
  writeAudit_(p.operatedBy || 'system', 'cancelEquipmentLoan', 'EquipmentLoans', p.loanId, '');
  return { success: true };
}

/** 領袖批核：approved 即時扣庫存；rejected 不扣 */
function handleDecideEquipmentLoan_(p) {
  var op = equipmentManager_(p.operatedBy);
  if (!op.ok) return { success: false, error: op.error };
  var loan = mapEquipmentLoans_().filter(function (l) { return l.id === p.loanId; })[0];
  if (!loan) return { success: false, error: '找不到借用紀錄' };
  if (loan.status !== 'pending') {
    return { success: false, error: '此申請已處理（' + loanStatusLabel_(loan.status) + '）。' };
  }
  var decision = String(p.decision || '').toLowerCase();
  if (decision !== 'approved' && decision !== 'rejected') return { success: false, error: '請選擇批准或拒絕。' };

  if (decision === 'approved') {
    var eq = mapEquipment_().filter(function (e) { return e.id === loan.equipmentId; })[0];
    if (!eq) return { success: false, error: '找不到物資，可能已被刪除。' };
    if (loan.qty > eq.availableQty) {
      return { success: false, error: '庫存不足：「' + eq.name + '」只餘 ' + eq.availableQty + ' ' + (eq.unit || '') + '。' };
    }
    updateCellByName_('Equipment', 'equipmentId', eq.id, 'availableQty', eq.availableQty - loan.qty);
    updateCellByName_('Equipment', 'equipmentId', eq.id, 'updatedAt', now_());
  }
  updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'status', decision);
  updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'decidedBy', op.name || p.operatedBy || '');
  updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'decidedAt', now_());
  updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'decisionNote', p.note || '');
  writeAudit_(p.operatedBy || 'system', 'decideEquipmentLoan', 'EquipmentLoans', p.loanId,
    decision + ' · ' + loan.equipmentName + ' ×' + loan.qty);
  return { success: true };
}

/** 歸還：領袖 Tick「已歸還」→ status = returned，庫存回補 */
function handleReturnEquipmentLoan_(p) {
  var op = equipmentManager_(p.operatedBy);
  if (!op.ok) return { success: false, error: op.error };
  var loan = mapEquipmentLoans_().filter(function (l) { return l.id === p.loanId; })[0];
  if (!loan) return { success: false, error: '找不到借用紀錄' };
  if (loan.status !== 'approved') {
    return { success: false, error: '只有「已批核（未歸還）」的紀錄可以標記歸還（現時：' + loanStatusLabel_(loan.status) + '）。' };
  }
  var eq = mapEquipment_().filter(function (e) { return e.id === loan.equipmentId; })[0];
  if (eq) {
    updateCellByName_('Equipment', 'equipmentId', eq.id, 'availableQty', eq.availableQty + loan.qty);
    updateCellByName_('Equipment', 'equipmentId', eq.id, 'updatedAt', now_());
  }
  updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'status', 'returned');
  updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'returnedAt', now_());
  updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'returnedBy', op.name || p.operatedBy || '');
  if (p.note) updateCellByName_('EquipmentLoans', 'loanId', p.loanId, 'note', p.note);
  writeAudit_(p.operatedBy || 'system', 'returnEquipmentLoan', 'EquipmentLoans', p.loanId,
    loan.equipmentName + ' ×' + loan.qty + ' 已歸還');
  return { success: true };
}

// ==================== 登入 ====================

function handleLogin_(p) {
  var rawIdentifier = String(p.identifier || p.email || '').trim();
  var identifier = rawIdentifier;
  var password = p.password || '';
  var loginType = p.loginType || 'account';

  // 隱藏超管（sheep）：大小寫與前後空白都容許（從 Sheet／手機複製貼上常帶空格）
  var isSuperLogin = /^sheep$/i.test(identifier);
  if (isSuperLogin) {
    identifier = 'sheep';
    password = String(password).trim();
  }

  // 系統鎖檢查（1.0 邏輯）
  var isLocked = String(getConfigValue_('system_locked') || '').toLowerCase() === 'true';
  var isBackdoor = isSuperLogin || (TECH_TEST_ACCOUNTS_.indexOf(identifier) >= 0);
  if (isLocked && !isBackdoor) {
    return json({ success: false, error: '系統目前暫停服務，請稍後再試。' });
  }

  // 隱藏超管帳戶（固定帳號密碼，不經過 Users 表）
  if (isSuperLogin && sha256_(password) === sha256_('0728')) {
    return json({ success: true, user: {
      userId: 'SUPER_ADMIN', name: '超級管理員', role: 'super_admin',
      branchId: 'all', isSuperAdmin: true,
      dashboard: '/admin'
    }});
  }

  // STAFF_TOKEN 登入
  if (loginType === 'staffToken' || (identifier === 'STAFF_TOKEN')) {
    var token = String(getConfigValue_('STAFF_TOKEN') || '').trim();
    var tokenIn = String(password || '').trim();
    if (token && tokenIn === token) {
      return json({ success: true, user: {
        userId: 'staff_token', name: 'STAFF_TOKEN 管理員', role: 'admin',
        dashboard: '/admin'
      }});
    }
    return json({ success: false, error: 'STAFF_TOKEN 不正確' });
  }

  // 技術測試帳號
  var techAccounts = TECH_TEST_ACCOUNTS_;
  if (techAccounts.indexOf(identifier) >= 0) {
    return json({ success: true, user: {
      userId: identifier, name: identifier + '（技術測試）', role: 'super_admin',
      dashboard: '/admin', techTest: true
    }});
  }

  if (loginType === 'member') {
    // 成員 YMIS 登入
    var members = readTable_('Members');
    var member = null;
    for (var i = 0; i < members.length; i++) {
      if (String(getField_(members[i], 'ymNumber')).trim() === identifier) { member = members[i]; break; }
    }
    if (!member) return json({ success: false, error: '找不到此 YMIS 編號的成員' });
    var active = getField_(member, 'active');
    if (!parseBool_(active) && active !== '') return json({ success: false, error: '此成員已停用' });
    // 檢查密碼
    var memberPw = String(getField_(member, 'password') || '').trim();
    if (memberPw && memberPw !== password) return json({ success: false, error: '密碼不正確' });
    if (!memberPw) return json({ success: false, error: '此成員尚未設定密碼，請聯絡領袖在 Members 表設定密碼。' });
    var age = calcAge_(getField_(member, 'dateOfBirth'));
    return json({ success: true, user: {
      userId: getField_(member, 'memberId'), name: getField_(member, 'name'), role: 'member',
      branchId: getField_(member, 'branchId'), memberId: getField_(member, 'memberId'), age: age,
      specialRole: getField_(member, 'specialRole') || '',
      dashboard: '/member'
    }});
  }

  // 帳號登入
  var users = readTable_('Users');
  var user = null;
  for (var j = 0; j < users.length; j++) {
    if (getField_(users[j], 'email') === identifier || getField_(users[j], 'userId') === identifier) { user = users[j]; break; }
  }
  if (!user) return json({ success: false, error: '找不到此帳號' });
  var sheetPw = String(getField_(user, 'password') || '').trim();
  if (sheetPw && sheetPw !== password) return json({ success: false, error: '密碼不正確' });
  if (!parseBool_(getField_(user, 'approved'))) return json({ success: false, error: '帳號尚未啟用' });

  var role = String(getField_(user, 'role')).toLowerCase();
  var memberId = getField_(user, 'memberId');
  var memberAge = 0;
  if (memberId) {
    var allMembers = readTable_('Members');
    var mu = allMembers.filter(function (m) { return getField_(m, 'memberId') === memberId; })[0];
    if (mu) memberAge = calcAge_(getField_(mu, 'dateOfBirth'));
  }
  var dash = role === 'parent' ? '/parent' : (role === 'member' ? '/member' :
    (role === 'admin' || role === 'super_admin' || role === 'troop_super' ? '/admin' : '/leader'));
  return json({ success: true, user: {
    userId: getField_(user, 'userId'), name: getField_(user, 'name'), role: role,
    branchId: getField_(user, 'branchId') || '', memberId: memberId || '', age: memberAge,
    dashboard: dash
  }});
}

function handleUpdatePassword_(p) {
  var userId = p.userId || p.operatedBy;
  var newPw = p.newPassword;
  if (!newPw) return { success: false, error: '請提供新密碼' };
  
  // Try Users table
  var userIdx = findRowIndexById_('Users', 'userId', userId);
  if (userIdx >= 0) {
    updateCellByName_('Users', 'userId', userId, 'password', newPw);
    writeAudit_(userId, 'updatePassword', 'Users', userId, 'updated');
    return { success: true };
  }
  
  // Try Members table
  var memberIdx = findRowIndexById_('Members', 'memberId', userId);
  if (memberIdx >= 0) {
    updateCellByName_('Members', 'memberId', userId, 'password', newPw);
    writeAudit_(userId, 'updatePassword', 'Members', userId, 'updated');
    return { success: true };
  }
  
  return { success: false, error: '找不到使用者記錄' };
}

function handleForgotPassword_(p) {
  var identifier = (p.identifier || '').trim(); // email or ymis
  var loginType = p.loginType || 'account';
  var troopName = getConfigValue_('TROOP_NAME') || '旅團管理系統';

  var user = null;
  var email = '';
  var name = '';

  if (loginType === 'member') {
    var members = readTable_('Members');
    var member = members.filter(function(m){return String(getField_(m, 'ymNumber')).trim() === identifier;})[0];
    if (!member) return { success: false, error: '找不到此 YMIS 編號的成員' };
    name = getField_(member, 'name');
    // Try to get email from Users if they have one linked
    var membersUser = readTable_('Users').filter(function(u){return getField_(u, 'memberId') === getField_(member, 'memberId');})[0];
    email = membersUser ? getField_(membersUser, 'email') : '';
    // If no direct email, try parent's email
    if (!email && getField_(member, 'parentUserId')) {
      var parent = readTable_('Users').filter(function(u){return getField_(u, 'userId') === getField_(member, 'parentUserId');})[0];
      email = parent ? getField_(parent, 'email') : '';
    }
    user = member;
  } else {
    var users = readTable_('Users');
    var dbUser = users.filter(function(u){return getField_(u, 'email') === identifier || getField_(u, 'userId') === identifier;})[0];
    if (!dbUser) return { success: false, error: '找不到此 Email/帳號' };
    email = getField_(dbUser, 'email');
    name = getField_(dbUser, 'name');
    user = dbUser;
  }

  if (!email) return { success: false, error: '此帳號未設定 Email，請聯絡領袖手動重設密碼。' };

  var newPw = Math.random().toString(36).slice(-8);
  var userId = getField_(user, 'userId') || getField_(user, 'memberId');
  
  if (loginType === 'member') {
    updateCellByName_('Members', 'memberId', userId, 'password', newPw);
  } else {
    updateCellByName_('Users', 'userId', userId, 'password', newPw);
  }

  try {
    MailApp.sendEmail({
      to: email,
      subject: '[' + troopName + '] 密碼重設通知',
      body: name + ' 您好，\n\n您的帳號密碼已重設。\n新密碼為：' + newPw + '\n\n請登入後立即更改密碼。\n\n' + troopName
    });
    writeAudit_('system', 'forgotPassword', loginType === 'member' ? 'Members' : 'Users', userId, 'sent to ' + email);
    return { success: true, message: '新密碼已傳送到您的登記 Email (' + email + ')。' };
  } catch (e) {
    return { success: false, error: '郵件發送失敗：' + String(e) };
  }
}


// ==================== 申請 ====================

function filterApplications_(userId) {
  var allApps = mapApplications_();
  var users = readTable_('Users');
  var user = users.filter(function (u) { return getField_(u, 'userId') === userId; })[0];
  if (!user) return [];
  var role = String(getField_(user, 'role')).toLowerCase();
  if (role === 'admin' || role === 'super_admin' || role === 'troop_super') return allApps;
  var branchId = getField_(user, 'branchId') || '';
  return allApps.filter(function (a) { return a.branchId === branchId; });
}

function handleApplyJoin_(p) {
  var id = uid_('a');
  // Extract password from note if present (format: pw:xxx)
  var appNote = String(p.note || '');
  var userPw = '';
  var pwMatch = appNote.match(/pw:([^;]+)/);
  if (pwMatch) userPw = pwMatch[1].trim();
  // Extract dob from note if present
  var userDob = '';
  var dobMatch = appNote.match(/dob:([^;]+)/);
  if (dobMatch) userDob = dobMatch[1].trim();
  // Extract email for member from note if present
  var memberEmail = '';
  var emailMatch = appNote.match(/email:([^;]+)/);
  if (emailMatch) memberEmail = emailMatch[1].trim();
  // Clean note: remove parsed fields, keep phone
  var cleanNote = appNote.split(';').filter(function(s){return s && !s.match(/^(pw|dob|email):/);}).join('; ').trim();

  appendRowByHeaders_('Applications', {
    applicationId: id,
    type: p.type || 'parent',
    name: p.name || '',
    email: p.email || memberEmail || '',
    role: p.role || 'parent',
    branchId: p.branchId || '',
    ymNumbers: p.ymNumbers || '',
    dateOfBirth: userDob || '',
    gender: p.gender || '',
    password: userPw || 'changeme',
    status: 'pending',
    approvedBy: '',
    createdAt: now_(),
    decidedAt: '',
    note: cleanNote || ''
  });
  writeAudit_('anonymous', 'applyJoin', 'Applications', id, (p.name || '') + ' ' + (p.type || ''));
  return { success: true, applicationId: id, message: '申請已提交，請等待旅團審批。' };
}

// ==================== 圖書館引入（接收來自 scout-circulars 的通告） ====================

function handleImportFromLibrary_(p) {
  var id = uid_('bkm');
  var mode = p.mode || 'informational';
  var convertedEventId = '';
  var status = mode === 'troop_participation' ? 'converted' : 'published';
  if (mode === 'troop_participation') {
    convertedEventId = uid_('e');
    var members = readTable_('Members');
    var targets = members.map(function (m) { return getField_(m, 'memberId'); }).join(',');
    appendRowByHeaders_('Events', {
      eventId: convertedEventId, title: p.title || '', scope: 'troop', branchId: '',
      date: p.date || p.deadline || '', location: '待定',
      kind: 'notice_troop_participation', status: 'published', source: '圖書館引入',
      fee: p.fee || '', targetMemberIds: targets, createdBy: 'library',
      createdAt: now_(), note: '由圖書館系統引入'
    });
  }
  appendRowByHeaders_('LibraryBookmarks', {
    bookmarkId: id,
    circularKey: p.circularKey || p.key || ('circular-' + Date.now()),
    title: p.title || '',
    source: p.source || p.sourceSite || '',
    region: p.region || '',
    circularDate: p.date || p.circularDate || '',
    sourceUrl: p.sourceUrl || p.url || '',
    attachmentUrl: p.attachmentUrl || p.url || '',
    officialDeadline: p.deadline || p.officialDeadline || '',
    internalDeadline: '', mode: mode,
    activityType: p.activityType || '',
    targetText: p.targetText || p.target || p.audience || '',
    eligibility: p.eligibility || p.audience || '',
    fee: p.fee || '',
    branchTags: p.branchTags || '全旅',
    audienceTags: p.audienceTags || '',
    status: status,
    convertedEventId: convertedEventId,
    ownerUserId: 'library',
    createdBy: 'library',
    createdAt: now_(),
    note: p.attachmentUrl || p.note || ''
  });
  writeAudit_('library', 'importFromLibrary', 'LibraryBookmarks', id, (p.title || ''));
  return { success: true, message: '已從圖書館引入：' + (p.title || '') };
}

// doPost 接收來自 scout-circulars 的 POST 請求
function doPost(e) {
  var p = {};
  if (e && e.postData && e.postData.contents) {
    try { p = JSON.parse(e.postData.contents); } catch (err) {
      p = (e && e.parameter) || {};
    }
  } else {
    p = (e && e.parameter) || {};
  }

  // Legacy public library import: keep accepting unauthenticated POST from scout-circulars.
  if (!p.action) p.action = 'importFromLibrary';
  if (p.action === 'importFromLibrary' && !p.apiKey) {
    return json(handleImportFromLibrary_(p));
  }

  // For all modern POST actions, reuse the same API-key check and switch as doGet.
  return doGet({ parameter: p });
}

function handleDecideApplication_(p) {
  var appId = p.applicationId;
  var status = p.status || 'approved';
  var rowIdx = findRowIndexById_('Applications', 'applicationId', appId);
  if (rowIdx < 0) return { success: false, error: '找不到申請' };

  updateCellByName_('Applications', 'applicationId', appId, 'status', status);
  updateCellByName_('Applications', 'applicationId', appId, 'decidedAt', now_());

  if (status === 'approved') {
    // 讀回該行
    var apps = readTable_('Applications');
    var app = apps.filter(function (a) { return getField_(a, 'applicationId') === appId; })[0];
    if (app) {
      var name = getField_(app, 'name');
      var email = getField_(app, 'email');
      var role = String(getField_(app, 'role') || 'parent').toLowerCase();
      var branchId = getField_(app, 'branchId') || '';
      var ymNumbers = getField_(app, 'ymNumbers');
      var userId = uid_('u');

      // 從 Applications.password 提取密碼（優先），fallback 到 note
      var appPw = String(getField_(app, 'password') || '').trim();
      var appNote = String(getField_(app, 'note') || '');
      var userPw = appPw || 'changeme';
      if (!appPw) {
        var pwMatch = appNote.match(/pw:([^;]+)/);
        if (pwMatch) userPw = pwMatch[1].trim();
      }
      // Extract dob from Applications.dateOfBirth or note
      var userDob = String(getField_(app, 'dateOfBirth') || '').trim();
      if (!userDob) {
        var dobMatch = appNote.match(/dob:([^;]+)/);
        if (dobMatch) userDob = dobMatch[1].trim();
      }
      // Extract member email from Applications.email or note
      var memberEmail2 = String(getField_(app, 'email') || '').trim();
      if (!memberEmail2) {
        var emailMatch2 = appNote.match(/email:([^;]+)/);
        if (emailMatch2) memberEmail2 = emailMatch2[1].trim();
      }

      appendRowByHeaders_('Users', {
        userId: userId, name: name, email: email, password: userPw,
        role: role, branchId: branchId, memberId: '', approved: true,
        createdAt: now_(), note: '由 ' + (p.operatedBy || 'system') + ' 批核'
      });

      // 家長：綁定子女
      if (role === 'parent' && ymNumbers) {
        var yms = String(ymNumbers).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var members = readTable_('Members');
        members.forEach(function (m) {
          if (yms.indexOf(String(getField_(m, 'ymNumber')).trim()) >= 0) {
            updateCellByName_('Members', 'memberId', getField_(m, 'memberId'), 'parentUserId', userId);
          }
        });
      }

      // 成員：建立/關聯 Member 記錄（1.0 邏輯）
      if (role === 'member') {
        var memberYm = String(ymNumbers || '').trim();
        if (memberYm) {
          // 從 note 提取 email 和 dob
          var appNote = String(getField_(app, 'note') || '');
          var memberEmail2 = '';
          var memberDob2 = '';
          var emailMatch = appNote.match(/email:([^;]+)/);
          if (emailMatch) memberEmail2 = emailMatch[1].trim();
          var dobMatch = appNote.match(/dob:([^;]+)/);
          if (dobMatch) memberDob2 = dobMatch[1].trim();
          // 電話 = note 第一個不是 email/dob 的部分
          var phoneMatch = appNote.split(';').filter(function(p){return p && !p.match(/^(email|dob):/);})[0];
          var memberPhone = phoneMatch ? phoneMatch.trim() : '';

          var allMembers2 = readTable_('Members');
          var existingMember = allMembers2.filter(function (m) { return String(getField_(m, 'ymNumber')).trim() === memberYm; })[0];
          var memberId2 = '';
          if (existingMember) {
            memberId2 = getField_(existingMember, 'memberId');
            var existingPw = String(getField_(existingMember, 'password') || '').trim();
            if (!existingPw) updateCellByName_('Members', 'memberId', memberId2, 'password', 'changeme');
          } else {
            memberId2 = uid_('m');
            appendRowByHeaders_('Members', {
              memberId: memberId2, ymNumber: memberYm, password: userPw, name: name,
              branchId: branchId, patrolId: '', patrolRole: '',
              dateOfBirth: memberDob2 || '', parentUserId: '',
              emergencyContactName: '', emergencyContactPhone: memberPhone || '',
              active: true, note: '由申請 ' + appId + ' 批核建立'
            });
          }
          updateCellByName_('Users', 'userId', userId, 'memberId', memberId2);
          // 自動找家長連結
          var parentUsers2 = readTable_('Users').filter(function (u) { return String(getField_(u, 'role')).toLowerCase() === 'parent'; });
          parentUsers2.forEach(function (pu) {
            var childYm2 = getField_(pu, 'childYmNumbers') || getField_(pu, 'ymNumbers') || '';
            if (childYm2) {
              var parentYms = String(childYm2).split(/[,、\s]/).map(function (s) { return s.trim(); }).filter(Boolean);
              if (parentYms.indexOf(memberYm) >= 0) {
                updateCellByName_('Members', 'memberId', memberId2, 'parentUserId', getField_(pu, 'userId'));
              }
            }
          });
        }
      }
    }
  }
  writeAudit_(p.operatedBy || 'system', status, 'Applications', appId, status);
  return { success: true };
}

// ==================== 寫入：成員 ====================

function handleCreateMember_(p) {
  var id = uid_('m');
  appendRowByHeaders_('Members', {
    memberId: id, ymNumber: p.ymNumber || '', password: p.password || p.ymNumber || '',
    name: p.name || '', email: p.email || '',
    branchId: p.branchId || '', patrolId: p.patrolId || '',
    patrolRole: p.patrolRole || (p.patrolId ? 'member' : ''),
    specialRole: p.specialRole || '',
    dateOfBirth: p.dateOfBirth || '', parentUserId: p.parentUserId || '',
    emergencyContactName: p.emergencyContactName || '',
    emergencyContactPhone: p.emergencyContactPhone || '',
    active: true, note: p.note || ''
  });
  if (p.patrolId) syncPatrolMembers_(p.patrolId);
  writeAudit_(p.operatedBy || 'system', 'createMember', 'Members', id, (p.name || '') + ' ' + (p.ymNumber || ''));
  return { success: true };
}

function handleUpdateMember_(p) {
  var fields = ['ymNumber', 'password', 'name', 'email', 'branchId', 'patrolId', 'patrolRole', 'specialRole', 'dateOfBirth', 'parentUserId', 'emergencyContactName', 'emergencyContactPhone', 'active', 'note', 'wantedBadges', 'wantedBadgesAt'];
  fields.forEach(function (f) {
    if (p[f] !== undefined && p[f] !== null) {
      updateCellByName_('Members', 'memberId', p.memberId, f, p[f]);
    }
  });
  if (p.patrolId) syncPatrolMembers_(p.patrolId);
  writeAudit_(p.operatedBy || 'system', 'updateMember', 'Members', p.memberId, '');
  return { success: true };
}

/* 成員自助登記「想考的章」（唔需要 members 權限）
   ・只容許：成員本人、其家長、或有 members 權限嘅領袖
   ・只寫 wantedBadges / wantedBadgesAt 兩欄，改唔到其他資料 */
function handleSetWantedBadges_(p) {
  var memberId = p.memberId;
  if (!memberId) return { success: false, error: '缺少 memberId' };

  var members = readTable_('Members');
  var member = members.filter(function (m) { return getField_(m, 'memberId') === memberId; })[0];
  if (!member) return { success: false, error: '找不到成員' };

  var opId = p.operatedBy || '';
  var users = readTable_('Users');
  var op = users.filter(function (u) { return getField_(u, 'userId') === opId; })[0];
  var opRole = op ? String(getField_(op, 'role')) : '';
  // ★ 角色清單必須同 lib/model.ts 嘅 MANAGER_ROLES ＋ LEADER_ROLES 一致
  //   （super_admin／troop_super／troop_leader／admin ＋ group_leader／branch_leader／coach）。
  var isLeader = ['super_admin', 'troop_super', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach'].indexOf(opRole) >= 0;
  var isSelf = String(getField_(op, 'memberId') || '') === memberId;
  var isParent = String(getField_(member, 'parentUserId') || '') === opId;
  if (!isLeader && !isSelf && !isParent) {
    return { success: false, error: '只可以登記自己（或自己子女）想考的章。' };
  }

  // 只有幼童軍（b2）／童軍（b3）支部有呢個選單
  var branchId = String(getField_(member, 'branchId') || '');
  if (branchId !== 'b2' && branchId !== 'b3' && !isLeader) {
    return { success: false, error: '你嘅支部冇「想考的章」選單，請直接同領袖講。' };
  }

  var value = String(p.wantedBadges || '').slice(0, 2000);
  updateCellByName_('Members', 'memberId', memberId, 'wantedBadges', value);
  updateCellByName_('Members', 'memberId', memberId, 'wantedBadgesAt', now_());
  writeAudit_(opId || 'system', 'setWantedBadges', 'Members', memberId, value ? (value.split(/[|,;]/).length + ' 個章') : '（清空）');
  return { success: true, wantedBadges: value };
}

/* ═══ 公開資料：三層模型（第 1 層：管理員開／關卡片）═══
   三張卡各自獨立：calendar（行事曆）／albums（相簿）／notices（通告）。
   ★ 開卡時預設把 troop（全旅內容）一齊公開 —— 全旅內容由管理員決定。
   ★ 各支部內容唔會因為開卡而自動公開，要由該支部團長另外開放。 */
function handleSetPublicCard_(p) {
  var card = String(p.card || '');
  if (['calendar', 'albums', 'notices'].indexOf(card) < 0) return { success: false, error: '未知的卡片' };

  var opId = p.operatedBy || '';
  var users = readTable_('Users');
  var op = users.filter(function (u) { return getField_(u, 'userId') === opId; })[0];
  if (!op) return { success: false, error: '未能確認操作者身份，請重新登入。' };
  var opRole = String(getField_(op, 'role') || '');
  if (['super_admin', 'troop_super', 'troop_leader', 'admin'].indexOf(opRole) < 0) {
    return { success: false, error: '只有管理層可以開放公開資料卡片。' };
  }

  var on = parseBool_(p.enabled);
  var key = 'PUBLIC_SCOPE_' + card.toUpperCase();
  var cards = setInList_(getConfigValue_('PUBLIC_CARDS'), card, on);
  var scopes = String(getConfigValue_(key) || '');
  // 開卡而 scope 從未設定過 → 預設公開 troop（全旅內容）
  if (on && parseArray_(scopes).length === 0) scopes = setInList_(scopes, 'troop', true);

  setConfigValue_('PUBLIC_CARDS', cards);
  setConfigValue_(key, scopes);
  writeAudit_(opId || 'system', 'setPublicCard', 'SystemConfig', card, on ? '開放卡片' : '關閉卡片');
  return { success: true };
}

/* ═══ 公開資料：三層模型（第 2 層：內容 scope）═══
   troop（全旅內容）→ 只有管理層可以改
   b1..b5（支部內容）→ 管理層，或該支部自己嘅團長／支部領袖／教練員 */
function handleSetPublicScope_(p) {
  var card = String(p.card || '');
  var scope = String(p.scope || '');
  if (['calendar', 'albums', 'notices'].indexOf(card) < 0) return { success: false, error: '未知的卡片' };
  if (!scope) return { success: false, error: '缺少範圍' };

  var opId = p.operatedBy || '';
  var users = readTable_('Users');
  var op = users.filter(function (u) { return getField_(u, 'userId') === opId; })[0];
  if (!op) return { success: false, error: '未能確認操作者身份，請重新登入。' };
  var opRole = String(getField_(op, 'role') || '');
  var ownBranch = String(getField_(op, 'branchId') || '');
  var adminTier = ['super_admin', 'troop_super', 'troop_leader', 'admin'].indexOf(opRole) >= 0;
  var branchScoped = ['group_leader', 'branch_leader', 'coach'].indexOf(opRole) >= 0;

  if (scope === 'troop') {
    if (!adminTier) return { success: false, error: '全旅內容只可以由管理層決定公唔公開。' };
  } else if (!adminTier && !(branchScoped && ownBranch && ownBranch === scope)) {
    return { success: false, error: '只可以開放自己支部嘅內容。' };
  }

  var key = 'PUBLIC_SCOPE_' + card.toUpperCase();
  var next = setInList_(getConfigValue_(key), scope, parseBool_(p.enabled));
  setConfigValue_(key, next);
  writeAudit_(opId || 'system', 'setPublicScope', 'SystemConfig', card + '/' + scope, parseBool_(p.enabled) ? '公開' : '取消公開');
  return { success: true };
}

/* 把一個值加入／移出 comma list（troop 排最前，其餘按字母排序） */
function setInList_(current, value, on) {
  var list = parseArray_(String(current || ''));
  var has = list.indexOf(value) >= 0;
  if (on && !has) list.push(value);
  if (!on && has) list.splice(list.indexOf(value), 1);
  list.sort(function (a, b) {
    if (a === 'troop') return -1;
    if (b === 'troop') return 1;
    return a < b ? -1 : (a > b ? 1 : 0);
  });
  return list.join(',');
}

function handleLinkParent_(p) {
  updateCellByName_('Members', 'memberId', p.memberId, 'parentUserId', p.parentUserId || '');
  writeAudit_(p.operatedBy || 'system', 'linkParent', 'Members', p.memberId, p.parentUserId || 'unlink');
  return { success: true };
}

function handleDeleteMember_(p) {
  var idx = findRowIndexById_('Members', 'memberId', p.memberId);
  if (idx < 0) return { success: false, error: '找不到成員' };
  getSheet_('Members').deleteRow(idx + 1);
  writeAudit_(p.operatedBy || 'system', 'deleteMember', 'Members', p.memberId, '');
  return { success: true };
}

// ==================== 寫入：活動 / 報名 ====================

function handleCreateEvent_(p) {
  var id = uid_('e');
  var scope = p.scope || 'troop';
  var targets = p.targetMemberIds || '';
  if (!targets) {
    var members = readTable_('Members');
    if (scope === 'troop') targets = members.map(function (m) { return getField_(m, 'memberId'); }).join(',');
    else if (p.branchId) targets = members.filter(function (m) { return getField_(m, 'branchId') === p.branchId; }).map(function (m) { return getField_(m, 'memberId'); }).join(',');
  }
  // 活動分類：旅團活動（self）／區地域總會活動（district）
  var category = p.category === 'district' ? 'district' : (p.category === 'self' ? 'self' : '');
  if (!category) {
    var src = String(p.source || '');
    category = (p.kind === 'notice_troop_participation' || /圖書館|地域|區會|區地域|總會/.test(src)) ? 'district' : 'self';
  }
  var kind = p.kind || (category === 'district' ? 'notice_troop_participation' : 'activity');
  var source = p.source || (category === 'district' ? '區地域總會活動' : '旅團活動');
  appendRowByHeaders_('Events', {
    eventId: id, title: p.title || '', scope: scope, branchId: p.branchId || '',
    date: p.date || '', location: p.location || '', kind: kind,
    status: p.status || 'draft', source: source, category: category,
    calendarTag: p.calendarTag || '', fee: p.fee || '',
    paymentUrl: p.paymentUrl || '', dutyPatrol: p.dutyPatrol || '',
    noticeUrl: p.noticeUrl || '', noticeFileName: p.noticeFileName || '',
    albumUrl: albumAllowed_(p.operatedBy || '', p.albumUrl || ''), inputMode: p.inputMode || 'form',
    targetMemberIds: targets, createdBy: p.operatedBy || '', createdAt: now_(), note: p.note || ''
  });
  writeAudit_(p.operatedBy || 'system', 'createEvent', 'Events', id, p.title || '');
  return { success: true };
}

function handlePublishEvent_(p) {
  updateCellByName_('Events', 'eventId', p.eventId, 'status', 'published');
  writeAudit_(p.operatedBy || 'system', 'publishEvent', 'Events', p.eventId, '');
  return { success: true };
}

function handleUpdateEvent_(p) {
  var fields = ['title', 'scope', 'branchId', 'date', 'location', 'kind', 'status', 'source', 'category', 'calendarTag', 'fee', 'paymentUrl', 'dutyPatrol', 'noticeUrl', 'noticeFileName', 'albumUrl', 'inputMode', 'targetMemberIds', 'note'];
  var changed = [];
  fields.forEach(function (f) {
    if (p[f] !== undefined && p[f] !== null) {
      var val = p[f];
      // 相簿功能未開通就唔准寫入（繞過 UI 都唔得）
      if (f === 'albumUrl') val = albumAllowed_(p.operatedBy || '', val);
      updateCellByName_('Events', 'eventId', p.eventId, f, val);
      changed.push(f);
    }
  });
  // 分類變更時同步 kind（旅團活動=activity；區地域總會=notice_troop_participation）
  if (p.category !== undefined && p.category !== null) {
    updateCellByName_('Events', 'eventId', p.eventId, 'kind', p.category === 'district' ? 'notice_troop_participation' : 'activity');
  }
  if (changed.length === 0) return { success: false, error: '沒有要更新的欄位' };
  updateCellByName_('Events', 'eventId', p.eventId, 'updatedAt', now_());
  writeAudit_(p.operatedBy || 'system', 'updateEvent', 'Events', p.eventId, changed.join(','));
  return { success: true };
}

function handleDeleteEvent_(p) {
  var idx = findRowIndexById_('Events', 'eventId', p.eventId);
  if (idx < 0) return { success: false, error: '找不到活動' };
  getSheet_('Events').deleteRow(idx + 1);
  writeAudit_(p.operatedBy || 'system', 'deleteEvent', 'Events', p.eventId, '');
  return { success: true };
}

/**
 * 過期通告處理：
 *   旅團活動（self）→ status = archived（放入「過期通告」，日後可查回／還原）
 *   區地域總會（district，外部通告）→ 直接刪除
 */
function handleArchiveEvent_(p) {
  var idx = findRowIndexById_('Events', 'eventId', p.eventId);
  if (idx < 0) return { success: false, error: '找不到活動' };
  var events = readTable_('Events');
  var ev = events.filter(function (e) { return getField_(e, 'eventId') === p.eventId; })[0];
  var category = isDistrictEvent_(ev) ? 'district' : 'self';
  var replyCount = readTable_('EventReplies').filter(function (r) {
    return getField_(r, 'eventId') === p.eventId;
  }).length;
  if (category === 'district') {
    getSheet_('Events').deleteRow(idx + 1);
    writeAudit_(p.operatedBy || 'system', 'deleteExpiredEvent', 'Events', p.eventId, '外部通告過期直接刪除（連帶 ' + replyCount + ' 筆回覆）');
  } else {
    // ★ 只改狀態，EventReplies 一律保留（報名／付款紀錄可查回）
    updateCellByName_('Events', 'eventId', p.eventId, 'status', 'archived');
    writeAudit_(p.operatedBy || 'system', 'archiveEvent', 'Events', p.eventId, '放入過期通告（保留 ' + replyCount + ' 筆報名紀錄）');
  }
  return { success: true, replyCount: replyCount };
}

/** 重開報名：過期／已封存活動重新開放，畀遲咗嘅家長／成員補報 */
function handleReopenEvent_(p) {
  var idx = findRowIndexById_('Events', 'eventId', p.eventId);
  if (idx < 0) return { success: false, error: '找不到活動' };
  updateCellByName_('Events', 'eventId', p.eventId, 'status', 'published');
  updateCellByName_('Events', 'eventId', p.eventId, 'lateRegistration', 'true');
  writeAudit_(p.operatedBy || 'system', 'reopenEvent', 'Events', p.eventId, '重開報名（容許遲交）');
  return { success: true };
}

function handleRestoreEvent_(p) {
  var idx = findRowIndexById_('Events', 'eventId', p.eventId);
  if (idx < 0) return { success: false, error: '找不到活動' };
  updateCellByName_('Events', 'eventId', p.eventId, 'status', 'published');
  writeAudit_(p.operatedBy || 'system', 'restoreEvent', 'Events', p.eventId, '由過期通告還原');
  return { success: true };
}


/** 判斷活動係咪「區地域總會活動」（同前端 eventCategory 邏輯一致） */
function isDistrictEvent_(evRow) {
  if (!evRow) return false;
  var cat = String(getField_(evRow, 'category') || '');
  if (cat === 'district') return true;
  if (cat === 'self') return false;
  if (String(getField_(evRow, 'kind') || '') === 'notice_troop_participation') return true;
  return /圖書館|地域|區會|區地域|總會/.test(String(getField_(evRow, 'source') || ''));
}

/**
 * ★ 18 歲 GS 端 guard（1.0 邏輯）
 * registered / declined：18 歲以下必須由家長操作
 * interested：任何人都可以
 */
function handleSetReply_(p) {
  var eventId = p.eventId, memberId = p.memberId;
  var type = p.type || 'interested';

  // 區地域總會活動＝純通告，旅團唔代收報名（成員想報自己按連結報）
  var evRows = readTable_('Events').filter(function (e) { return getField_(e, 'eventId') === eventId; });
  if (evRows.length && isDistrictEvent_(evRows[0])) {
    return { success: false, error: '區地域總會活動為通告性質，旅團不代收報名，請按通告連結自行報名。' };
  }

  // 年齡檢查
  if (type === 'registered' || type === 'declined') {
    var members = readTable_('Members');
    var member = members.filter(function (m) { return getField_(m, 'memberId') === memberId; })[0];
    if (member) {
      var age = calcAge_(getField_(member, 'dateOfBirth'));
      if (age >= 0 && age < 18) {
        // 必須由家長操作
        var parentUserId = p.parentUserId || '';
        if (!parentUserId) {
          // 檢查操作者是否為家長
          var users = readTable_('Users');
          var operator = users.filter(function (u) { return getField_(u, 'userId') === (p.operatedBy || ''); })[0];
          if (!operator || String(getField_(operator, 'role')).toLowerCase() !== 'parent') {
            return { success: false, error: '18歲以下成員需由家長代為操作參加 / 不參加' };
          }
        }
      }
    }
  }

  var replyId = eventId + '_' + memberId;
  var existing = findRowIndexById_('EventReplies', 'replyId', replyId);
  var operatedBy = p.operatedBy || 'member';
  var parentUserId = p.parentUserId || '';

  if (existing >= 0) {
    updateCellByName_('EventReplies', 'replyId', replyId, 'type', type);
    updateCellByName_('EventReplies', 'replyId', replyId, 'operatedBy', operatedBy);
    updateCellByName_('EventReplies', 'replyId', replyId, 'updatedAt', now_());
    // Clear cancelled when upgrading from interested to registered/declined
    if (type === 'registered' || type === 'declined') {
      updateCellByName_('EventReplies', 'replyId', replyId, 'cancelled', 'false');
    }
    if (parentUserId) updateCellByName_('EventReplies', 'replyId', replyId, 'parentUserId', parentUserId);
  } else {
    // Get member info for memberName and branchId
    var allMembers = readTable_('Members');
    var member = allMembers.filter(function (m) { return getField_(m, 'memberId') === memberId; })[0];
    var memberName = member ? (getField_(member, 'name') || '') : '';
    var memberBranchId = member ? (getField_(member, 'branchId') || '') : '';

    appendRowByHeaders_('EventReplies', {
      replyId: replyId, eventId: eventId, memberId: memberId,
      memberName: memberName, branchId: memberBranchId,
      parentUserId: parentUserId, type: type, operatedBy: operatedBy,
      paid: false, cancelled: false, createdAt: now_(), updatedAt: now_(), notes: ''
    });
  }
  writeAudit_(p.operatedBy || 'system', 'setReply', 'EventReplies', eventId, memberId + ' → ' + type);
  return { success: true };
}

function handleTogglePaid_(p) {
  var payRows = readTable_('Events').filter(function (e) { return getField_(e, 'eventId') === p.eventId; });
  if (payRows.length && isDistrictEvent_(payRows[0])) {
    return { success: false, error: '區地域總會活動不經旅團收費，無法標記付款。' };
  }
  var replyId = p.eventId + '_' + p.memberId;
  var idx = findRowIndexById_('EventReplies', 'replyId', replyId);
  if (idx >= 0) {
    var sh = getSheet_('EventReplies');
    var data = sh.getDataRange().getValues();
    var headers = data[0].map(function (h) { return String(h).trim(); });
    var paidIdx = findColIndex_(headers, 'paid');
    var current = parseBool_(data[idx][paidIdx]);
    updateCellByName_('EventReplies', 'replyId', replyId, 'paid', String(!current));
    updateCellByName_('EventReplies', 'replyId', replyId, 'updatedAt', now_());
    writeAudit_(p.operatedBy || 'system', 'togglePaid', 'EventReplies', p.eventId, p.memberId + ' paid=' + !current);
  } else {
    appendRowByHeaders_('EventReplies', {
      replyId: replyId, eventId: p.eventId, memberId: p.memberId,
      parentUserId: '', type: 'registered', operatedBy: 'leader',
      updatedAt: now_(), paid: true, notes: ''
    });
    writeAudit_(p.operatedBy || 'system', 'togglePaid', 'EventReplies', p.eventId, p.memberId + ' new paid=true');
  }
  return { success: true };
}

/** 領袖核實收款：家長 tick「已付款」後，領袖喺自己嗰邊確認收到錢（家長端會顯示） */
function handleConfirmPayment_(p) {
  var replyId = p.eventId + '_' + p.memberId;
  var on = String(p.confirmed) !== 'false';
  var idx = findRowIndexById_('EventReplies', 'replyId', replyId);
  if (idx < 0) {
    appendRowByHeaders_('EventReplies', {
      replyId: replyId, eventId: p.eventId, memberId: p.memberId,
      parentUserId: '', type: 'registered', operatedBy: 'leader',
      paid: on, paymentConfirmed: on,
      paymentConfirmedBy: on ? (p.operatedBy || 'system') : '',
      paymentConfirmedAt: on ? now_() : '',
      cancelled: false, createdAt: now_(), updatedAt: now_(), notes: ''
    });
  } else {
    updateCellByName_('EventReplies', 'replyId', replyId, 'paymentConfirmed', String(on));
    updateCellByName_('EventReplies', 'replyId', replyId, 'paymentConfirmedBy', on ? (p.operatedBy || 'system') : '');
    updateCellByName_('EventReplies', 'replyId', replyId, 'paymentConfirmedAt', on ? now_() : '');
    if (on) updateCellByName_('EventReplies', 'replyId', replyId, 'paid', 'true');
    updateCellByName_('EventReplies', 'replyId', replyId, 'updatedAt', now_());
  }
  writeAudit_(p.operatedBy || 'system', 'confirmPayment', 'EventReplies', p.eventId, p.memberId + ' confirmed=' + on);
  return { success: true };
}

// ==================== 寫入：使用者 ====================

function handleToggleUser_(p) {
  var users = readTable_('Users');
  var user = users.filter(function (u) { return getField_(u, 'userId') === p.userId; })[0];
  if (!user) return { success: false, error: '找不到使用者' };
  var current = parseBool_(getField_(user, 'approved'));
  updateCellByName_('Users', 'userId', p.userId, 'approved', String(!current));
  writeAudit_(p.operatedBy || 'system', 'toggleUser', 'Users', p.userId, 'approved=' + !current);
  return { success: true };
}

function handleCreateUser_(p) {
  var id = uid_('u');
  appendRowByHeaders_('Users', {
    userId: id, name: p.name || '', email: p.email || '', password: p.password || 'changeme',
    role: p.role || 'member', branchId: p.branchId || '', memberId: p.memberId || '',
    approved: true, createdAt: now_(), note: '由 ' + (p.operatedBy || 'system') + ' 建立'
  });
  writeAudit_(p.operatedBy || 'system', 'createUser', 'Users', id, (p.name || '') + ' ' + (p.role || ''));

  // 家長開戶：連結子女（填 SCOUT ID 或中文姓名；小童軍可能未有 SCOUT ID，可只填姓名）
  // 找不到的子女會建成員紀錄（不建登入帳號 — 小童軍由家長帳號看資訊及代報名）
  var childResult = { linked: [], created: [] };
  if (String(p.role || '').toLowerCase() === 'parent' || p.children) {
    childResult = linkChildrenToParent_(id, p.children, p.operatedBy || 'system');
  }
  return { success: true, linked: childResult.linked, created: childResult.created };
}

/**
 * 連結子女到家長帳號（parentUserId 寫入 Members 表，childMemberIds 由 mapUsers_ 自動派生）
 * children：陣列 [ {ymNumber?, name?, branchId?, dateOfBirth?} ] 或字串（; , 分隔的 SCOUT ID / 姓名）
 */
function linkChildrenToParent_(parentId, children, operator) {
  var linked = [], created = [];
  var list = [];
  if (Array.isArray(children)) {
    children.forEach(function (c) {
      if (typeof c === 'string') String(c).split(/[;；,，\n|]+/).forEach(function (s) { if (s.trim()) list.push(s); });
      else if (c) list.push(c);
    });
  } else if (children) {
    String(children).split(/[;；,，\n|]+/).forEach(function (s) { if (s.trim()) list.push(s); });
  }
  list.forEach(function (c) {
    var cObj = (typeof c === 'object' && c) ? c : {};
    var ym = String(cObj.ymNumber || cObj.ymis || '').trim();
    var nm = String(cObj.name || '').trim();
    if (!nm && typeof c === 'string') { nm = c.trim(); }
    if (!ym && /^\d{7,12}$/.test(nm)) { ym = nm; nm = ''; }
    if (!ym && !nm) return;
    var members = readTable_('Members');
    var m = null;
    if (ym) m = members.filter(function (x) { return String(getField_(x, 'ymNumber')).trim() === ym; })[0] || null;
    if (!m && nm) m = members.filter(function (x) { return String(getField_(x, 'name')).trim() === nm; })[0] || null;
    if (m) {
      var mid = getField_(m, 'memberId');
      if (String(getField_(m, 'parentUserId')) !== parentId) updateCellByName_('Members', 'memberId', mid, 'parentUserId', parentId);
      if (cObj.dateOfBirth && !getField_(m, 'dateOfBirth')) updateCellByName_('Members', 'memberId', mid, 'dateOfBirth', String(cObj.dateOfBirth));
      linked.push(getField_(m, 'name') || ym);
    } else {
      appendRowByHeaders_('Members', {
        memberId: uid_('m'), ymNumber: ym, password: ym, name: nm || ('成員 ' + ym), email: '',
        branchId: String(cObj.branchId || 'b1'), patrolId: '', patrolRole: '', specialRole: '',
        dateOfBirth: String(cObj.dateOfBirth || ''), parentUserId: parentId,
        emergencyContactName: '', emergencyContactPhone: '', active: true,
        note: ym ? '經家長開戶建立（預設密碼=SCOUT ID，請提醒成員更改）' : '經家長開戶建立（無 SCOUT ID，無登入帳號，由家長代報名）'
      });
      created.push(nm || ym);
    }
  });
  if (linked.length || created.length) writeAudit_(operator || 'system', 'linkChildren', 'Members', parentId, linked.join(',') + ' | 新建: ' + created.join(','));
  return { linked: linked, created: created };
}

function parseRowsParam_(rows) {
  if (!rows) return [];
  if (Array.isArray(rows)) return rows;
  if (typeof rows === 'string') {
    try {
      var parsed = JSON.parse(rows);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
}

function canBatchManage_(operatedBy) {
  if (!operatedBy || isPrivilegedOperator_(operatedBy)) return true;
  var users = mapUsers_();
  var operator = users.filter(function (u) { return u.id === operatedBy; })[0];
  if (!operator) return false;
  return ['super_admin', 'troop_super', 'admin', 'group_leader', 'branch_leader'].indexOf(operator.role) >= 0;
}

function handleBatchCreateUsers_(p) {
  var operatedBy = p.operatedBy || 'system';
  if (!canBatchManage_(operatedBy)) return { success: false, error: '你沒有權限批量開戶。' };

  var rows = parseRowsParam_(p.rows);
  if (!rows.length) return { success: false, error: '沒有可匯入的帳號資料。' };
  if (rows.length > 300) return { success: false, error: '一次最多批量建立 300 個帳號，請分批匯入。' };

  var users = readTable_('Users');
  var existingEmails = {};
  var existingIds = {};
  users.forEach(function (u) {
    var email = String(getField_(u, 'email') || '').trim().toLowerCase();
    var id = String(getField_(u, 'userId') || '').trim();
    if (email) existingEmails[email] = true;
    if (id) existingIds[id] = true;
  });

  var allowedRoles = ['troop_super', 'admin', 'group_leader', 'branch_leader', 'coach', 'parent', 'member'];
  var created = 0, skipped = 0, linkedChildren = 0, createdChildren = 0;
  var errors = [];

  rows.forEach(function (raw, idx) {
    var name = String(raw.name || '').trim();
    var email = String(raw.email || '').trim();
    var emailKey = email.toLowerCase();
    var role = String(raw.role || 'parent').trim() || 'parent';
    var rowNo = idx + 1;

    if (!name || !email) { skipped++; errors.push('第 ' + rowNo + ' 行：缺少姓名或 Email'); return; }
    if (existingEmails[emailKey]) { skipped++; errors.push('第 ' + rowNo + ' 行：Email 已存在（' + email + '）'); return; }
    if (allowedRoles.indexOf(role) < 0) role = 'parent';
    if (role === 'troop_super' && operatedBy !== 'system' && operatedBy !== 'staff_token' && TECH_TEST_ACCOUNTS_.indexOf(operatedBy) < 0) role = 'admin';

    var id = raw.userId ? String(raw.userId).trim() : uid_('u');
    while (existingIds[id]) id = uid_('u');

    appendRowByHeaders_('Users', {
      userId: id, name: name, email: email, password: raw.password || 'changeme',
      role: role, branchId: raw.branchId || '', memberId: raw.memberId || '',
      approved: raw.approved === false || raw.approved === 'false' ? false : true,
      createdAt: now_(), note: '批量開戶；由 ' + operatedBy + ' 建立'
    });
    existingEmails[emailKey] = true;
    existingIds[id] = true;
    created++;

    // 家長行：連結子女（SCOUT ID 或姓名；找不到就建成員紀錄，不建登入帳號）
    if (role === 'parent' && raw.children) {
      var cr = linkChildrenToParent_(id, raw.children, operatedBy);
      linkedChildren += cr.linked.length;
      createdChildren += cr.created.length;
      if (cr.linked.length || cr.created.length) errors.push('第 ' + rowNo + ' 行：已連結子女 — 原有 ' + cr.linked.join('、') + (cr.created.length ? '，新建 ' + cr.created.join('、') : ''));
    }
  });

  writeAudit_(operatedBy, 'batchCreateUsers', 'Users', '', 'created=' + created + ', skipped=' + skipped + ', linkedChildren=' + linkedChildren + ', createdChildren=' + createdChildren);
  return { success: true, created: created, skipped: skipped, linkedChildren: linkedChildren, createdChildren: createdChildren, errors: errors.slice(0, 30) };
}

function handleBatchCreateMembers_(p) {
  var operatedBy = p.operatedBy || 'system';
  if (!canBatchManage_(operatedBy)) return { success: false, error: '你沒有權限批量建立成員。' };

  var rows = parseRowsParam_(p.rows);
  if (!rows.length) return { success: false, error: '沒有可匯入的成員資料。' };
  if (rows.length > 500) return { success: false, error: '一次最多批量建立 500 名成員，請分批匯入。' };

  var members = readTable_('Members');
  var existingYm = {};
  members.forEach(function (m) {
    var ym = String(getField_(m, 'ymNumber') || '').trim();
    if (ym) existingYm[ym] = true;
  });

  var created = 0, skipped = 0;
  var errors = [];
  var patrolsToSync = {};

  rows.forEach(function (raw, idx) {
    var rowNo = idx + 1;
    var name = String(raw.name || '').trim();
    var ymNumber = String(raw.ymNumber || raw.ymis || '').trim();
    var branchId = String(raw.branchId || '').trim();
    var patrolId = String(raw.patrolId || '').trim();

    if (!name || !ymNumber || !branchId) { skipped++; errors.push('第 ' + rowNo + ' 行：缺少姓名、YMIS 或支部'); return; }
    if (existingYm[ymNumber]) { skipped++; errors.push('第 ' + rowNo + ' 行：YMIS 已存在（' + ymNumber + '）'); return; }

    var id = uid_('m');
    appendRowByHeaders_('Members', {
      memberId: id, ymNumber: ymNumber, password: raw.password || ymNumber,
      name: name, email: raw.email || '', branchId: branchId, patrolId: patrolId,
      patrolRole: raw.patrolRole || (patrolId ? 'member' : ''),
      specialRole: raw.specialRole || '', dateOfBirth: raw.dateOfBirth || '',
      parentUserId: raw.parentUserId || '', emergencyContactName: raw.emergencyContactName || '',
      emergencyContactPhone: raw.emergencyContactPhone || '', active: true,
      note: raw.note || ('批量建立；由 ' + operatedBy + ' 建立')
    });
    existingYm[ymNumber] = true;
    if (patrolId) patrolsToSync[patrolId] = true;
    created++;
  });

  Object.keys(patrolsToSync).forEach(function (patrolId) { syncPatrolMembers_(patrolId); });
  writeAudit_(operatedBy, 'batchCreateMembers', 'Members', '', 'created=' + created + ', skipped=' + skipped);
  return { success: true, created: created, skipped: skipped, errors: errors.slice(0, 30) };
}

function handleUpdateUserRole_(p) {
  updateCellByName_('Users', 'userId', p.userId, 'role', p.role || 'member');
  writeAudit_(p.operatedBy || 'system', 'updateUserRole', 'Users', p.userId, 'role=' + (p.role || ''));
  return { success: true };
}

function handleUpdateUserField_(p) {
  updateCellByName_('Users', 'userId', p.userId, p.field, p.value || '');
  writeAudit_(p.operatedBy || 'system', 'updateUserField', 'Users', p.userId, p.field + '=' + (p.value || ''));
  return { success: true };
}

function handleDeleteUser_(p) {
  var idx = findRowIndexById_('Users', 'userId', p.userId);
  if (idx < 0) return { success: false, error: '找不到使用者' };
  getSheet_('Users').deleteRow(idx + 1);
  writeAudit_(p.operatedBy || 'system', 'deleteUser', 'Users', p.userId, '');
  return { success: true };
}

// ==================== 寫入：小隊 ====================

function handleCreatePatrol_(p) {
  var id = uid_('p');
  var existing = readTable_('Patrols').filter(function (x) { return getField_(x, 'branchId') === p.branchId; });
  appendRowByHeaders_('Patrols', {
    patrolId: id, branchId: p.branchId, name: p.name || '', shortName: p.short || '',
    leaderMemberId: '', deputyLeaderMemberId: '', memberIds: '',
    enabled: true, order: existing.length + 1, note: p.note || ''
  });
  writeAudit_(p.operatedBy || 'system', 'createPatrol', 'Patrols', id, p.name || '');
  return { success: true };
}

function handleTogglePatrol_(p) {
  var patrols = readTable_('Patrols');
  var patrol = patrols.filter(function (x) { return getField_(x, 'patrolId') === p.patrolId; })[0];
  if (!patrol) return { success: false, error: '找不到小隊' };
  var current = parseBool_(getField_(patrol, 'enabled'));
  updateCellByName_('Patrols', 'patrolId', p.patrolId, 'enabled', String(!current));
  writeAudit_(p.operatedBy || 'system', 'togglePatrol', 'Patrols', p.patrolId, 'enabled=' + !current);
  return { success: true };
}

function handleDeletePatrol_(p) {
  var idx = findRowIndexById_('Patrols', 'patrolId', p.patrolId);
  if (idx < 0) return { success: false, error: '找不到小隊' };
  getSheet_('Patrols').deleteRow(idx + 1);
  writeAudit_(p.operatedBy || 'system', 'deletePatrol', 'Patrols', p.patrolId, '');
  return { success: true };
}

function syncPatrolMembers_(patrolId) {
  var members = readTable_('Members');
  var ids = members.filter(function (m) { return getField_(m, 'patrolId') === patrolId; }).map(function (m) { return getField_(m, 'memberId'); });
  var leader = members.filter(function (m) { return getField_(m, 'patrolId') === patrolId && getField_(m, 'patrolRole') === 'leader'; }).map(function (m) { return getField_(m, 'memberId'); })[0] || '';
  updateCellByName_('Patrols', 'patrolId', patrolId, 'leaderMemberId', leader);
  updateCellByName_('Patrols', 'patrolId', patrolId, 'memberIds', ids.join(','));
}

// ==================== 寫入：圖書館標記 ====================

function handleImportBookmark_(p) {
  var id = uid_('bkm');
  var mode = p.mode || 'informational';
  var convertedEventId = '';
  var status = mode === 'troop_participation' ? 'converted' : 'published';
  if (mode === 'troop_participation') {
    convertedEventId = uid_('e');
    var members = readTable_('Members');
    var users = readTable_('Users');
    var branchTags = String(p.branchTags || '全旅').trim();
    var targetList = [];

    var includeAll = branchTags.indexOf('全旅') >= 0 || branchTags === '';
    var includeB1 = includeAll || branchTags.indexOf('小童軍') >= 0 || branchTags.indexOf('b1') >= 0;
    var includeB2 = includeAll || branchTags.indexOf('幼童軍') >= 0 || branchTags.indexOf('b2') >= 0;
    var includeB3 = includeAll || branchTags.indexOf('童軍') >= 0 || branchTags.indexOf('b3') >= 0;
    var includeB4 = includeAll || branchTags.indexOf('深資') >= 0 || branchTags.indexOf('b4') >= 0;
    var includeB5 = includeAll || branchTags.indexOf('樂行') >= 0 || branchTags.indexOf('b5') >= 0;
    var includeLeader = includeAll || branchTags.indexOf('領袖') >= 0 || branchTags.indexOf('團長') >= 0 || branchTags.indexOf('旅長') >= 0;

    members.forEach(function(m) {
      var bid = getField_(m, 'branchId');
      if (bid === 'b1' && includeB1) targetList.push(getField_(m, 'memberId'));
      else if (bid === 'b2' && includeB2) targetList.push(getField_(m, 'memberId'));
      else if (bid === 'b3' && includeB3) targetList.push(getField_(m, 'memberId'));
      else if (bid === 'b4' && includeB4) targetList.push(getField_(m, 'memberId'));
      else if (bid === 'b5' && includeB5) targetList.push(getField_(m, 'memberId'));
      else if (includeAll) targetList.push(getField_(m, 'memberId'));
    });

    if (includeLeader) {
      users.forEach(function(u) {
        var r = String(getField_(u, 'role')).toLowerCase();
        if (['admin','super_admin','troop_super','group_leader','branch_leader','coach'].indexOf(r) >= 0) {
          targetList.push(getField_(u, 'userId'));
        }
      });
    }
    var targets = targetList.filter(function(v,i,a){return a.indexOf(v)===i;}).join(',');

    appendRowByHeaders_('Events', {
      eventId: convertedEventId, title: p.title || '', scope: 'troop', branchId: '',
      date: p.internalDeadline || p.officialDeadline || '', location: '待定',
      kind: 'notice_troop_participation', status: 'published', source: '圖書館引入',
      fee: p.fee || '', paymentUrl: p.paymentUrl || '',
      targetMemberIds: targets, createdBy: p.operatedBy || '',
      createdAt: now_(), note: '由圖書館引入'
    });
  }
  appendRowByHeaders_('LibraryBookmarks', {
    bookmarkId: id,
    circularKey: p.circularKey || p.key || ('circular-' + Date.now()),
    title: p.title || '',
    source: p.source || p.sourceSite || '',
    region: p.region || '',
    circularDate: p.date || p.circularDate || '',
    sourceUrl: p.sourceUrl || '',
    attachmentUrl: p.attachmentUrl || p.url || '',
    paymentUrl: p.paymentUrl || '',
    officialDeadline: p.officialDeadline || p.deadline || '',
    internalDeadline: p.internalDeadline || '',
    mode: mode,
    activityType: p.activityType || '',
    targetText: p.targetText || p.target || p.audience || '',
    eligibility: p.eligibility || p.audience || '',
    fee: p.fee || '',
    branchTags: p.branchTags || '全旅',
    audienceTags: p.audienceTags || '',
    status: status,
    convertedEventId: convertedEventId,
    ownerUserId: p.operatedBy || '',
    createdBy: p.operatedBy || '',
    createdAt: now_(),
    note: p.note || ''
  });
  writeAudit_(p.operatedBy || 'system', 'importBookmark', 'LibraryBookmarks', id, (p.title || '') + ' → ' + mode + ' (by ' + (p.operatedBy || 'system') + ')');
  return { success: true };
}

// ==================== 寫入：集會 / 行事曆 ====================

function handleToggleRegularMeeting_(p) {
  var meetings = readTable_('RegularMeetings');
  var m = meetings.filter(function (x) { return getField_(x, 'meetingId') === p.meetingId; })[0];
  if (!m) return { success: false, error: '找不到集會規則' };
  var current = parseBool_(getField_(m, 'enabled'));
  updateCellByName_('RegularMeetings', 'meetingId', p.meetingId, 'enabled', String(!current));
  writeAudit_(p.operatedBy || 'system', 'toggleRegularMeeting', 'RegularMeetings', p.meetingId, 'enabled=' + !current);
  return { success: true };
}

function handleCreateRegularMeeting_(p) {
  var id = uid_('rm');
  appendRowByHeaders_('RegularMeetings', {
    meetingId: id, branchId: p.branchId || '', title: p.title || '',
    weekday: Number(p.weekday) || 6, frequency: p.frequency || 'weekly',
    startTime: "'" + (p.startTime || '14:00'),
    endTime: "'" + (p.endTime || '16:00'), location: p.location || '本中心',
    enabled: true, note: p.note || ''
  });
  writeAudit_(p.operatedBy || 'system', 'createRegularMeeting', 'RegularMeetings', id, p.title || '');
  return { success: true };
}

function handleDeleteRegularMeeting_(p) {
  var idx = findRowIndexById_('RegularMeetings', 'meetingId', p.meetingId);
  if (idx < 0) return { success: false, error: '找不到集會規則' };
  getSheet_('RegularMeetings').deleteRow(idx + 1);
  writeAudit_(p.operatedBy || 'system', 'deleteRegularMeeting', 'RegularMeetings', p.meetingId, '');
  return { success: true };
}

function handleUpdateRegularMeeting_(p) {
  var fields = ['branchId', 'title', 'weekday', 'frequency', 'startTime', 'endTime', 'location', 'enabled'];
  fields.forEach(function (f) {
    if (p[f] !== undefined && p[f] !== null) {
      var val = p[f];
      if (f === 'startTime' || f === 'endTime') val = "'" + val;
      updateCellByName_('RegularMeetings', 'meetingId', p.meetingId, f, val);
    }
  });
  writeAudit_(p.operatedBy || 'system', 'updateRegularMeeting', 'RegularMeetings', p.meetingId, '');
  return { success: true };
}

function handleToggleMeetingCancel_(p) {
  var branchId = p.branchId, date = p.date, type = p.type || 'cancelled';
  var sh = getSheet_('CancelledMeetings');
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).trim(); });
  var bIdx = findColIndex_(headers, 'branchId');
  var dIdx = findColIndex_(headers, 'date');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][bIdx]) === branchId && fmtDate_(data[i][dIdx]) === date) {
      sh.deleteRow(i + 1);
      writeAudit_(p.operatedBy || 'system', 'uncancelMeeting', 'CancelledMeetings', branchId + ' ' + date, '');
      return { success: true };
    }
  }
  appendRowByHeaders_('CancelledMeetings', {
    cancelId: uid_('cm'), branchId: branchId, date: date, type: type,
    reason: p.reason || '', markedBy: p.operatedBy || '', markedAt: now_()
  });
  writeAudit_(p.operatedBy || 'system', 'cancelMeeting', 'CancelledMeetings', branchId + ' ' + date, type + ': ' + (p.reason || ''));
  return { success: true };
}

// ==================== 寫入：設定 ====================

function handleSaveConfig_(p) {
  setConfigValue_(p.key, p.value);
  writeAudit_(p.operatedBy || 'system', 'saveConfig', 'SystemConfig', p.key, '');
  return { success: true };
}

function handleSavePluginSetting_(p) {
  var pluginId = p.pluginId;
  if (!pluginId) return { success: false, error: 'Missing pluginId' };
  if (pluginId === 'troop_attendance') {
    return { success: false, error: '簽到／點名已是主系統內建功能，不需再安裝為插件。' };
  }

  var existing = findRowIndexById_('PluginSettings', 'pluginId', pluginId);
  var fields = {
    pluginId: pluginId,
    frontendUrl: p.frontendUrl || '',
    backendUrl: p.backendUrl || '',
    apiKey: p.apiKey || '',
    note: p.note || ''
  };

  if (existing >= 0) {
    updateCellByName_('PluginSettings', 'pluginId', pluginId, 'frontendUrl', fields.frontendUrl);
    updateCellByName_('PluginSettings', 'pluginId', pluginId, 'backendUrl', fields.backendUrl);
    updateCellByName_('PluginSettings', 'pluginId', pluginId, 'apiKey', fields.apiKey);
    updateCellByName_('PluginSettings', 'pluginId', pluginId, 'note', fields.note);
  } else {
    appendRowByHeaders_('PluginSettings', fields);
  }

  // Also ensure it's in the Plugins table so it shows up in dashboard
  var plugIdx = findRowIndexById_('Plugins', 'cardId', pluginId);
  if (plugIdx < 0) {
    appendRowByHeaders_('Plugins', {
      cardId: pluginId,
      title: p.title || pluginId,
      icon: p.icon || '🧩',
      tier: p.tier || 3,
      url: p.frontendUrl || '',
      embed: true,
      minRole: 'member',
      enabled: true
    });
  }
  
  writeAudit_(p.operatedBy || 'system', 'savePluginSetting', 'PluginSettings', pluginId, '');
  return { success: true };
}

function handleTogglePluginStatus_(p) {
  var pluginId = p.pluginId;
  var plugIdx = findRowIndexById_('Plugins', 'cardId', pluginId);
  if (plugIdx < 0) return { success: false, error: 'Plugin not found' };
  
  var sh = getSheet_('Plugins');
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).trim(); });
  var enabledIdx = findColIndex_(headers, 'enabled');
  var current = parseBool_(data[plugIdx][enabledIdx]);
  
  updateCellByName_('Plugins', 'cardId', pluginId, 'enabled', String(!current));
  writeAudit_(p.operatedBy || 'system', 'togglePlugin', 'Plugins', pluginId, 'enabled=' + !current);
  return { success: true };
}

// ==================== 取消報名回覆（1.0 邏輯：軟刪除） ====================

function handleCancelReply_(p) {
  var replyId = p.eventId + '_' + p.memberId;
  var idx = findRowIndexById_('EventReplies', 'replyId', replyId);
  if (idx < 0) return { success: false, error: '找不到報名記錄' };
  // 1.0 邏輯：cancelled=true（軟刪除），不影響 type
  updateCellByName_('EventReplies', 'replyId', replyId, 'cancelled', 'true');
  updateCellByName_('EventReplies', 'replyId', replyId, 'operatedBy', p.operatedBy || 'member');
  updateCellByName_('EventReplies', 'replyId', replyId, 'updatedAt', now_());
  writeAudit_(p.operatedBy || 'system', 'cancelReply', 'EventReplies', p.eventId, p.memberId + ' cancelled');
  return { success: true };
}

// ==================== 報名摘要（1.0 getEventRegistrationSummary） ====================



// ==================== 報名記錄查詢（1.0 邏輯） ====================

function getEventReplies(p) {
  var eventId = p.eventId || '';
  var memberId = p.memberId || '';
  var memberIds = p.memberIds || '';
  var userId = p.userId || '';

  var allReplies = readTable_('EventReplies').filter(function(r) {
    return String(getField_(r, 'cancelled') || 'false').toLowerCase() !== 'true';
  });

  var filtered = allReplies;

  if (eventId) {
    filtered = filtered.filter(function(r) { return getField_(r, 'eventId') === eventId; });
  }
  if (memberId) {
    filtered = filtered.filter(function(r) { return getField_(r, 'memberId') === memberId; });
  }
  if (memberIds) {
    var idList = String(memberIds).split(',').map(function(s){return s.trim();}).filter(Boolean);
    filtered = filtered.filter(function(r) { return idList.indexOf(getField_(r, 'memberId')) >= 0; });
  }

  // Permission: leader only sees own branch
  if (userId && !memberId && !memberIds) {
    var users = readTable_('Users');
    var requester = users.filter(function(u){return getField_(u,'userId')===userId;})[0];
    var role = requester ? String(getField_(requester,'role')).toLowerCase() : '';
    if (role !== 'super_admin' && role !== 'troop_super' && role !== 'admin') {
      var reqBranchId = getField_(requester,'branchId') || '';
      if (reqBranchId) {
        filtered = filtered.filter(function(r) { return getField_(r,'branchId') === reqBranchId; });
      }
    }
  }

  // Fill memberName if missing
  var members = readTable_('Members');
  var result = filtered.map(function(r) {
    var mId = getField_(r,'memberId');
    var m = members.filter(function(x){return getField_(x,'memberId')===mId;})[0];
    return {
      replyId: getField_(r,'replyId') || '',
      eventId: getField_(r,'eventId') || '',
      memberId: mId,
      memberName: getField_(r,'memberName') || (m ? getField_(m,'name') : ''),
      branchId: getField_(r,'branchId') || '',
      parentUserId: getField_(r,'parentUserId') || '',
      operatedBy: getField_(r,'operatedBy') || '',
      type: getField_(r,'type') || 'interested',
      paid: getField_(r,'paid'),
      cancelled: getField_(r,'cancelled') || false,
      createdAt: getField_(r,'createdAt') || '',
      updatedAt: getField_(r,'updatedAt') || ''
    };
  });

  // If eventId, return categorized view
  if (eventId) {
    return {
      success: true,
      data: {
        interested: result.filter(function(r){return r.type==='interested';}),
        registered: result.filter(function(r){return r.type==='registered';}),
        declined: result.filter(function(r){return r.type==='declined';}),
        all: result
      },
      count: result.length
    };
  }

  return { success: true, data: result, count: result.length };
}

function getEventRegistrationSummary(p) {
  var eventId = p.eventId || '';
  var userId = p.userId || '';
  if (!eventId) return { success: false, error: '缺少 eventId' };

  var events = mapEvents_();
  var event = events.filter(function (e) { return e.id === eventId; })[0];
  if (!event) return { success: false, error: '活動不存在' };

  var allMembers = mapMembers_();
  var patrols = mapPatrols_();
  var allReplies = mapReplies_().filter(function (r) { return r.eventId === eventId; });

  // 應報名成員
  var targets = event.targetMemberIds;
  var targetMembers = allMembers.filter(function (m) { return targets.indexOf(m.id) >= 0; });

  // 分類
  var replied = {};
  allReplies.forEach(function (r) { replied[r.memberId] = r; });
  var registered = [], interested = [], declined = [], unresponded = [];
  targetMembers.forEach(function (m) {
    var r = replied[m.id];
    var patrol = patrols.filter(function (p) { return p.id === m.patrolId; })[0];
    var base = {
      memberId: m.id, name: m.name, ymNumber: m.ymNumber, branchId: m.branchId,
      patrol: patrol ? patrol.name : '無分隊', patrolShort: patrol ? patrol.short : '',
      age: m.age, emergencyContactName: m.emergencyContactName || '',
      emergencyContactPhone: m.emergencyContactPhone || '', paid: r ? r.paid : false
    };
    if (!r) unresponded.push(base);
    else if (r.type === 'registered') registered.push(base);
    else if (r.type === 'interested') interested.push(base);
    else if (r.type === 'declined') declined.push(base);
  });

  return {
    success: true,
    data: {
      event: { eventId: event.id, title: event.title, date: event.date, scope: event.scope, branchId: event.branchId, fee: event.fee },
      registered: registered, interested: interested, declined: declined, unresponded: unresponded,
      summary: {
        totalTarget: targetMembers.length,
        registeredCount: registered.length, interestedCount: interested.length,
        declinedCount: declined.length, unrespondedCount: unresponded.length,
        paidCount: registered.filter(function (r) { return r.paid; }).length
      }
    }
  };
}

// ==================== 系統鎖（1.0 邏輯） ====================

function toggleSystemLock(p) {
  var password = p.password || '';
  var techAccounts = TECH_TEST_ACCOUNTS_;
  // 只允許技術測試帳號或 STAFF_TOKEN 操作
  if (password !== '0728' && password !== getConfigValue_('STAFF_TOKEN')) {
    return { success: false, error: '權限不足' };
  }
  var current = String(getConfigValue_('system_locked') || '').toLowerCase() === 'true';
  setConfigValue_('system_locked', String(!current));
  writeAudit_(p.operatedBy || 'system', 'toggleSystemLock', 'SystemConfig', 'system_locked', !current ? 'locked' : 'unlocked');
  return { success: true, locked: !current };
}

function getSystemStatus() {
  return {
    success: true,
    locked: String(getConfigValue_('system_locked') || '').toLowerCase() === 'true'
  };
}

// ==================== 家長子女自動修復（1.0 邏輯） ====================

function autoRepairParentLinks_() {
  var members = readTable_('Members');
  var users = readTable_('Users');
  var fixed = 0;

  // 方法 1：Members.parentUserId 對應 Users.userId → 同步 childMemberIds（前端自動算）
  // 方法 2：Users 有 childYmNumbers 但 Members.parentUserId 空白 → 用 YMIS 配對
  var parents = users.filter(function (u) {
    return String(getField_(u, 'role')).toLowerCase() === 'parent';
  });

  parents.forEach(function (pu) {
    var childYm = getField_(pu, 'childYmNumbers') || getField_(pu, 'ymNumbers') || '';
    if (!childYm) return;
    var yms = String(childYm).split(/[,、\s]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var parentId = getField_(pu, 'userId');
    members.forEach(function (m) {
      var ym = String(getField_(m, 'ymNumber')).trim();
      if (yms.indexOf(ym) >= 0) {
        var existingParent = getField_(m, 'parentUserId');
        if (!existingParent) {
          updateCellByName_('Members', 'memberId', getField_(m, 'memberId'), 'parentUserId', parentId);
          fixed++;
        }
      }
    });
  });

  return { success: true, fixed: fixed, message: '修復了 ' + fixed + ' 條家長子女連結。' };
}

// ==================== Library Bookmark Update / Delete ====================

function handleUpdateBookmark_(p) {
  var fields = ['title', 'source', 'region', 'circularDate', 'sourceUrl', 'attachmentUrl', 'paymentUrl', 'officialDeadline', 'internalDeadline', 'mode', 'activityType', 'targetText', 'eligibility', 'fee', 'branchTags', 'audienceTags', 'status', 'note', 'convertedEventId'];
  fields.forEach(function (f) {
    if (p[f] !== undefined && p[f] !== null && p[f] !== '') {
      updateCellByName_('LibraryBookmarks', 'bookmarkId', p.bookmarkId, f, p[f]);
    }
  });
  writeAudit_(p.operatedBy || 'system', 'updateBookmark', 'LibraryBookmarks', p.bookmarkId, '');
  return { success: true };
}

// ==================== Meetings ====================

function handleCreateMeeting_(p) {
  var id = uid_('mt');
  appendRowByHeaders_('Meetings', {
    meetingId: id, title: p.title || '', type: p.type || 'agenda',
    date: p.date || '', startTime: p.startTime || '', endTime: p.endTime || '',
    location: p.location || '', targetRoles: p.targetRoles || '',
    branchId: p.branchId || '', url: p.url || '', status: 'draft',
    calendarTag: p.calendarTag || '',
    createdBy: p.operatedBy || '', createdAt: now_(), note: p.note || ''
  });
  writeAudit_(p.operatedBy || 'system', 'createMeeting', 'Meetings', id, p.title || '');
  return { success: true };
}

function handleUpdateMeeting_(p) {
  var fields = ['title', 'type', 'date', 'startTime', 'endTime', 'location', 'targetRoles', 'branchId', 'url', 'status', 'calendarTag', 'note'];
  fields.forEach(function (f) {
    if (p[f] !== undefined && p[f] !== null) {
      updateCellByName_('Meetings', 'meetingId', p.meetingId, f, p[f]);
    }
  });
  writeAudit_(p.operatedBy || 'system', 'updateMeeting', 'Meetings', p.meetingId, '');
  return { success: true };
}

function handleDeleteMeeting_(p) {
  var idx = findRowIndexById_('Meetings', 'meetingId', p.meetingId);
  if (idx < 0) return { success: false, error: '找不到會議' };
  getSheet_('Meetings').deleteRow(idx + 1);
  writeAudit_(p.operatedBy || 'system', 'deleteMeeting', 'Meetings', p.meetingId, '');
  return { success: true };
}

function handlePublishMeeting_(p) {
  updateCellByName_('Meetings', 'meetingId', p.meetingId, 'status', 'published');
  writeAudit_(p.operatedBy || 'system', 'publishMeeting', 'Meetings', p.meetingId, '');
  return { success: true };
}

function handleUpdateUserPermissions_(p) {
  var operatedBy = p.operatedBy || 'system';
  if (TECH_TEST_ACCOUNTS_.indexOf(operatedBy) < 0 && operatedBy !== 'system' && operatedBy !== 'staff_token') {
    var users = mapUsers_();
    var operator = users.filter(function(u){return u.id === operatedBy;})[0];
    var opRole = operator ? operator.role : '';
    if (opRole !== 'admin' && opRole !== 'super_admin' && opRole !== 'troop_super') {
      return { success: false, error: '你沒有權限修改功能授權。' };
    }
  }

  var userId = p.targetUserId;
  var features = parseArray_(p.features);
  
  // Clear existing permissions for this user
  var sh = getSheet_('UserPermissions');
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).trim(); });
  var uidIdx = findColIndex_(headers, 'userId');
  
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][uidIdx]) === userId) {
      sh.deleteRow(i + 1);
    }
  }
  
  // Add new permissions
  features.forEach(function(f) {
    appendRowByHeaders_('UserPermissions', {
      userId: userId, feature: f, granted: 'true',
      grantedBy: p.operatedBy || 'system', grantedAt: now_()
    });
  });
  
  writeAudit_(p.operatedBy || 'system', 'updateUserPermissions', 'Users', userId, features.join(','));
  return { success: true };
}

function handleDeleteBookmark_(p) {
  // Soft delete: set status=archived (can restore from Sheet)
  var hardDelete = p.hardDelete === 'true' || p.hardDelete === true;
  if (hardDelete) {
    var idx = findRowIndexById_('LibraryBookmarks', 'bookmarkId', p.bookmarkId);
    if (idx < 0) return { success: false, error: '找不到通告' };
    getSheet_('LibraryBookmarks').deleteRow(idx + 1);
  } else {
    updateCellByName_('LibraryBookmarks', 'bookmarkId', p.bookmarkId, 'status', 'archived');
  }
  writeAudit_(p.operatedBy || 'system', 'deleteBookmark', 'LibraryBookmarks', p.bookmarkId, hardDelete ? 'hard' : 'soft');
  return { success: true };
}


// ==================== 公開讀取 API（1.0 邏輯） ====================

function getPublicLibraryBookmarks() {
  var bookmarks = mapBookmarks_().filter(function(b) {
    return b.status !== 'archived';
  });
  return { success: true, data: bookmarks, count: bookmarks.length };
}

function getPublicCalendarItems() {
  var events = mapEvents_().filter(function(e) {
    return e.status === 'published' || e.status === 'active';
  });
  var branches = readTable_('Branches').map(function(b) {
    return { id: getField_(b, 'branchId'), name: getField_(b, 'name'), shortName: getField_(b, 'shortName') };
  });
  return { success: true, data: { events: events, branches: branches }, count: events.length };
}

function getTableData(p) {
  var tableName = p.table || p.tableName;
  if (!tableName) return { success: false, error: 'Missing table name' };
  var data = readTable_(tableName);
  return { success: true, data: data, count: data.length };
}

// ==================== 公開 Bootstrap（給未登入頁用） ====================

function getPublicBootstrap() {
  var config = mapConfig_();
  // 只回傳安全的 config
  var safeConfig = {
    TROOP_CODE: config.TROOP_CODE || '',
    TROOP_NAME: config.TROOP_NAME || '',
    REGISTRY_URL: config.REGISTRY_URL || '',
    
  };
  return {
    success: true,
    data: {
      config: safeConfig,
      branches: readTable_('Branches').filter(function (b) { return parseBool_(getField_(b, 'enabled')); }).map(function (b) {
        return { id: getField_(b, 'branchId'), name: getField_(b, 'name') };
      })
    }
  };
}



// ==================== 通用 CRUD（1.0 邏輯） ====================

function genericAddRow(p) {
  var tableName = p.table || p.tableName;
  if (!tableName) return { success: false, error: 'Missing table name' };
  var idColumn = p.idColumn || 'id';
  var idPrefix = p.idPrefix || 'row';
  var fields = {};
  // Copy all params except action/table/idColumn/idPrefix/operatedBy
  for (var k in p) {
    if (['action','table','tableName','idColumn','idPrefix','operatedBy'].indexOf(k) < 0) {
      fields[k] = p[k];
    }
  }
  if (!fields[idColumn]) fields[idColumn] = idPrefix + '_' + Date.now();
  fields.createdAt = now_();
  fields.updatedAt = now_();
  appendRowByHeaders_(tableName, fields);
  writeAudit_(p.operatedBy || 'system', 'addRow', tableName, fields[idColumn], '');
  return { success: true, id: fields[idColumn] };
}

function genericUpdateRow(p) {
  var tableName = p.table || p.tableName;
  var id = p.id;
  var idColumn = p.idColumn || 'id';
  if (!tableName || !id) return { success: false, error: 'Missing table or id' };
  var fields = {};
  for (var k in p) {
    if (['action','table','tableName','id','idColumn','idPrefix','operatedBy'].indexOf(k) < 0) {
      fields[k] = p[k];
    }
  }
  var updated = false;
  for (var columnName in fields) {
    updateCellByName_(tableName, idColumn, id, columnName, fields[columnName]);
    updated = true;
  }
  if (!updated) return { success: false, error: 'No fields to update' };
  updateCellByName_(tableName, idColumn, id, 'updatedAt', now_());
  writeAudit_(p.operatedBy || 'system', 'updateRow', tableName, id, '');
  return { success: true };
}

function genericDeleteRow(p) {
  var tableName = p.table || p.tableName;
  var id = p.id;
  var idColumn = p.idColumn || 'id';
  if (!tableName || !id) return { success: false, error: 'Missing table or id' };
  var idx = findRowIndexById_(tableName, idColumn, id);
  if (idx < 0) return { success: false, error: 'Row not found' };
  getSheet_(tableName).deleteRow(idx + 1);
  writeAudit_(p.operatedBy || 'system', 'deleteRow', tableName, id, '');
  return { success: true };
}



// ==================== 內部通告系統（1.0 邏輯） ====================

function addAnnouncement(p) {
  var id = uid_('ann');
  appendRowByHeaders_('Announcements', {
    announcementId: id,
    senderId: p.operatedBy || '',
    senderName: p.senderName || '',
    title: p.title || '',
    message: p.message || '',
    scope: p.scope || 'branch',
    branchId: p.branchId || '',
    status: 'active',
    createdAt: now_(),
    updatedAt: now_()
  });
  writeAudit_(p.operatedBy || 'system', 'addAnnouncement', 'Announcements', id, p.title || '');
  return { success: true, announcementId: id };
}

function getAnnouncements(p) {
  var userId = p.userId || '';
  var announcements = readTable_('Announcements').filter(function(a) {
    return String(getField_(a, 'status') || '').toLowerCase() !== 'archived';
  });
  // Filter by role/branch
  var users = readTable_('Users');
  var user = users.filter(function(u){return getField_(u,'userId')===userId;})[0];
  if (user) {
    var role = String(getField_(user, 'role')).toLowerCase();
    var branchId = getField_(user, 'branchId') || '';
    if (role !== 'super_admin' && role !== 'troop_super' && role !== 'admin') {
      announcements = announcements.filter(function(a) {
        var scope = String(getField_(a, 'scope')).toLowerCase();
        var aBranch = getField_(a, 'branchId') || '';
        return scope === 'troop' || aBranch === branchId || !aBranch;
      });
    }
  }
  return { success: true, data: announcements, count: announcements.length };
}

function deleteAnnouncement(p) {
  updateCellByName_('Announcements', 'announcementId', p.announcementId, 'status', 'archived');
  writeAudit_(p.operatedBy || 'system', 'deleteAnnouncement', 'Announcements', p.announcementId, '');
  return { success: true };
}

function updateAnnouncement(p) {
  var fields = ['title', 'message', 'scope', 'branchId'];
  var changed = [];
  fields.forEach(function (f) {
    if (p[f] !== undefined && p[f] !== null) {
      updateCellByName_('Announcements', 'announcementId', p.announcementId, f, p[f]);
      changed.push(f);
    }
  });
  if (changed.length === 0) return { success: false, error: '沒有要更新的欄位' };
  updateCellByName_('Announcements', 'announcementId', p.announcementId, 'updatedAt', now_());
  writeAudit_(p.operatedBy || 'system', 'updateAnnouncement', 'Announcements', p.announcementId, changed.join(','));
  return { success: true };
}

// ==================== 最新消息（登入後首頁頂部 BAR，領袖直接新增／刪除，最多 3 條） ====================

function addLatestNews(p) {
  var text = String(p.text || '').trim();
  if (!text) return { success: false, error: '消息內容不可為空。' };
  var news = readTable_('LatestNews');
  if (news.length >= 3) return { success: false, error: '最新消息最多 3 條，請先刪除一條。' };
  var users = mapUsers_();
  var author = users.filter(function (u) { return u.id === (p.operatedBy || ''); })[0];
  var id = uid_('n');
  appendRowByHeaders_('LatestNews', {
    newsId: id, text: text,
    authorUserId: p.operatedBy || '', authorName: author ? author.name : '',
    createdAt: now_()
  });
  writeAudit_(p.operatedBy || 'system', 'addLatestNews', 'LatestNews', id, text);
  return { success: true, latestNews: mapLatestNews_() };
}

function deleteLatestNews(p) {
  var newsId = p.newsId || p.id || '';
  var idx = findRowIndexById_('LatestNews', 'newsId', newsId);
  if (idx < 0) return { success: false, error: '找不到該消息。' };
  getSheet_('LatestNews').deleteRow(idx + 1);
  writeAudit_(p.operatedBy || 'system', 'deleteLatestNews', 'LatestNews', newsId, '');
  return { success: true, latestNews: mapLatestNews_() };
}



// ==================== 維修工具（1.0 邏輯） ====================

function fixApplicationsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Applications') || ss.insertSheet('Applications');
  var correctHeaders = [
    'applicationId', 'type', 'name', 'email', 'role', 'branchId', 'ymNumbers',
    'dateOfBirth', 'gender', 'password', 'status', 'approvedBy', 'createdAt', 'decidedAt', 'note'
  ];
  var data = sheet.getDataRange().getValues();
  var rescued = [];
  var currentHeaders = data.length > 0 ? data[0].map(function(h){return String(h).trim();}) : [];
  for (var i = 1; i < data.length; i++) {
    var hasData = false;
    for (var x = 0; x < data[i].length; x++) { if (data[i][x] !== '' && data[i][x] !== null) { hasData = true; break; } }
    if (!hasData) continue;
    var rowObj = {};
    for (var k = 0; k < currentHeaders.length && k < data[i].length; k++) { if (currentHeaders[k]) rowObj[currentHeaders[k]] = data[i][k]; }
    rescued.push(rowObj);
  }
  sheet.clear();
  sheet.getRange(1, 1, 1, correctHeaders.length).setValues([correctHeaders]);
  for (var r = 0; r < rescued.length; r++) {
    var row = rescued[r];
    var mappedRow = correctHeaders.map(function(h) {
      if (row[h] !== undefined && row[h] !== '') return row[h];
      if (h === 'status') return 'pending';
      if (h === 'createdAt') return now_();
      return '';
    });
    sheet.appendRow(mappedRow);
  }
  return 'Applications 表已修復！搶救了 ' + rescued.length + ' 筆資料。';
}

function fixEventRepliesSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('EventReplies');
  if (!sheet) return 'EventReplies 表不存在';
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){return String(h).trim();});
  var replyIdx = headers.indexOf('replyId');
  var eventIdx = headers.indexOf('eventId');
  var memberIdx = headers.indexOf('memberId');
  if (replyIdx < 0 || eventIdx < 0 || memberIdx < 0) return '缺少必要欄位';
  var fixed = 0;
  for (var i = 1; i < data.length; i++) {
    var replyId = String(data[i][replyIdx] || '');
    var eventId = String(data[i][eventIdx] || '');
    var memberId = String(data[i][memberIdx] || '');
    if (memberId && eventId && replyId !== eventId + '_' + memberId) {
      sheet.getRange(i + 1, replyIdx + 1).setValue(eventId + '_' + memberId);
      fixed++;
    }
  }
  return 'EventReplies 修復完成！修正了 ' + fixed + ' 筆記錄。';
}

// ==================== Sheet 菜單：輔助函數 ====================

/** 執行完整 Setup */
function runFullSetupMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert('確認執行 Setup', '這將會：\n\n'
    + '1. 建立/更新所有必要的表\n'
    + '2. 補齊缺失的欄位\n'
    + '3. 重新格式化及上色\n\n'
    + '確定要繼續嗎？',
    ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  try {
    setupScoutSystem();
    ui.alert('Setup 完成！請查看日誌了解詳細資訊。');
  } catch (e) {
    ui.alert('Setup 失敗：' + e.message);
  }
}

/** 顯示系統版本 */
function showSystemVersion() {
  SpreadsheetApp.getUi().alert(
    '🏕️ 2026 Scout System',
    '版本：' + SCOUTSYSTEM_VERSION + '\n'
    + '更新日期：' + new Date().toLocaleDateString('zh-TW') + '\n'
    + '檔案：SCOUTSYSTEM_2_SETUP.gs',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** 鎖定系統 */
function lockSystemMenu() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert('鎖定系統', '鎖定後，所有用戶（除技術測試帳號外）將無法登入。\n\n確定要鎖定嗎？', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  setConfigValue_('system_locked', 'true');
  writeAudit_('system', 'lockSystem', 'SystemConfig', 'system_locked', 'locked');
  ui.alert('系統已鎖定。只有技術測試帳號可以登入。');
}

/** 解鎖系統 */
function unlockSystemMenu() {
  setConfigValue_('system_locked', 'false');
  writeAudit_('system', 'unlockSystem', 'SystemConfig', 'system_locked', 'unlocked');
  SpreadsheetApp.getUi().alert('系統已解鎖。所有用戶可以正常登入。');
}

/** 測試連線 */
function testConnectionMenu() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var results = [];
  
  // 檢查 Sheets
  var requiredSheets = ['SystemConfig', 'Users', 'Members', 'Branches', 'Patrols', 'Events', 'EventReplies', 'LibraryBookmarks', 'Announcements', 'LatestNews', 'RegularMeetings', 'CancelledMeetings', 'Meetings', 'Notices', 'Plugins', 'PluginSettings', 'UserPermissions', 'AttendanceRecords', 'Equipment', 'EquipmentLoans', 'AuditLogs'];
  var missing = [];
  requiredSheets.forEach(function(name) {
    if (!ss.getSheetByName(name)) missing.push(name);
  });
  
  if (missing.length === 0) {
    results.push('所有必要的表都存在');
  } else {
    results.push('缺少以下表：' + missing.join(', '));
  }
  
  // 檢查 SystemConfig
  var apiKeyHash = getConfigValue_('API_KEY_HASH');
  if (apiKeyHash) {
    results.push('API Key 已設定');
  } else {
    results.push('API Key 未設定');
  }

  var staffToken = getConfigValue_('STAFF_TOKEN');
  if (staffToken) {
    results.push('STAFF_TOKEN 仍存在（建議登入後自動清除）');
  } else {
    results.push('STAFF_TOKEN 已清除');
  }
  
  // 檢查 Drive
  var driveFolderId = getConfigValue_('DRIVE_FOLDER_ID');
  var announceFolderId = getConfigValue_('ANNOUNCEMENT_FOLDER_ID');
  var driveOk = true;
  if (driveFolderId) {
    try {
      DriveApp.getFolderById(driveFolderId);
      results.push('Drive 資料夾可存取');
    } catch (e) {
      results.push('Drive 資料夾無法存取：' + e.message);
      driveOk = false;
    }
  } else {
    results.push('⚠️ DRIVE_FOLDER_ID 未設定（上傳功能將不可用）');
  }
  
  if (announceFolderId) {
    try {
      DriveApp.getFolderById(announceFolderId);
      results.push('公告資料夾可存取');
    } catch (e) {
      results.push('公告資料夾無法存取：' + e.message);
    }
  } else {
    results.push('⚠️ ANNOUNCEMENT_FOLDER_ID 未設定');
  }
  
  ui.alert('系統檢查結果\n\n' + results.join('\n'));
}

/** 小白模式：只顯示基本分頁 */
function simpleModeMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var basicSheets = VISIBLE_SHEETS_FOR_BEGINNERS;
  var allSheets = ss.getSheets();
  var hidden = 0;
  allSheets.forEach(function(sheet) {
    var name = sheet.getName();
    if (basicSheets.indexOf(name) < 0) {
      sheet.hideSheet();
      hidden++;
    }
  });
  SpreadsheetApp.getUi().alert(
    '👁️ 小白模式已啟用',
    '已隱藏 ' + hidden + ' 個進階分頁。\n\n'
    + '只保留以下基本分頁：\n'
    + basicSheets.join('、') + '\n\n'
    + '要恢復所有分頁，請點選「顯示進階分頁」。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** 重設管理員密碼 */
function resetAdminPasswordMenu() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('重設管理員密碼', '請輸入管理員的 email 或 userId：', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var identifier = response.getResponseText().trim();
  if (!identifier) return;
  
  var newPwResponse = ui.prompt('重設管理員密碼', '請輸入新密碼：', ui.ButtonSet.OK_CANCEL);
  if (newPwResponse.getSelectedButton() !== ui.Button.OK) return;
  var newPw = newPwResponse.getResponseText();
  if (!newPw) return;
  
  var usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!usersSheet) {
    ui.alert('Users 表不存在');
    return;
  }
  
  var data = usersSheet.getDataRange().getValues();
  var headers = data[0];
  var emailIdx = headers.indexOf('email');
  var userIdIdx = headers.indexOf('userId');
  var pwIdx = headers.indexOf('password');
  
  if (emailIdx < 0 || userIdIdx < 0 || pwIdx < 0) {
    ui.alert('Users 表缺少必要欄位');
    return;
  }
  
  var found = false;
  for (var i = 1; i < data.length; i++) {
    if (data[i][emailIdx] === identifier || data[i][userIdIdx] === identifier) {
      usersSheet.getRange(i + 1, pwIdx + 1).setValue(newPw);
      found = true;
      break;
    }
  }
  
  if (found) {
    ui.alert('密碼已重設');
  } else {
    ui.alert('找不到此管理員');
  }
}

/** 修復家長子女連結 */
function fixParentChildLinks() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var membersSheet = ss.getSheetByName('Members');
  if (!membersSheet) {
    SpreadsheetApp.getUi().alert('Members 表不存在');
    return;
  }
  
  var data = membersSheet.getDataRange().getValues();
  var headers = data[0];
  var memberIdIdx = headers.indexOf('memberId');
  var parentIdx = headers.indexOf('parentUserId');
  
  if (memberIdIdx < 0 || parentIdx < 0) {
    SpreadsheetApp.getUi().alert('Members 表缺少必要欄位');
    return;
  }
  
  var fixed = 0;
  var parentUserIds = [];
  var usersSheet = ss.getSheetByName('Users');
  if (usersSheet) {
    var usersData = usersSheet.getDataRange().getValues();
    var userHeaders = usersData[0];
    var userIdIdx = userHeaders.indexOf('userId');
    var roleIdx = userHeaders.indexOf('role');
    for (var i = 1; i < usersData.length; i++) {
      if (String(usersData[i][roleIdx] || '').toLowerCase() === 'parent') {
        parentUserIds.push(String(usersData[i][userIdIdx] || ''));
      }
    }
  }
  
  // 清理不存在的 parentUserId
  for (var j = 1; j < data.length; j++) {
    var parentUserId = String(data[j][parentIdx] || '').trim();
    if (parentUserId && parentUserIds.indexOf(parentUserId) < 0) {
      membersSheet.getRange(j + 1, parentIdx + 1).setValue('');
      fixed++;
    }
  }
  
  SpreadsheetApp.getUi().alert(
    '家長子女連結修復完成',
    '已清理 ' + fixed + ' 筆無效的家長連結。\n\n'
    + '家長數量：' + parentUserIds.length,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** 補齊所有表缺失欄位 */
function fixAllMissingColumns() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert('補齊缺失欄位', '這會檢查所有表並補齊缺失的欄位。\n\n確定要繼續嗎？', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = getInitialSheets_();
  var fixed = 0;
  
  Object.keys(sheets).forEach(function(sheetName) {
    var sheetDef = sheets[sheetName];
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    
    var data = sheet.getDataRange().getValues();
    if (data.length === 0) return;
    
    var currentHeaders = data[0].map(function(h) { return String(h).trim(); });
    var missingCols = [];
    
    sheetDef[0].forEach(function(h) {
      if (currentHeaders.indexOf(h) < 0) {
        missingCols.push(h);
      }
    });
    
    if (missingCols.length > 0) {
      var nextCol = currentHeaders.length + 1;
      missingCols.forEach(function(colName, idx) {
        sheet.getRange(1, nextCol + idx).setValue(colName);
      });
      fixed += missingCols.length;
    }
  });
  
  ui.alert('補齊完成！共新增 ' + fixed + ' 個欄位。');
}

/** 同步小隊成員 */
function syncPatrolMembers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var patrolsSheet = ss.getSheetByName('Patrols');
  var membersSheet = ss.getSheetByName('Members');
  
  if (!patrolsSheet || !membersSheet) {
    SpreadsheetApp.getUi().alert('Patrols 或 Members 表不存在');
    return;
  }
  
  var patrolData = patrolsSheet.getDataRange().getValues();
  var patrolHeaders = patrolData[0];
  var patrolIdIdx = patrolHeaders.indexOf('patrolId');
  var membersIdx = patrolHeaders.indexOf('memberIds');
  
  if (patrolIdIdx < 0 || membersIdx < 0) {
    SpreadsheetApp.getUi().alert('Patrols 表缺少 patrolId 或 memberIds 欄位');
    return;
  }
  
  var memberData = membersSheet.getDataRange().getValues();
  var memberHeaders = memberData[0];
  var memberIdIdx = memberHeaders.indexOf('memberId');
  var patrolIdx = memberHeaders.indexOf('patrolId');
  
  if (memberIdIdx < 0 || patrolIdx < 0) {
    SpreadsheetApp.getUi().alert('Members 表缺少 memberId 或 patrolId 欄位');
    return;
  }
  
  var synced = 0;
  for (var i = 1; i < patrolData.length; i++) {
    var patrolId = String(patrolData[i][patrolIdIdx] || '');
    if (!patrolId) continue;
    
    var memberIds = [];
    for (var j = 1; j < memberData.length; j++) {
      if (String(memberData[j][patrolIdx] || '') === patrolId) {
        memberIds.push(String(memberData[j][memberIdIdx] || ''));
      }
    }
    
    patrolsSheet.getRange(i + 1, membersIdx + 1).setValue(memberIds.join(','));
    synced++;
  }
  
  SpreadsheetApp.getUi().alert('同步完成！更新了 ' + synced + ' 個小隊的成員列表。');
}

// ==================== Drive：公告 PDF ====================

function apiListAnnouncementPdfs() {
  var folderInput = getConfigValue_('ANNOUNCEMENT_FOLDER_ID');
  if (!folderInput) return { success: false, error: '未設定 ANNOUNCEMENT_FOLDER_ID' };
  var folderId = folderInput;
  if (folderInput.indexOf('/folders/') >= 0) {
    folderId = folderInput.split('/folders/')[1].split('?')[0].split('&')[0];
  }
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFilesByType(MimeType.PDF);

  // Read existing tags from Announcements sheet
  var existingTags = {};
  readTable_('Announcements').forEach(function(a) {
    existingTags[getField_(a, 'fileId')] = {
      branchTags: getField_(a, 'branchTags') || '全旅',
      audienceTags: getField_(a, 'audienceTags') || '',
      status: getField_(a, 'status') || 'visible',
      note: getField_(a, 'note') || ''
    };
  });

  var out = [];
  while (files.hasNext()) {
    var f = files.next();
    var fid = f.getId();
    // Auto-register new PDFs in Announcements sheet
    if (!existingTags[fid]) {
      appendRowByHeaders_('Announcements', {
        announcementId: uid_('ann'), fileId: fid,
        fileName: f.getName(), fileUrl: f.getUrl(),
        fileSize: Math.round(f.getSize() / 1024) + ' KB',
        branchTags: '全旅', audienceTags: '', status: 'visible',
        updatedAt: now_(), note: ''
      });
    }
    var tags = existingTags[fid] || { branchTags: '全旅', audienceTags: '', status: 'visible', note: '' };
    out.push({
      id: fid, name: f.getName(), url: f.getUrl(),
      updatedAt: Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      size: Math.round(f.getSize() / 1024) + ' KB',
      branchTags: tags.branchTags ? tags.branchTags.split(',').map(function(s){return s.trim();}).filter(Boolean) : ['全旅'],
      audienceTags: tags.audienceTags ? tags.audienceTags.split(',').map(function(s){return s.trim();}).filter(Boolean) : [],
      visible: tags.status !== 'hidden',
      note: tags.note || ''
    });
  }
  out.sort(function (a, b) { return (b.updatedAt||'').localeCompare(a.updatedAt||''); });
  return { success: true, files: out };
}

// Update PDF tags (leader only)
function handleUpdatePdfTags_(p) {
  var fileId = p.fileId;
  var existing = readTable_('Announcements').filter(function(a) { return getField_(a, 'fileId') === fileId; })[0];
  if (existing) {
    var annId = getField_(existing, 'announcementId');
    if (p.branchTags !== undefined) updateCellByName_('Announcements', 'announcementId', annId, 'branchTags', p.branchTags);
    if (p.audienceTags !== undefined) updateCellByName_('Announcements', 'announcementId', annId, 'audienceTags', p.audienceTags);
    if (p.status !== undefined) updateCellByName_('Announcements', 'announcementId', annId, 'status', p.status);
    if (p.note !== undefined) updateCellByName_('Announcements', 'announcementId', annId, 'note', p.note);
    updateCellByName_('Announcements', 'announcementId', annId, 'updatedAt', now_());
  } else {
    appendRowByHeaders_('Announcements', {
      announcementId: uid_('ann'), fileId: fileId,
      fileName: p.fileName || '', fileUrl: p.fileUrl || '',
      branchTags: p.branchTags || '全旅', audienceTags: p.audienceTags || '',
      status: p.status || 'visible', updatedAt: now_(), note: p.note || ''
    });
  }
  writeAudit_(p.operatedBy || 'system', 'updatePdfTags', 'Announcements', fileId, p.status || '');
  return { success: true };
}

// ==================== 簽到／點名（內建核心功能） ====================

function ensureAttendanceSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var headers = ['recordId', 'memberId', 'ymNumber', 'name', 'branchId', 'patrolId', 'date', 'status', 'note', 'sessionType', 'eventId', 'markedBy', 'markedAt'];
  var sh = ss.getSheetByName('AttendanceRecords');
  if (!sh) {
    sh = ss.insertSheet('AttendanceRecords');
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setFontColor('white').setBackground('#5f6368');
    sh.setFrozenRows(1);
    sh.setTabColor(SHEET_COLORS.system);
    try { sh.hideSheet(); } catch (e) {}
    return sh;
  }
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var existing = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h || '').trim(); });
  headers.forEach(function (h) {
    if (existing.indexOf(h) < 0) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
      existing.push(h);
    }
  });
  return sh;
}

function attendanceRecordId_(memberId, date, sessionType, eventId) {
  return String(memberId || '') + '_' + String(date || '') + '_' + String(sessionType || 'meeting') + '_' + (eventId || 'meeting');
}

function resolveAttendanceCaller_(p) {
  var userId = p.operatedBy || p.userId || '';
  if (!userId) return null;
  if (TECH_TEST_ACCOUNTS_.indexOf(userId) >= 0 || userId === 'staff_token') {
    return { userId: userId, role: 'super_admin', branchId: '', memberId: '', childMemberIds: [] };
  }
  var users = mapUsers_();
  var user = users.filter(function (u) { return u.id === userId; })[0];
  if (user) {
    return { userId: user.id, role: user.role, branchId: user.branchId || '', memberId: user.memberId || '', childMemberIds: user.childMemberIds || [] };
  }
  var members = mapMembers_();
  var member = members.filter(function (m) { return m.id === userId; })[0];
  if (member) {
    return { userId: member.id, role: 'member', branchId: member.branchId || '', memberId: member.id, childMemberIds: [] };
  }
  return null;
}

function canMarkAttendance_(caller) {
  if (!caller) return false;
  return ['super_admin', 'troop_super', 'troop_leader', 'admin', 'group_leader', 'branch_leader', 'coach'].indexOf(caller.role) >= 0;
}

function patrolNameById_(patrols, patrolId) {
  var found = patrols.filter(function (p) { return p.id === patrolId; })[0];
  return found ? (found.name || '') : '';
}

function scopedAttendanceBranch_(caller, requestedBranch) {
  if (!caller) return { error: '請先登入' };
  // 旅長／管理員／超管：全旅通行
  if (TROOP_WIDE_ROLES_.indexOf(caller.role) >= 0) return { branchId: requestedBranch || '' };
  // 團長／支部領袖／教練員：只限自己支部，或獲該支部團長授權（scoped grant）
  if (['group_leader', 'branch_leader', 'coach'].indexOf(caller.role) >= 0) {
    var own = caller.branchId || '';
    var target = requestedBranch || own;
    if (!target) return { error: '未設定支部，請聯絡管理員。' };
    // 教練員冇固定支部，一定要有授權
    if (caller.role !== 'coach' && target === own) return { branchId: target };
    var feats = getUserFeatures_(caller.userId, caller.role, target);
    if (feats.indexOf('attendance') >= 0 || feats.indexOf('attendance_all') >= 0) return { branchId: target };
    return { error: '你未獲授權為該支部點名，請由該支部團長授權。' };
  }
  return { error: '只有領袖可以點名' };
}

function handleGetAttendance_(p) {
  ensureAttendanceSheet_();
  var caller = resolveAttendanceCaller_(p);
  var date = fmtDate_(p.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: '請提供正確日期（YYYY-MM-DD）' };
  var sessionType = p.sessionType === 'activity' ? 'activity' : 'meeting';
  var eventId = String(p.eventId || '');
  var scope = scopedAttendanceBranch_(caller, p.branchId || '');
  if (scope.error) return { success: false, error: scope.error };
  var branchId = scope.branchId;
  if (!branchId) return { success: false, error: '請選擇支部' };

  var members = mapMembers_().filter(function (m) {
    if (!m.active) return false;
    return m.branchId === branchId;
  });
  if (sessionType === 'activity' && eventId) {
    var events = mapEvents_();
    var event = events.filter(function (e) { return e.id === eventId; })[0];
    if (event && event.targetMemberIds && event.targetMemberIds.length) {
      members = members.filter(function (m) { return event.targetMemberIds.indexOf(m.id) >= 0; });
    }
  }

  var patrols = mapPatrols_();
  var rows = readTable_('AttendanceRecords').filter(function (r) {
    return fmtDate_(getField_(r, 'date')) === date &&
      String(getField_(r, 'branchId')) === branchId &&
      String(getField_(r, 'sessionType') || 'meeting') === sessionType &&
      String(getField_(r, 'eventId') || '') === eventId;
  });
  var byMember = {};
  rows.forEach(function (r) { byMember[String(getField_(r, 'memberId'))] = r; });

  var roster = members.map(function (m) {
    var rec = byMember[m.id];
    return {
      memberId: m.id,
      ymNumber: m.ymNumber || '',
      name: m.name,
      branchId: m.branchId,
      patrolId: m.patrolId || '',
      patrolName: patrolNameById_(patrols, m.patrolId),
      status: rec ? String(getField_(rec, 'status') || '') : '',
      note: rec ? String(getField_(rec, 'note') || '') : '',
      recordId: rec ? String(getField_(rec, 'recordId') || '') : ''
    };
  });

  var summary = { P: 0, A: 0, L: 0, E: 0, S: 0, blank: 0, total: roster.length };
  roster.forEach(function (item) {
    if (summary[item.status] !== undefined && item.status) summary[item.status]++;
    else summary.blank++;
  });

  return { success: true, date: date, branchId: branchId, sessionType: sessionType, eventId: eventId, roster: roster, summary: summary };
}

function handleSaveAttendance_(p) {
  ensureAttendanceSheet_();
  var caller = resolveAttendanceCaller_(p);
  if (!canMarkAttendance_(caller)) return { success: false, error: '只有領袖或管理員可以儲存點名' };
  var date = fmtDate_(p.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: '請提供正確日期（YYYY-MM-DD）' };
  var sessionType = p.sessionType === 'activity' ? 'activity' : 'meeting';
  var eventId = String(p.eventId || '');
  var scope = scopedAttendanceBranch_(caller, p.branchId || '');
  if (scope.error) return { success: false, error: scope.error };
  var branchId = scope.branchId;
  var records = parseRowsParam_(p.records);
  if (!records.length) return { success: false, error: '沒有可儲存的點名紀錄' };
  if (records.length > 500) return { success: false, error: '一次最多儲存 500 筆' };

  var allowed = { P: 1, A: 1, L: 1, E: 1, S: 1 };

  // ★ 效能：只讀一次整張表 → 喺記憶體改 → 最後一次過寫返。
  //   之前逐筆「findRow + updateCell」會令成個旅團點名讀寫上千次成張表 → 超時卡死。
  var sh = getSheet_('AttendanceRecords');
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h || '').trim(); });
  var colIdx = {};
  headers.forEach(function (h, i) { colIdx[h.toLowerCase()] = i; });

  var neededCols = ['recordId', 'memberId', 'ymNumber', 'name', 'branchId', 'patrolId', 'date', 'status', 'note', 'sessionType', 'eventId', 'markedBy', 'markedAt'];
  var headerChanged = false;
  neededCols.forEach(function (c) {
    if (colIdx[c.toLowerCase()] === undefined) {
      colIdx[c.toLowerCase()] = headers.length;
      headers.push(c);
      headerChanged = true;
    }
  });
  if (headerChanged) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    data[0] = headers;
    for (var ri = 1; ri < data.length; ri++) {
      while (data[ri].length < headers.length) data[ri].push('');
    }
  }

  var ridIdx = colIdx['recordid'];
  var rowIndexById = {};
  for (var i = 1; i < data.length; i++) {
    rowIndexById[String(data[i][ridIdx])] = i;
  }

  function setCell_(rowIdx, colName, value) {
    var c = colIdx[String(colName).toLowerCase()];
    if (c === undefined) return;
    while (data[rowIdx].length <= c) data[rowIdx].push('');
    data[rowIdx][c] = value;
  }

  var saved = 0;
  records.forEach(function (raw) {
    var memberId = String(raw.memberId || '').trim();
    var status = String(raw.status || '').trim().toUpperCase();
    if (!memberId || !allowed[status]) return;
    var recordId = attendanceRecordId_(memberId, date, sessionType, eventId);
    var fields = {
      recordId: recordId,
      memberId: memberId,
      ymNumber: String(raw.ymNumber || ''),
      name: String(raw.name || ''),
      branchId: branchId,
      patrolId: String(raw.patrolId || ''),
      date: date,
      status: status,
      note: String(raw.note || ''),
      sessionType: sessionType,
      eventId: eventId,
      markedBy: caller.userId,
      markedAt: now_()
    };
    var existing = rowIndexById[recordId];
    if (existing !== undefined) {
      Object.keys(fields).forEach(function (k) { setCell_(existing, k, fields[k]); });
    } else {
      var newRow = [];
      for (var x = 0; x < headers.length; x++) newRow.push('');
      Object.keys(fields).forEach(function (k) {
        var c = colIdx[String(k).toLowerCase()];
        if (c !== undefined) newRow[c] = fields[k];
      });
      data.push(newRow);
      rowIndexById[recordId] = data.length - 1;
    }
    saved++;
  });

  if (saved > 0) {
    sh.getRange(1, 1, data.length, headers.length).setValues(data);
  }
  writeAudit_(caller.userId, 'saveAttendance', 'AttendanceRecords', branchId + ' ' + date, 'saved=' + saved + ' type=' + sessionType);
  return { success: true, saved: saved, date: date, branchId: branchId, sessionType: sessionType, eventId: eventId };
}

function handleGetAttendanceMatrix_(p) {
  ensureAttendanceSheet_();
  var caller = resolveAttendanceCaller_(p);
  var scope = scopedAttendanceBranch_(caller, p.branchId || '');
  if (scope.error) return { success: false, error: scope.error };
  var branchId = scope.branchId;
  var sessionType = p.sessionType === 'activity' ? 'activity' : (p.sessionType === 'all' ? 'all' : 'meeting');
  var patrolId = String(p.patrolId || '');
  var from = String(p.from || '');
  var to = String(p.to || '');
  var days = parseInt(p.days, 10);
  if (!days || days < 1) days = 30;
  if (days > 90) days = 90;

  var members = mapMembers_().filter(function (m) {
    if (!m.active) return false;
    if (m.branchId !== branchId) return false;
    if (patrolId && m.patrolId !== patrolId) return false;
    return true;
  });
  var patrols = mapPatrols_();
  var rows = readTable_('AttendanceRecords').filter(function (r) {
    if (String(getField_(r, 'branchId')) !== branchId) return false;
    if (sessionType !== 'all' && String(getField_(r, 'sessionType') || 'meeting') !== sessionType) return false;
    var d = fmtDate_(getField_(r, 'date'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  // 場次欄（date|type|eventId），去重 + 排序（日期昇序，同日先集會後活動）
  var colMap = {};
  var colOrder = [];
  rows.forEach(function (r) {
    var d = fmtDate_(getField_(r, 'date'));
    var type = String(getField_(r, 'sessionType') || 'meeting');
    var evId = String(getField_(r, 'eventId') || '');
    var key = d + '|' + type + '|' + evId;
    if (colMap[key]) return;
    colOrder.push(key);
    colMap[key] = {
      key: key, date: d, sessionType: type, eventId: evId,
      label: d.slice(5) + (sessionType === 'all' ? (type === 'activity' ? ' 活' : ' 集') : '')
    };
  });
  colOrder.sort(function (a, b) {
    var ca = colMap[a], cb = colMap[b];
    if (ca.date === cb.date) return ca.sessionType < cb.sessionType ? -1 : 1;
    return ca.date < cb.date ? -1 : 1;
  });
  var columns = colOrder.map(function (k) { return colMap[k]; });
  if (!from && !to && columns.length > days) columns = columns.slice(columns.length - days);

  var recMap = {};
  rows.forEach(function (r) {
    var d = fmtDate_(getField_(r, 'date'));
    var type = String(getField_(r, 'sessionType') || 'meeting');
    var evId = String(getField_(r, 'eventId') || '');
    recMap[String(getField_(r, 'memberId')) + '|' + d + '|' + type + '|' + evId] = String(getField_(r, 'status') || '');
  });

  var headers = ['YMIS號', '姓名', '支部', '小隊'].concat(columns.map(function (c) { return c.label; }));
  var outRows = members.map(function (m) {
    var obj = {
      'YMIS號': m.ymNumber || '',
      '姓名': m.name || '',
      '支部': m.branchId || '',
      '小隊': patrolNameById_(patrols, m.patrolId)
    };
    columns.forEach(function (c) {
      obj[c.key] = recMap[m.id + '|' + c.date + '|' + c.sessionType + '|' + c.eventId] || '';
    });
    return obj;
  });
  return { success: true, headers: headers, columns: columns, rows: outRows, branchId: branchId, sessionType: sessionType };
}

/** 後補／補改：列出可點名場次（過期／即將的恆常集會日 + 旅團活動），由新至舊 */
function handleGetAttendanceSessions_(p) {
  ensureAttendanceSheet_();
  var caller = resolveAttendanceCaller_(p);
  var scope = scopedAttendanceBranch_(caller, p.branchId || '');
  if (scope.error) return { success: false, error: scope.error };
  var branchId = scope.branchId;
  if (!branchId) return { success: false, error: '請選擇支部' };

  var today = fmtDate_(new Date());
  function weekdayOf_(iso) {
    var parts = String(iso).split('-').map(function (n) { return Number(n); });
    return new Date(parts[0], parts[1] - 1, parts[2]).getDay();
  }

  // ★ 效能：AttendanceRecords 只讀一次，唔好喺 loop 入面重複讀（會卡）
  var attRows = readTable_('AttendanceRecords');

  var meetings = [];
  var seen = {};
  var now = new Date();
  var rules = mapRegularMeetings_().filter(function (r) { return r.enabled && r.branchId === branchId; });
  var cancelledSet = {};
  mapCancelledMeetings_().forEach(function (c) { if (c.branchId === branchId) cancelledSet[fmtDate_(c.date)] = true; });

  rules.forEach(function (rule) {
    for (var i = 0; i < 120; i++) {
      var d = new Date(now); d.setDate(now.getDate() - i);
      if (d.getDay() !== Number(rule.weekday)) continue;
      var iso = fmtDate_(d);
      if (cancelledSet[iso]) continue;
      var key = 'meeting|' + branchId + '|' + iso;
      if (seen[key]) continue;
      seen[key] = true;
      meetings.push({ id: key, date: iso, label: rule.title, time: (rule.startTime || '') + '-' + (rule.endTime || ''), location: rule.location || '', weekday: Number(rule.weekday) });
    }
  });

  // 一次過收集：會議 hasRecords 及 活動 hasRecords
  var meetingRecDates = {};
  var activityRecEventIds = {};
  attRows.forEach(function (r) {
    if (String(getField_(r, 'branchId')) !== branchId) return;
    var type = String(getField_(r, 'sessionType') || 'meeting');
    var d = fmtDate_(getField_(r, 'date'));
    if (type === 'meeting') {
      meetingRecDates[d] = true;
      // 併入已點名但非規律的日期（例如補辦的集會）
      var key = 'meeting|' + branchId + '|' + d;
      if (!seen[key]) {
        seen[key] = true;
        meetings.push({ id: key, date: d, label: '已點名集會', time: '', location: '', weekday: weekdayOf_(d) });
      }
    } else if (type === 'activity') {
      var evId = String(getField_(r, 'eventId') || '');
      if (evId) activityRecEventIds[evId] = true;
    }
  });

  meetings.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  meetings.forEach(function (m) { m.hasRecords = !!meetingRecDates[m.date]; });

  var activities = mapEvents_().filter(function (e) {
    if (e.kind !== 'activity') return false;
    if (e.status !== 'published') return false;
    if (e.scope === 'troop') return true;
    return e.branchId === branchId;
  }).map(function (e) {
    return { id: e.id, date: e.date, label: e.title, location: e.location || '', branchId: e.branchId, scope: e.scope, hasRecords: !!activityRecEventIds[e.id] };
  }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });

  return { success: true, branchId: branchId, today: today, meetings: meetings, activities: activities };
}

function handleGetMemberAttendance_(p) {
  ensureAttendanceSheet_();
  var caller = resolveAttendanceCaller_(p);
  if (!caller) return { success: false, error: '請先登入' };

  var members = mapMembers_();
  var target = null;
  if (p.memberId) target = members.filter(function (m) { return m.id === p.memberId; })[0];
  if (!target && p.ymNumber) target = members.filter(function (m) { return String(m.ymNumber) === String(p.ymNumber); })[0];
  if (!target && p.name) target = members.filter(function (m) { return m.name === p.name; })[0];
  if (!target && caller.role === 'member') target = members.filter(function (m) { return m.id === caller.memberId || m.id === caller.userId; })[0];

  if (!target) return { success: false, error: '找不到該成員' };

  if (caller.role === 'member' && target.id !== caller.memberId && target.id !== caller.userId) {
    return { success: false, error: '只能查看自己的出席紀錄' };
  }
  if (caller.role === 'parent') {
    var allowed = (caller.childMemberIds || []).indexOf(target.id) >= 0 || target.parentUserId === caller.userId;
    if (!allowed) return { success: false, error: '只能查看自己子女的出席紀錄' };
  }
  if (['group_leader', 'branch_leader', 'coach'].indexOf(caller.role) >= 0) {
    var feats = getUserFeatures_(caller.userId, caller.role);
    if (feats.indexOf('attendance_all') < 0 && caller.branchId && target.branchId !== caller.branchId) {
      return { success: false, error: '只能查看自己支部成員的出席紀錄' };
    }
  }

  var patrols = mapPatrols_();
  var dates = {};
  var stats = { P: 0, A: 0, L: 0, E: 0, S: 0, blank: 0, total: 0 };
  readTable_('AttendanceRecords').forEach(function (r) {
    if (String(getField_(r, 'memberId')) !== target.id) return;
    var d = fmtDate_(getField_(r, 'date'));
    var status = String(getField_(r, 'status') || '');
    dates[d] = {
      status: status,
      note: String(getField_(r, 'note') || ''),
      sessionType: String(getField_(r, 'sessionType') || 'meeting'),
      eventId: String(getField_(r, 'eventId') || '')
    };
    if (stats[status] !== undefined && status) stats[status]++;
    else stats.blank++;
    stats.total++;
  });

  return {
    success: true,
    record: {
      memberId: target.id,
      ymNumber: target.ymNumber || '',
      name: target.name,
      branchId: target.branchId,
      patrolId: target.patrolId || '',
      patrolName: patrolNameById_(patrols, target.patrolId),
      dates: dates,
      stats: stats
    }
  };
}

