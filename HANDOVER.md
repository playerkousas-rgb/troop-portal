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

## 2026-08-30 實際 E2E 測試（82 旅 live 環境）

已完成：proxy→GS 連線、login（超管/成員/帳號）、全部 slice（修剪驗證通過）、角色過濾（admin 全量/成員自見/guest 空）、寫入回路（create/publish/update/setReply/togglePaid/delete 全通過）、報名統計、審計日誌。

測試中發現並已在 repo 修復（待 82 旅重新部署 GS 生效）：
1. **🔴 SUPER_ADMIN 角色斷裂** — sheep 登入回傳 userId `SUPER_ADMIN`，但 `buildDashboardCore_` 只在 `TECH_TEST_ACCOUNTS_(['sheep','0728'])` 認技術帳號，導致超管（及 `staff_token`）登入後被當 guest、全頁空白，grantFeature / 批量開戶權限校驗也拒絕。已加內建帳號解析 + `isPrivilegedOperator_`。
2. **🔴 config 洩漏敏感值** — 所有回傳 state 的 `config` 含 `STAFF_TOKEN`、`INITIAL_ADMIN_PW` 明文、`API_KEY_HASH`、`SUPER_ADMIN_HASH`、`SUPER_ADMIN_USER`（未登入也可见）。已加 `publicConfig_()` 集中剝除（敏感 key 表 + 正則兜底）。
3. **🟡 API Key 複製防呆** — 「重新生成 API Key」彈窗字串雙重轉義（`\\\\n` → 顯示成字面 `\n`），選 key 時容易連同前面的 `n` 一起複製（本次實際事故）。已改用真換行 +「雙擊 key」提示；`doGet` 對 `apiKey` 先 `trim` 再比對。
4. **🟡 新旅團接入提交** — `/onboard` 第 6 步由 mailto 改為直接 POST 到管理員的接收端 Apps Script（舊版 Scout Admin APP 的接收端，`AKfycbxj5BDD...`），寫入管理員 Sheet「申請記錄」+ Email 通知。旅團端看不到管理員 email，也不會從旅團帳號寄信（不會留對方寄件紀錄）。接收端通知信箱為 `ADMIN_EMAIL`（目前 playerkousas@hotmail.com，可在接收端腳本改）。
5. 版本號已升 `3.0-live`（部署後 health 可驗證）。
6. 管理員操作手冊：`DEPLOY_ADMIN_GUIDE.md`（開通 / 換 Key / 停用 / 故障對照）。

測試觀察（暫不改）：`calcAge_('')` 回 0 → 無生日成員登入顯示 age:0（18 歲 guard 走 fail-closed，安全）；deleteEvent 不會級聯刪 EventReplies 孤兒行；createMember 與 createEvent 相隔 <1 秒時，活動 targetMemberIds 可能因 Sheets 最終一致性漏掉新成員（正常使用順序不受影響）。

## 2026-08-31 新功能：物資清單與借用流程（參考 member-portal `/stock`）

### Sheet
| 工作表 | 顏色 | 內容 |
|---|---|---|
| `Equipment`（物資清單） | 綠（可改） | `equipmentId, name, category, unit, totalQty, availableQty, location, note, enabled, updatedAt` |
| `EquipmentLoans`（借用紀錄） | 藍（資料） | `loanId, batchRef, equipmentId, equipmentName, unit, qty, memberId, memberName, branchId, purpose, borrowDate, returnDueDate, status, requestedAt, decidedBy, decidedAt, decisionNote, returnedAt, returnedBy, note` |

`status`：pending 待批核 / approved 已批核（未歸還）/ rejected 已拒絕 / returned 已歸還 / cancelled 已取消

### 流程
1. 領袖到 **控制台 → 物資借用管理**（`/admin/equipment`）新增物資、填總數（`availableQty` 自動 = 總數）
2. 成員在 `/equipment` 看**現有物資總覽**（分類、可借／總數），在想借的物資旁填數量，一次填用途＋借還日期遞交
3. 申請後 `status = pending`，**仍未扣庫存**
4. 領袖按「✅ 批准」→ `status = approved` 並**即時扣除 availableQty**
5. 成員歸還後，領袖按「✅ 已歸還（Tick）」→ `status = returned` 並**即時回補 availableQty**

