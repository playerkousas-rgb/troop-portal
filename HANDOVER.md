# Scout System 3.0 — 交接文件

## 項目狀態

### 已完成
1. **前端 UI** — 56 個頁面全部完成（Next.js + Tailwind CSS）
2. **GS 後端** — 單一檔案 `gs/SCOUTSYSTEM_2_SETUP.gs`
3. **隱藏超管** — 固定帳號 sheep / 密碼 0728，寫死在登入邏輯
4. **初始管理員** — Setup 時自動生成隨機帳號密碼（INITIAL_ADMIN_USER / INITIAL_ADMIN_PW）
5. **Sheet 選單** — 完整選單結構（初始設置、安全連線、分頁管理、帳號管理、資料修復）
6. **忘記密碼** — 發送新密碼到用戶登記的 email
7. **系統鎖定** — 可暫停服務，技術帳號仍可登入
8. **API 拆分（3.0）**— GS 端新增按需載入的 per-page slice API（見下）
9. **前端連接 API（3.0）**— 25 個真實頁面已改用 `loadStateSlice([...])` 只取所需欄位；首頁旅團列表已改用 `lib/troops.ts` 登記表（修正 key 不一致）
10. **Vercel 建置修復** — 移除 `app/mock-full/page.tsx`（引用未上傳的 `mock-full/` 目錄，是 build fail 元凶）；`npm run build` 全綠
11. **版權標記** — 全站 footer「© 2026 Scout System · 旅團管理系統」+ metadata

### API 拆分說明（3.0 新增）
GS `doGet` 新增以下讀取 action（回傳 `{ success, state }`，state 只含所請求欄位，未請求欄位為空值；角色過濾與 `getDashboard` 完全相同）：

| Action | 回傳切片 | 用途 |
|---|---|---|
| `getBootstrap` | users, config, userFeatures | 快速身份驗證 / 登出後檢查 |
| `getCalendar` | regularMeetings, cancelledMeetings, events, meetings | 行事曆 |
| `getActivities` | events, replies, users, members, bookmarks | 活動列表 |
| `getMembers` | members, patrols, users | 成員管理 |
| `getEvents` | events, replies, members, users | 活動詳情 |
| `getNotices` | bookmarks, announcements, announcementPdfs | 通告 |
| `getUsers` | users, members | 使用者管理 |
| `getSettings` | config, plugins, pluginSettings | 系統設定 |
| `getAuditLogs` | audits | 審計日誌 |
| `getMeetings` | meetings | 會議 |
| `getState?keys=a,b,c` | 任意組合 | 通用切片 |

- 實作：`buildStateSlice_(userId, keys)` → 複用 `buildDashboardCore_(userId, loadPdfs)`（單一角色過濾邏輯源，不會出偏差）
- **效能**：slice 不含 `announcementPdfs` 時完全跳過 Google Drive 呼叫（最貴的一環）
- **前端**：`lib/api.ts` → `apiGetSlice(keys)`；`lib/store.ts` → `loadStateSlice(keys)`
- **寫入不變**：所有 mutate 仍經 `wrap_` 回傳完整 dashboard（前端寫入後直接 setS 即可，不需再讀一次）
- `getDashboard` 保留：寫入後整包重新整理用

### 前端各頁使用的切片
- 行事曆 `/calendar`：users, members, events, regularMeetings, cancelledMeetings, meetings, replies
- 活動 `/activities`：events（公開）；`/member`：patrols, members, plugins, pluginSettings, events, replies
- 家長 `/parent`：users, members, events, replies
- 領袖 `/leader`：events, plugins, pluginSettings, users, applications, bookmarks, replies
- 管理員 `/admin`：users, applications, events, bookmarks（computeStats）
- 成員管理：patrols, users, members；報名管理：patrols, users, members, events, replies
- 通告 `/notices`：bookmarks, announcementPdfs（config 恆附上）
- 其餘（audit / meetings / settings / plugins / users / permissions / branches / library / attendance / profile / troop-settings）：各取所需

## 待完成（下一階段）
1. **端到端測試** — 部署新版 GS 到 82 旅測試環境，逐頁驗證 slice 行為
2. **旅團部署** — 新旅團接入流程（/onboard → 審核 → lib/troops.ts + Vercel env）
3. **GS 版本號** — 部署後建議把 `SCOUTSYSTEM_VERSION` 升到 `3.0-live`
4. **`/dashboard/*` demo 樹** — 仍是內嵌 mock 的展示頁（帶 Demo 角色切換），非真實登入頁；確認不再需要可刪
5. **README 死鏈** — `ATTENDANCE_INTEGRATION.md` 未隨 repo 上傳，README 的連結失效（可補檔或刪連結）

## 技術棧
- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **後端**: Google Apps Script（單一 GS 檔案）
- **數據**: Google Sheets
- **部署**: Vercel（前端）+ Google Apps Script（後端）

## 重要設定
- **超管帳號**: sheep / 0728（永遠可用，隱藏）
- **初始管理員**: Setup 時自動生成，寫在 SystemConfig 表
- **API Key**: Setup 時自動生成，明文只顯示一次
- **GS 檔案**: `gs/SCOUTSYSTEM_2_SETUP.gs`（`public/downloads/SCOUTSYSTEM_2_SETUP.gs.txt` 是其下載副本，改 GS 後要同步）

## 設計決策
1. **GS 不拆分** — 單一檔案方便複製貼上
2. **所有操作從 Sheet 選單** — 用戶不需要打開 Script Editor
3. **超管完全隱藏** — 不在 Users 表，不在任何彈窗顯示
4. **移動優先** — 底部導航 4 個 tab（行事曆、公告、活動、我的）
5. **按需載入** — 每個頁面獨立 API（slice），不一次載入所有數據；角色過濾集中在 `buildDashboardCore_` 一處

## 檔案結構
```
troop-portal/
├── app/                    # Next.js 頁面
│   ├── api/proxy/          # API 代理（API Key 存 Vercel env，前端拿不到）
│   ├── admin/              # 管理員真實頁面（API 驅動）
│   ├── dashboard/          # demo 展示樹（mock + 角色切換，非真實頁）
│   └── ...                 # member / parent / leader / calendar / activities / ...
├── components/             # React 組件
├── lib/                    # 工具函數（api.ts / store.ts / troops.ts / session.ts ...）
├── gs/                     # Google Apps Script 後端
│   └── SCOUTSYSTEM_2_SETUP.gs
├── public/downloads/       # GS 下載副本 + 模板
├── package.json
└── next.config.js
```

## 部署注意事項
- Vercel env：`TROOP_{旅團號}_APIKEY`（例如 `TROOP_0082_APIKEY=ak_...`）
- 旅團登記：`lib/troops.ts` 的 `APPROVED_TROOPS`（key 格式 `troop_XXXX`，需與首頁選擇值一致）
- GS 部署：Deploy → Web App → Execute as Me, **Anyone**
- 已驗證：`npm run build` 通過；GS slice 邏輯有 26 項單元測試全綠（member/leader/parent/admin/guest 各角色過濾 + API key 認證 + Drive 跳過）
