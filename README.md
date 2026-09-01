# 2026 Scout System UI Prototype

這是旅團管理系統 2.0 的重構版 UI，不覆寫 1.0。

- UI first；後台 Google Sheet / Apps Script 之後以小白模式重建
- 活動 / 通告 / 圖書館 / 行事曆按最新邏輯重整
- 加入元件市場與轉駁中心
- 密碼管理：支持用戶自行修改密碼及 Email 找回密碼
- 收款連結：活動與通告可填寫 FPS/PayPal 連結
- 值日提醒：活動可標記值日小隊，成員可看專屬提示
- 物資借用：物資清單（Equipment）＋借用紀錄（EquipmentLoans）；童軍支部或以上成員及領袖可申請借用，領袖批核後自動扣庫存，歸還後 Tick 已歸還即回補
- 收合界面：控制台同類功能歸類到可收合的大卡（`components/ui/Panel` + `ToolGroup`）；管理員控制台由約 21 個獨立卡減到 7 個區塊
- 插件統一使用 `u` 參數：區=字母碼，旅團=純數字碼

## 本輪：GS Setup 修復 + MOCK 實作進 MAIN（真前後端連線實測）

### 1. GS 檔（`gs/SCOUTSYSTEM_2_SETUP.gs`）Setup 錯誤修復

請把整份 GS 重新貼回 Script Editor，再執行一次 `setupScoutSystem()`（重複執行是安全的，不會覆蓋現有資料）。修復內容：

- **Setup 逐步執行**：每步獨立 try/catch，最後彈窗清楚列出是哪一步失敗（例如「❌ 隱藏進階分頁及保護：…」），不再做到一半靜靜死掉。
- **保護工作表不再炸 Setup**：`protectSensitiveSheets_` 對個人 Gmail（消費版）帳號 `Session.getActiveUser()` 回傳 null 的情況加了防護（此為最常見的「SETUP 時 ERROR」原因）；拿不到身份就只保留 owner。
- **系統鎖修好**：`lockSystemMenu` / `unlockSystemMenu` 之前寫錯欄位（完全無效），現改用 `setConfigValue_('system_locked')` 並寫 Audit；SystemConfig 補回 `system_locked` 預設列。
- **`fixAllMissingColumns` 修好**：之前對 object 用 `forEach`（必爆 TypeError），現改 `Object.keys(...)`。
- **移除 `?.` 語法**（`showSystemVersion`，舊版 Runtime 不支援）及重複的 `case 'updateUserField'`。
- **選單檢查清單更新**：`testConnectionMenu` / `simpleModeMenu` 改用本版實際存在的工作表。

### 2. MOCK 實作進 MAIN：演示旅團行真前後端連線

之前演示模式在瀏覽器內直接模擬回應（`lib/mock.ts` 短路），**沒有真正行網路**。現在：

- 新增 **`lib/mockServer.ts`（內置 MOCK 後台）**：實作與 GS 後台完全相同的 API 合約（`getDashboard` / `getState` 切片 / 登入 / 點名 / 報名統計 / 全部寫入 action），資料會同步到 `.mockdata/mock-state.json`（已 gitignore），dev server 重啟/HMR 不消失；重設資料：`action=resetMock` 或刪除該檔案。
- **`app/api/proxy/route.ts`**：`troopKey=troop_demo`（演示旅團 0088）的請求改由 proxy 轉到內置 MOCK 後台，不需環境變數；真實旅團路徑完全不變。
- **`lib/api.ts`**：移除瀏覽器內 mock 短路 —— 所有請求（包括演示旅團）都經真實 fetch → `/api/proxy` → 後台。這正是「前後端連接實測」：連線、角色過濾、錯誤處理、寫入回整包 state，全部與真實 GS 流程一致。
- **入口更新**：首頁「演示體驗」→ 真實登入頁 `/login` → 進階面板一鍵演示帳號（7 種角色）→ 進入真實頁面（`/admin` `/member` `/parent` `/leader`），TopNav 顯示 🎭 DEMO 標籤。`/dashboard` 舊版靜態預覽樹保留作設計參考，並加了「實測 MAIN」捷徑。
- 連線檢查（登入頁「🩺 連線檢查」）會顯示「內置 MOCK 後台」狀態，與真實旅團的診斷互不混淆。


## 簽到／點名與報名管理分流