### 借用資格
- 領袖角色（團長／支部領袖／教練員／管理員／超管）一律可借
- 成員限 **童軍支部（b3）、深資童軍（b4）、樂行童軍（b5）**；小童軍／幼童軍由領袖代借
- GS：`EQUIPMENT_BORROW_BRANCHES_ = ['b3','b4','b5']`；前端 `lib/store.ts` 的 `EQUIPMENT_BORROW_BRANCHES`

### API（新增 action）
`getEquipment`（切片）／`createEquipment`／`updateEquipment`／`adjustEquipmentQty`（入庫+／報廢−）／`deleteEquipment`／
`requestEquipmentLoan`／`updateEquipmentLoan`／`cancelEquipmentLoan`／`decideEquipmentLoan`／`returnEquipmentLoan`

- 資料切片：`buildStateSlice_` 支援 `equipment` / `equipmentLoans` 兩個 key
- 角色過濾：管理員全看；領袖看全部物資＋自己支部／自己紀錄；成員看可借物資＋自己紀錄
- 保護：不可重複批核、庫存不足拒批、總數不可少於已借出未還、有未完成紀錄的物資不可刪除

### 前端
- `/admin/equipment`：物資清單 CRUD、入庫／報廢調整、啟用／停用、批核與歸還（含統計卡）
- `/equipment`：物資總覽、多項數量借用申請（一次填表，參考 member-portal）、我的借用紀錄（待批核可改數量／取消）、領袖批核／歸還區
- 入口：控制台功能卡 `equipment`、頂欄選單「📦 借用物資」、成員頁與領袖頁各加一張卡

### 測試
- GS 邏輯（Apps Script 模擬器）：28 項全綠（資格、申請、超量、批核扣庫存、重複批核、歸還回補、拒絕不扣、增減庫存、刪除保護、角色切片）
- 演示模式：19 項全綠（同一條流程走 mock store）

> ⚠️ 旅團要把新版 `gs/SCOUTSYSTEM_2_SETUP.gs` 重新部署後才會有這兩張工作表；
> 首次執行任何物資 action 時 `ensureEquipmentSheets_()` 亦會自動補建（舊部署未重跑 setup 也不會炸）。

## 2026-08-31 修復：超管登入 + 全站配色／字體對比度巡檢

### 1) 超管（sheep / 0728）登入

| 問題 | 處理 |
|---|---|
| 舊版 GS 認得 `SUPER_ADMIN` 登入，但 `buildDashboardCore_` 不認這個 userId → 登入成功卻全頁空白 | 前端登入後改用**實際輸入的帳號（`sheep`）**作為 session userId。`sheep` 在新舊版 GS 都屬 `TECH_TEST_ACCOUNTS_`（最高權限），**不必等 82 旅重新部署 GS 就能用** |
| 複製貼上帶了空白／大小寫 → 密碼永遠不對 | GS `handleLogin_` 對 `sheep` 做 `trim` + 不分大小寫；STAFF_TOKEN 亦先 `trim` 再比對 |
| 瀏覽器停留在演示模式時，輸入 sheep/0728 只會進去 mock 資料 | 登入頁新增黃色警告卡「🎭 正在演示模式：真實帳號（含超級管理員）不會生效」+ 一鍵退出 |
| 未選旅團 | 「請先選擇旅團」文案補充：超管也屬於某個旅團後台 |
| 登入失敗只有一句「登入失敗」 | 新增 `explainError()`：API Key 不符／未設、Apps Script 未公開、網路錯誤各有可執行的修復建議 |
| 無從判斷後台版本 | 新增 `lib/api.ts → apiDiagnose()`；登入頁「🩺 連線檢查」一次顯示：旅團 key、Vercel API Key 是否已設、**GS 版本**（非 3.0-live 會提示重新部署） |
| 已登入但資料全空，畫面看起來像沒登入 | `/admin` 新增紅色警告卡，直接列出重新部署三步 |

同時把 `public/downloads/SCOUTSYSTEM_2_SETUP.gs.txt` 與 `gs/SCOUTSYSTEM_2_SETUP.gs` 同步（之前少了家長開戶連結子女、createUser 等改動，管理員下載到的會是舊版）。

### 2) 配色／字體全面巡檢（對照 WCAG）

以腳本掃描全部 tsx 的 className 與 inline style，套用 Tailwind v4 實際產生的顏色值計算對比度：

