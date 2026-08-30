# 2026 Scout System UI Prototype

這是旅團管理系統 2.0 的重構版 UI，不覆寫 1.0。

- UI first；後台 Google Sheet / Apps Script 之後以小白模式重建
- 活動 / 通告 / 圖書館 / 行事曆按最新邏輯重整
- 加入元件市場與轉駁中心
- 密碼管理：支持用戶自行修改密碼及 Email 找回密碼
- 收款連結：活動與通告可填寫 FPS/PayPal 連結
- 值日提醒：活動可標記值日小隊，成員可看專屬提示
- 收合界面：控制台加入收合卡片功能，界面更整潔
- 插件統一使用 `u` 參數：區=字母碼，旅團=純數字碼

## 簽到／點名與報名管理分流

- **簽到／點名**：日常／恆常集會及旅團自辦活動，以內建 `/attendance` 頁記錄 P／A／L／E／S 實際出席（不是插件，也不 iframe 外部網站）。
- **報名管理**：旅團自辦及外間活動的參加意願、付款、統計及名單匯出，保留在 `/admin/registrations`。
- 兩者不共用卡片或狀態。旅團自辦活動可先收集報名，活動當日再獨立點名。

完整接入及資料邊界見 [`ATTENDANCE_INTEGRATION.md`](ATTENDANCE_INTEGRATION.md)。

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