- **簽到／點名**：日常／恆常集會及旅團自辦活動，以內建 `/attendance` 頁記錄 P／A／L／E／S 實際出席（不是插件，也不 iframe 外部網站）。
- **報名管理**：旅團自辦及外間活動的參加意願、付款、統計及名單匯出，保留在 `/admin/registrations`。
- 兩者不共用卡片或狀態。旅團自辦活動可先收集報名，活動當日再獨立點名。

完整接入及資料邊界見 [`ATTENDANCE_INTEGRATION.md`](ATTENDANCE_INTEGRATION.md)。

## 平台管理員

新旅團接入、Vercel 環境變數設定、換 Key / 停用旅團,照 [`DEPLOY_ADMIN_GUIDE.md`](DEPLOY_ADMIN_GUIDE.md) 做。
新旅團在 `/onboard` 按「傳送接入資料」後,資料會提交到管理員的接收端(記入管理員 Sheet 並 Email 通知),旅團端看不到管理員 email、也不會從旅團帳號寄信。

## 開發

```bash
npm install
npm run dev
npm run build
```


## 第二輪新增

- `/marketplace` 及 `/connectors` 直接讀取 `https://troop-router.vercel.app/api/registry.json`
- 第 3 級元件按 `units.endpoints` 解析 URL
- 元件開啟統一帶 `u`, `role`, `from`, `embed`
- 後台加入小隊 / 六設定概念：`Patrols` Sheet、支部管理、旅團設定、成員資料及報名統計


## 第三輪補充

- 小童軍、深資童軍、樂行童軍預設沒有分隊
- 幼童軍預設按顏色分隊 / 六
- 童軍預設按動物名稱小隊
- `Patrols` 加入隊長 / 副隊長 / 成員名單欄位（非必填）
- `Members` 加入 `patrolRole`
- Sheep / 0728 定義為技術測試帳號，權限等同最高，但不是超管或旅團管理層身份


## 第四輪補充：小白 Sheet 友好化

`gs/SCOUTSYSTEM_2_SETUP.gs` 已加入：

- `README_新手必看` 工作表
- Tab 顏色分類：README 藍、Config 黃、可改資料綠、Members 淺藍、系統灰、Audit 紅
- 自動凍結表頭、自動調整欄寬
- 在重要欄位加入 note 提示
- 初始化後只顯示小白需要看的分頁：README、SystemConfig、Branches、Patrols、Members
- 隱藏 Roles、FieldSettings、Users、Applications、Events、EventReplies、LibraryBookmarks、Notices、Plugins、AuditLogs
- 上方選單 `2026 Scout System` 可顯示 / 隱藏進階分頁及重新格式化

## 本輪完善：全前端控制 / 批量開戶 / 手機友善

- 使用者管理加入「📥 批量開戶」：可下載 CSV 範本、上傳 CSV / JSON、前端預覽及檢查重複 Email / YMIS，然後批量建立帳號及成員。
- API Proxy 及 Apps Script 後台加入 POST 批量寫入：`batchCreateUsers`、`batchCreateMembers`，避免大型 CSV 受 URL 長度限制。
- 系統設定頁升級為「全前端控制中心」：提供服務鎖定、SystemConfig 編輯、支部/成員/活動/行事曆/元件快速入口。
- 全站加入手機友善樣式：導航可橫向滑動、按鈕觸控高度提升、響應式表格在手機以卡片方式顯示。

## 3.0：API 拆分 + 前端連接

- GS 後台新增 per-page slice API（按需載入）：`getBootstrap` / `getCalendar` / `getActivities` / `getMembers` / `getEvents` / `getNotices` / `getUsers` / `getSettings` / `getAuditLogs` / `getMeetings` / 通用 `getState?keys=...`
- 回傳格式與 `getDashboard` 相同（`{ success, state }`），但 state 只含所請求欄位；角色過濾集中在 `buildDashboardCore_` 一處
- slice 不含 `announcementPdfs` 時跳過 Google Drive 呼叫，回應更快
- 前端各頁改用 `loadStateSlice([...])`（`lib/store.ts`），寫入後仍以 `wrap_` 回傳的整包 state 更新
- 首頁旅團列表改用 `lib/troops.ts` 登記表（修正原先 key 格式與 proxy 不一致）
- 移除引用缺失 `mock-full/` 目錄的 `app/mock-full` 路由（Vercel build fail 原因）
- 全站加「© 2026 Scout System」版權 footer