- **低對比文字**：`text-slate-400`（白底僅 **2.63:1**）共 66 處 → 全部改 `text-slate-500`（4.77:1）
- **白色字配亮色底**（最嚴重、等於隱形）：
  - `/admin` 控制台身份卡：白字 + 金黃漸層 `#f9ab00→#ffc107` = **1.63:1** → 改 `#7a4f01→#a16207`（4.9:1）
  - 該卡內「個人設定」按鈕：`rgba(255,255,255,.2)` 底 + 白字 = **1.0:1** → 改 `.94` 白底 + 深色字（`/admin`、`/leader`、`/member`、`/parent` 四張卡）
  - `/member` 綠色漸層（3.06:1）、`/leader` 藍色（3.56:1）→ 一併調深至 ≥4.5:1
  - `bg-amber-400/500 + text-white`（1.73 / 2.16:1）→ 小標籤改深字、按鈕改 `amber-700`
  - `bg-emerald-500/600 + text-white`、`bg-rose-500`、`bg-blue-500`、`bg-violet-500`、`bg-brand-500` → 全部升一級（≥4.7:1）
  - 報名管理支部標題用 `#fbc02d`（**1.66:1**）/`#ff9800`（2.16:1）→ `GROUP_DEFS` 新增 `text` 欄位（4.65–9.4:1）
  - 活動管理「💳 已設收款連結」`color: 'gold'`（1.16:1）→ `#b06000`
- **字級過小**：`text-[7px]`×5、`text-[8px]`×39、`text-[9px]`×102、`text-[10px]`×96 → 統一最低 **11px**
- **CSS 層級打架**（改了 Tailwind class 卻沒反應）：legacy 設計系統原本寫在 unlayered，會反過來蓋掉 utilities（`a{color:inherit}`、`label{font-size:13px}`、`input{width:100%}` 等）。已全部收進 `@layer base` / `@layer components`，utilities 現在一定生效。
- **缺樣式的 class**：`.topbar` / `.topbar-inner` / `.brand` / `.nav` / `.collapsible*` / `.plugin-card` / `.tab` / `.attendance-page|rollcall|legend|table` 原本完全沒定義 → 全部補上
- **簽到狀態鈕全變灰色**：`.btn` 寫在 `.att-status-*` 之後，蓋掉了狀態底色 → 補 `.btn.att-status-*` 規則
- **字體**：補齊中文 fallback（`Noto Sans CJK TC` / `Source Han Sans TC` / `PingFang TC` / `Heiti TC`），避免 Android／Linux 出現缺字豆腐
- `.container` 與 Tailwind v4 的 `container` utility 撞名 → 版面改用 `.page-container`

巡檢後剩餘項目皆為 hover 態或已 ≥3.8:1；`npm run build` 全綠。

## 2026-08-30 控制台 UI：把「精簡 + 同類歸類大卡」設計真正接到角色頁

### 問題（為什麼看起來「回舊版」）
新版控制台設計（Tailwind + `DashboardCard` / `SectionHeader`，同類項目收在同一張大卡內）
**只存在於 `app/dashboard/**` 的模擬展示樹**：`app/dashboard/page.tsx` 頂部的
`MY_REGISTRATIONS` / `ACTIVITIES` / `BRANCH_STATS` / `MEETINGS` / `APPROVALS` 全是寫死的假資料。
全站除 `components/layout/BottomNav.tsx`（只在 `/dashboard*` 才顯示）外沒有任何連結通往 `/dashboard`；
`components/layout/TopNav.tsx` 更明確把已登入用戶導向 `/member`、`/parent`、`/admin`、`/calendar`
（註釋原文：「已登入 → 回到該角色的真實控制台（不是 /dashboard 的 mock 展示樹）」）。
所以登入後看到的仍是舊版 `.card` / `.grid` / `FeatureCard` 控制台，管理員頁一次排開約 21 個獨立卡。
（本節即「待完成」第 4 項的根因。）

### 處理：新版設計落到真正的角色控制台

