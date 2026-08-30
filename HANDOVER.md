# Scout System 3.0 — 交接文件

## 項目狀態

### 已完成
1. **前端 UI** — 56 個頁面全部完成（Next.js + Tailwind CSS）
2. **GS 後端** — 單一檔案 `gs/SCOUTSYSTEM_2_SETUP.gs`（3694 行）
3. **隱藏超管** — 固定帳號 sheep / 密碼 0728，寫死在登入邏輯
4. **初始管理員** — Setup 時自動生成隨機帳號密碼（INITIAL_ADMIN_USER / INITIAL_ADMIN_PW）
5. **Sheet 選單** — 完整選單結構（初始設置、安全連線、分頁管理、帳號管理、資料修復）
6. **忘記密碼** — 發送新密碼到用戶登記的 email
7. **系統鎖定** — 可暫停服務，技術帳號仍可登入

### 待完成（下一階段）
1. **API 拆分** — 從單一 `getDashboard()` 改為按需載入的 per-page API
   - `getBootstrap()` — 快速載入身份 + 設定 + 支部
   - `getCalendar()` — 行事曆
   - `getActivities()` — 活動列表
   - `getMembers()` — 成員列表
   - `getEvents()` — 活動詳情
   - 等等...
2. **前端連接 API** — 把 mock data 換成真實 API 呼叫
3. **部署設定** — Git repo + Vercel 部署
4. **測試** — 端到端測試

## 技術棧
- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **後端**: Google Apps Script（單一 GS 檔案）
- **數據**: Google Sheets
- **部署**: Vercel（前端）+ Google Apps Script（後端）

## 重要設定
- **超管帳號**: sheep / 0728（永遠可用，隱藏）
- **初始管理員**: Setup 時自動生成，寫在 SystemConfig 表
- **API Key**: Setup 時自動生成，明文只顯示一次
- **GS 檔案**: `gs/SCOUTSYSTEM_2_SETUP.gs`

## 設計決策
1. **GS 不拆分** — 單一檔案方便複製貼上
2. **所有操作從 Sheet 選單** — 用戶不需要打開 Script Editor
3. **超管完全隱藏** — 不在 Users 表，不在任何彈窗顯示
4. **移動優先** — 底部導航 4 個 tab（行事曆、公告、活動、我的）
5. **按需載入** — 每個頁面獨立 API，不一次載入所有數據

## 檔案結構
```
scoutsystem-3.0/
├── app/                    # Next.js 頁面（56 個）
├── components/             # React 組件
├── lib/                    # 工具函數
├── gs/                     # Google Apps Script 後端
│   └── SCOUTSYSTEM_2_SETUP.gs  # 單一後端檔案
├── public/                 # 靜態資源
├── mock-full/              # Mock 數據（開發用）
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 下一步
1. 解壓 scoutsystem-3.0.zip
2. 建立新 Git repo
3. 推送到 GitHub
4. 連接 Vercel 部署
5. 開新對話，繼續 API 拆分和前端連接