| 頁面 | 舊版 | 新版（實測區塊數） |
|---|---|---|
| `/admin` | 身份卡 + hero 說明卡 + 4 統計卡 + 點名卡 + 14 功能卡 ≈ **21 個獨立卡** | 身份條 + 1 張統計卡 + **5 張分類大卡**（成員與帳號 4 項／活動與報名 4 項／通告與物資 3 項／會議與紀錄 2 項／系統設定 2 項）= **7** |
| `/leader` | 身份卡 + hero + 3 統計卡 + 物資卡 + 6 功能卡 + 點名卡 + 元件區 | 身份條 + 統計卡 + **3 張大卡**（待回覆與出席活動／管理工具 7 項／擴充元件）= **5** |
| `/member` | 身份卡 + hero + 工具卡格 + 2 收合卡 | 身份條 + **4 張大卡**（活動與集會／我的工具 3 項／擴充元件／個人緊急聯絡資料）= **5** |
| `/parent` | 身份卡 + hero + 點名卡 + 每子女一卡 + 家庭資料卡 | 身份條 + 每子女一張大卡 + 我的工具 + 家庭聯絡資料 = **4** |

### 新元件（`components/ui/`）
- `Panel.tsx` — 可收合大卡容器（標題列 = icon + 標題 + 副題 + 數量 + ▼，`aria-expanded` 可測）
- `ToolGroup.tsx` — 同類功能歸類成一張大卡，卡內以小方格排列（`ConsoleTool`）
- `StatStrip.tsx` — 統計數字合併成一張卡（取代舊版每個數字一張 `.summary`）
- `ConsoleHeader.tsx` — 身份條（合併舊版「漸變大卡 + hero 說明卡」兩張卡）
- `EventReplyRow.tsx` — 成員／領袖／家長共用的活動回覆列（沿用 `apiSetReply` 流程，只是換掉 inline style）

### 保留的行為（逐項驗證）
- `loadStateSlice([...])` 的切片 key 完全沒動
- `userFeatures` 權限過濾照舊：無權限的功能不會出現在大卡內（`FEATURE_DEFS` 沒有的 key 自動略過）
- 未成年成員只出 ❤️ 有興趣，`age >= 18` 才出 ✅ / ❌
- 值日小隊提示、活動付款連結、`/admin` 的「GS 版本太舊」紅色警告卡

### 一併修掉的小問題
- `lib/mock.ts` 的 `FEATURES` 漏了 `equipment`（GS `FEATURE_DEFAULTS` 是有的）→ 演示模式下管理員看不到「物資借用管理」卡；已補齊並與 GS 對齊
- 刪除已無人引用的舊控制台元件：`components/Cards.tsx`、`components/Collapsible.tsx`、`components/AttendanceCard.tsx`
- `components/PluginCard.tsx` 樣式跟上新設計（legacy `.card` 塞進新大卡內會格格不入）；iframe 展開／resize 邏輯不變

### 驗證
- `npm run build` 全綠（57 頁）
- 用 jsdom 載入 `next start` 的**真實 client bundle** + 演示模式資料逐頁實測：
  `/admin` 5 張分類大卡（4/4/3/2/2 項）、`/leader` 3 張、`/member` 4 張、`/parent` 3 張，無 console error
- 收合：點大卡標題 `aria-expanded` true → false → true，卡內連結 14 → 10 → 14
- 回覆寫入回路：`/parent` ✅ 已報名 → ❌ 已婉拒、`/member` ⚠️ 尚未回覆 → ❤️ 有興趣，都即時更新
- 已知（非本次改動造成）：`/leader` 領袖本人的出席確認在演示模式下不會變色 —— mock 只回傳「支部成員」的
  replies，而領袖是用 `userId` 當 `memberId` 寫入，被切片過濾掉；對照舊版頁面實測行為相同

## 待完成（下一階段）
1. **82 旅重新部署 GS** — 把本 repo 的 `gs/SCOUTSYSTEM_2_SETUP.gs`（或 `public/downloads/SCOUTSYSTEM_2_SETUP.gs.txt`）貼回 82 旅 Script Editor → Deploy → 管理部署 → 新增版本；部署後用 `?action=health&apiKey=...` 確認 version=3.0-live，並複測超管登入。
   （過渡期：前端已改以 `sheep` 作 userId，未重新部署也能拿到全部資料；但仍建議盡快部署，才有 `publicConfig_` 敏感值剝除等修正）
6. **安全待辦** — 技術測試帳號 `sheep` / `0728` 目前「免密碼」即可登入並取得 `super_admin`（寫死在 GS `handleLogin_`）。建議確認完超管流程後，改成只接受超管密碼或加白名單 IP。
2. **/onboard 第 6 步實測** — 走一次表單提交，確認管理員 Sheet「申請記錄」有新記錄 + 收到通知 email
3. **旅團部署** — 新旅團接入流程（收到自動寄信 → `DEPLOY_ADMIN_GUIDE.md` 五步）
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
