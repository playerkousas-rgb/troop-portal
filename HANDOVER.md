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
1. **🔴 SUPER_ADMIN 角色斷裂** — sheep 登入回傳 userId `SUPER_ADMIN`，但 `buildDashboardCore_` 只在 `TECH_TEST_ACCOUNTS_`（當時係 `['sheep','0728']`）認技術帳號，導致超管（及 `staff_token`）登入後被當 guest、全頁空白，grantFeature / 批量開戶權限校驗也拒絕。已加內建帳號解析 + `isPrivilegedOperator_`。
   （注：`'0728'` 其實係 sheep 嘅**密碼**，唔係帳號名，後來已從 list 移除 —— 見下面「安全待辦」）
2. **🔴 config 洩漏敏感值** — 所有回傳 state 的 `config` 含 `STAFF_TOKEN`、`INITIAL_ADMIN_PW` 明文、`API_KEY_HASH`、`SUPER_ADMIN_HASH`、`SUPER_ADMIN_USER`（未登入也可见）。已加 `publicConfig_()` 集中剝除（敏感 key 表 + 正則兜底）。
   **已實測確認有效**（`node vm` 載入真實 GS，餵一個貼近真實 SystemConfig 嘅 config）：
   7 個 `SENSITIVE_CONFIG_KEYS_`（1056 行）全部被剝除；正則兜底（1063 行）另外擋下
   `FUTURE_SECRET`／`SOME_TOKEN_V2` 呢類未來新增嘅敏感欄位；正常設定（`TROOP_CODE`／
   `PUBLIC_CARDS`／`REGISTRY_URL`）照常保留；`JSON.stringify` 後嘅輸出**冇出現任何一個
   敏感值字串**。合計剝除 9 個 key、保留 6 個。
   ⚠️ 呢個修正喺 GS 端，**未部署到 82 旅之前，線上回傳嘅 config 仍然會洩漏敏感值**。
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

### 底部 4 個快捷 tab 一併接回（同一個根因）
`components/layout/BottomNav.tsx` 由第一個 commit（`11b41c4`）起就是
`if (!pathname?.startsWith('/dashboard')) return null`，4 條連結亦全部指住 `/dashboard/*`，
所以真實控制台永遠睇唔到底部導航。現在：
- 已選旅團或已登入 → 全站顯示（`/`、`/setup`、`/onboard`、`/downloads`、`/troops`、`/updates`、`/marketplace`、`/connectors` 例外）
- 連結改指真實路由：📅 `/calendar`、🎯 `/activities`、📢 `/notices`、👤 `/profile`（未登入則 `/login`）
- `/dashboard/**` 展示樹維持原有 demo 連結，展示頁不受影響
- 頂欄右上本來就已是目標版本：管理員兩個小按鈕（⚙️ `/admin/settings`、🧩 `/admin/plugins`）+ ⋮ 選單（借用物資／我的資料／改密碼／我的控制台／登出），未登入顯示「登入」——未作改動

### 順帶修掉的 hydration mismatch（`/profile`）
`app/profile/page.tsx` 在 render 期直接 `getSession()`：SSR 拿不到 localStorage → 渲染「請先登入」，
client 第一次 render 已有 session → 渲染用戶名，觸發 **React error #425**（文字內容與 SSR 不符）。
改為 `useState + useEffect`（同 `components/Auth.tsx` 做法），載入切片改為 `[session]` 依賴。
實測 `/profile`：admin 顯示「陳堅強／管理員」且姓名、Email 欄位照舊自動填入；member 顯示「張磊磊／成員」；console error 由 2 個變 0。

## 2026-09-02 UI 巡檢修正（用戶看 MOCK 發現嘅 13 項）

用戶對住 MOCK 逐頁睇，提出 13 項問題；因為 MOCK 同真實 UI 共用同一套設計，
真實頁面（`/admin`、`/activities`、`/albums` …）全部一齊改。家長／成員端今次未動。

### 1) 管理中心統一（#1 #4 #5 #6 #9 #11 #13）
| 之前 | 現在 |
|---|---|
| 管理中心底部有一排 4 個小標籤：📊 活動統計・📜 操作紀錄・📝 簽到／點名・📄 通告文件（PDF） | **全部移除**。點名同底部 tab bar 嘅大按鈕重複；通告 PDF 同活動統計都喺「活動管理」入面處理 |
| 操作紀錄只係一個小標籤 | 升級做第 8 個管理項目「🛠️ 系統管理」（`/admin/system`：系統設定・操作紀錄・擴充元件・元件市場・轉駁中心） |
| 團長／支部領袖／教練員用另一個版面 `/leader`（管理工具 + 擴充元件面板） | `/leader` 改做 307 轉址去 `/admin`；所有領袖同管理員共用同一個管理中心版面，只係管理卡按權限多寡顯示 |

管理員一共 **8 個管理項目**（`lib/adminModules.ts` 係唯一對照表）：
支部管理・使用者管理・行事曆管理・出席管理・活動管理・物資管理・會議管理・**系統管理**。
「系統管理」用 `isAdmin(role)` 閘住 —— 團長／支部領袖／教練員永遠見唔到。

實測（`npm run check:modules`，向 MOCK 後台攞真實 userFeatures）：
`u_admin` 8 張卡（含 system）・`u_gl` 7 張（冇 system）・`u_bl` 5 張・`u_coach` 1 張（attendance）。
完全冇管理權限嘅帳號會見到一張「🔒 你目前未獲授權任何管理項目」說明卡，唔會留空白。

### 2) 擴充元件只屬管理員（#8 #10 #12）
`/leader` 嘅「🧩 擴充元件」面板已刪除（隨 `/leader` 併入管理中心一齊消失）。
管理員由右上角「⋯」選單進入：🔌 擴充元件 → 🧩 元件市場 → 🔀 轉駁中心；
右上 ⚙️ 由「系統設定」改指去「系統管理」（`/admin/system`）。
`/admin/plugins` 嘅 `Auth roles` 補回 `troop_leader`（否則旅長撳入去會撞「未獲授權」）。

### 3) 相簿搬離活動（#2）
通告係活動**之前**出現、相片係活動**之後**先有，兩者唔會同時存在，所以：
- `/admin/events`：移除「📷 活動相簿連結」欄位（新增／編輯表單）、活動卡嘅 `AlbumEmbed`、確認彈窗嘅相簿行
- `/albums`：領袖（有 `photos` 權限）而家喺呢一頁揀活動 + 貼連結補相簿，亦可移除；成員／家長照舊只係睇
- 後台唔使改：仍然係 `updateEvent` 嘅 `albumUrl`，GS／MOCK 兩邊都照舊用 `photos` 權限把關

### 4) 全站返回按鈕（#3）
新增 `components/layout/BackButton.tsx`，喺 root layout 嘅 `<main>` 頂部渲染，除首頁外每一頁都有。
行為：本分頁曾經喺 APP 內跳過頁 → `router.back()`；直接開連結入嚟 → 返回自己角色嘅主頁。
（用 sessionStorage 記 APP 內路由次數 —— `document.referrer` 喺 SPA 唔更新、`history.length` 會連外部網站一齊計，都唔可靠。）

### 5) 最新消息一行一條（#7）
`components/LatestNewsBar.tsx`：1 條＝單行（truncate）；2 條以上＝每條一行（bullet + 可換行），
標題顯示「最新消息 · 3 條」。舊版全部塞喺一行做左右捲動，手機上睇唔到第 2、3 條。

### 新增檢查
`npm run check:modules` —— 需要 dev server 運行中；用前端真正嘅 `ADMIN_MODULES` + `hasFeature` +
後台真實 `userFeatures` 驗證每個角色見到嘅管理卡（管理員必須 8 個、非管理員唔可以有系統管理）。

## 2026-09-02 家長／成員端 UI 巡檢（用戶第二輪 9 項）

真實頁同 MOCK（內置 MOCK 後台 ＋ `/dashboard/**` 展示樹）一齊改。

### 1) MOCK 家長：兩名子女不同支部 ＋ 子女表達 ❤️（只改 MOCK 資料）
`lib/mockServer.ts` seed：
- 新增成員 `m14 陳小美`（b2 幼童軍・9 歲・parentUserId=u5）＋ 帳號 `u_m14`
- `u5 王秀蘭` 嘅 `childMemberIds` 由 `['m01']` 改 `['m01','m14']` → 陳大文（b3 童軍・16 歲）＋ 陳小美（b2 幼童軍・9 歲）
- 新增全旅活動 `e08 全旅親子遠足日`（有通告連結／集合地點／費用，兩名子女都係對象）
- 新增回覆：`e08_m14 = interested`、`e03_m14 = interested`（子女表達 ❤️）、`e08_m01 = registered`
- `lib/mock.ts` DEMO_ACCOUNTS：家長說明改為「兩名子女不同支部」，並加咗 `u_m14` 一鍵登入

> ⚠️ MOCK 資料會 persist 去 `.mockdata/mock-state.json`。舊演示資料仲喺度嘅話，
> 新 seed 唔會生效 —— 請 `POST /api/proxy?troopKey=troop_demo&action=resetMock` 或刪除該檔案。

### 2) 右上角「我的控制台」對家長／成員移除（#2 #7 #8）
`components/layout/TopNav.tsx`：家長／成員（底部 tab bar 已經有「🏠 主頁」）唔再顯示
右上嘅 👤 身份chip（title＝我的控制台）同「⋯」選單入面嘅「🏠 我的控制台」。
領袖／管理員照舊（佢哋底部係「🔧 管理中心」，用戶今次未提出要改）。

### 3) 行事曆支部範圍（#3 #4）
新增 `lib/calendarScope.ts`（規則唯一來源）＋ `npm run check:calendar` 檢查腳本。
- 管理員級（管理員／旅長／超管）→ 全部支部
- 家長 → 全旅 ＋ 子女支部；成員／支部領袖／團長／教練員 → 全旅 ＋ 自己支部
- 家長／成員嘅分類 chips 冇「會議」（領袖會議）；支部 chips 只列自己相關嘅幾個
- `/calendar` 月曆＋清單兩邊都用 `scope.inScope()` 過濾活動／恆常集會／會議
- `/dashboard/calendar`（展示樹）同樣處理（Demo 角色各自嘅支部；家長／成員冇「會議」標籤）

實測（`npm run check:calendar`，用真實 `calendarScope` ＋ MOCK 後台資料）：
`u5` 家長 → b2,b3,troop（會議隱藏）・`u_m14` → b2,troop・`u_m4` → b3,troop・
`u_bl` → b3,troop（會議顯示）・`u_gl` → b4,troop（3/5 活動）・`u_admin` → 全部 8 個活動。

### 4) 成年成員（18+）簡化（#5 #6）
- `app/member/page.tsx`：成年成員唔再有「❤️ 有興趣（非報名）」掣（已經可以自己報名，標有興趣冇意思）；
  「我的工具」亦冇「🎖️ 想考的章」（人數少，直接同旅團領袖講）
- `/dashboard/activities`：成員示範撳「18 歲或以上」後同樣冇 ❤️ 掣；區地域總會活動嘅掣
  對成年成員改為「📩 我想參加（自己聯絡領袖報名）」
- `/dashboard/profile`：加「18 歲或以上（成年成員）」切換，成年成員冇「想考的章」分頁；
  家長子女卡嘅快捷回覆移除 ❤️（同真實家長頁一致 —— 有興趣係子女自己表達）

### 5) 活動／集會回覆卡可以睇通告同詳情（#9）
`components/ui/EventReplyRow.tsx`（成員／家長／領袖管理中心共用）加咗可展開嘅
「📄 通告及詳情（集合時間／地點・通告連結）」：日期、集合地點、費用、行事曆標籤、值日小隊、
支部、通告連結（新分頁開啟）、收款連結；冇掛通告會提示「請聯絡旅團領袖」。
`ReplyEvent` type 擴闊咗 `noticeUrl / noticeFileName / calendarTag / dutyPatrol / scope / branchId`
（呼叫端一直傳成個 event，唔使改 caller）。

### 新增檢查
`npm run check:calendar` —— 需要 dev server；用真實 `lib/calendarScope.ts` ＋ MOCK 後台資料
驗證每個角色見到嘅活動／集會支部範圍，同埋家長／成員冇「會議」分類。

## 2026-09-02 新功能：想考的章選單 ＋ 行事曆匯出（用戶第三輪 2 項）

### 1) 🎖️「想考的章」真正可以揀（之前 `/profile?tab=badges` 係死連結）

**目錄 `lib/badges.ts`（新檔）** —— 按總會訓練綱要整理，只開放兩個支部（用戶要求）：

| 支部 | 綱要 | 分類 | 數量 |
|---|---|---|---|
| 幼童軍 b2 | 活動徽章 | 戶外與歷奇／水上活動／運動與體能／科學與科技／藝術與文化／生活技能／安全、服務與世界 | 40 |
| 幼童軍 b2 | 其他徽章 | 童軍先修章 | 1 |
| 童軍 b3 | 專科徽章 | 興趣組 33／技能組 35／服務組 17／教導組 26 | 111 |
| 童軍 b3 | 其他獎章及徽章 | 世界童軍主題章／公民及社會意識章／服務及領導／宗教及銜接／海上活動徽章／航空活動徽章 | 23 |

合共 **175 個章**（id 全部唯一，`cub_*` / `scout_int_*` / `scout_pur_*` / `scout_srv_*` / `scout_ins_*` / `scout_*`）。

- **刻意排除進度性獎章**（幼童軍獎章／歷奇章／高級歷奇章／金紫荊獎章；童軍探索獎章／標準獎章／高級獎章／總領袖獎章）—— 呢啲係必經階梯，唔係「自己揀想考邊個」。
- 已按 **青少年活動署第 13/2026 號通告** 處理：2026-01-01 新增嘅專章已收入；
  **2026-08-15 起取消**嘅 8 個專章已剔除（愛護動物〔興趣組〕、獨木舟國際賽艇、風帆賽艇舵手、
  國際友誼〔技能組〕、營地管理、獨木舟救生、護養〔服務組〕、護養〔教導組〕）。
- 已用腳本逐組比對 `scoutsinfohub.org.hk/scout-training-scheme`（2026-08-23 版）：
  興趣組／技能組／服務組 **完全一致**；教導組該頁仍列「護養」，但總會通告已取消 → 以通告為準（26 個）。
- ⚠️ 總會不時修訂綱要；呢個清單係「方便成員揀」，實際考核要求以總會最新公佈為準。

**新頁 `/badges`** —— 分類摺疊清單＋全選／清除＋搜尋＋底部已揀清單＋確認登記；
家長可撳子女名切換（`?member=`）。非 b2／b3 支部會顯示「暫未設有選單，請直接同領袖講」。

**儲存（新 action `setWantedBadges`，唔入 feature 表＝成員自助）**
- `Members` 加兩欄：`wantedBadges`（`id|id|id`，上限 2000 字元）＋ `wantedBadgesAt`
- GS：`handleSetWantedBadges_`；mock：同名 case；`handleUpdateMember_` 白名單同 member DTO 一齊加欄
- 後端守則（實測過）：只容許 **本人／其家長／管理層＋領袖**；非 b2/b3 成員自助會被拒
- 角色判斷改用共用常數 `MANAGER_ROLES ＋ LEADER_ROLES`（初版手寫清單寫漏 `group_leader`／`branch_leader`，令支部領袖登記唔到 —— 已修）

**入口**：成員主頁工具、家長主頁「想考的章」卡（只列 b2/b3 子女）、`/admin/members` 新增「🎖️ 想考的章」欄。

> ⚠️ 已修 bug：`/badges` 原本寫 `if (!s || !target) return 載入中...`，
> 把「仲喺度載入」同「載入完但冇資料」混為一談。未登入時後台回 0 個 member
> （`buildMockState('')` → role=guest → `out.members = []`），於是永遠轉圈。
> 已拆開兩個分支：`!s` → 載入中；`!target` → 「未能確認你嘅身分」＋登入按鈕。
> （`/member`、`/parent` 冇呢個問題 —— 佢哋只 gate `!s`，之後另有「找不到成員／家長資料」。）
MOCK 展示樹 `app/dashboard/profile` 嘅假章名（世界環保章／社區服務章）已改用真實目錄。

### 2) 📅 行事曆 → 用戶自己嘅行事曆（ICS）

**答案：唔係。** `grep CalendarApp gs/SCOUTSYSTEM_2_SETUP.gs` → **冇任何匹配**。
新增日曆項目只係寫入旅團 Google **Sheet**（`Events`／`RegularMeetings`），
並唔會喺旅團 Google 帳戶嘅 Google Calendar 開活動 —— 所以本來冇「訂閱」可加。

做法：`lib/ics.ts`（新檔）產生標準 RFC 5545 `.ics`。

> **用戶反馈（已跟進）**：「下載 ICS 再匯入比開 APP 睇更麻煩；做不到同步或一鍵加入就沒必要做。」
> 所以由「下載為主」改成 **訂閱為主**（自動同步）：
> - `app/api/ics/route.ts`（新）＝公開訂閱 feed，`GET /api/ics?troopKey=…[&branch=b2,b3]`
> - `components/ui/SubscribeCalendar.tsx`（新）＝「📲 加入我的行事曆（自動同步）」面板：
>   - **➕ 加入 Google 日曆** → `calendar.google.com/calendar/render?cid=<feed>` 一鍵加入＋自動同步
>   - **🍎 Apple 日曆** → `webcal://` 一鍵開 Calendar.app 訂閱
>   - **📧 Outlook／其他** → 複製訂閱網址（貼去「新增日曆 → 從網址訂閱」）
>   - 下載 .ics 降級做摺疊入面嘅後備連結
> - 面板同時掛喺**已登入版**同**公開版** `/calendar`（未登入訪客正正係最想訂閱嘅人）

feed 細節：
- 一次性活動 → `VEVENT`；冇時間＝全日（`VALUE=DATE`，`DTEND` 用次日）
- 恆常集會 → `RRULE`（weekly／biweekly／monthly 第 N 個星期幾），取消日子用 `EXDATE` 排除
- **取消日子按支部分開傳**：初版把全旅取消日子套落每條集會，b3 取消一日會連 b2 集會一齊喺訂閱日曆消失 —— 已修並實測
- 支部名用靜態 `branches` 常量譯（公開 feed 攞唔到 `patrols`，否則會顯示成 `[b2]` 代號）

⚠️ **訂閱 feed 必然係公開嘅**（Google 嘅伺服器唔會帶用戶 cookie 嚟攞），所以內容限定為
「未登入訪客都睇到嘅嘢」＝已公佈活動＋已啟用恆常集會，同 `/calendar` 公開版一致；
PRIVATE 活動、報名名單、聯絡電話一概唔入 feed。

### ★ 訂閱功能跟住「公開瀏覽」開放（用戶要求）

用戶指出：既然訂閱版唔係個人化視圖，就係**旅團要先決定公開咩畀未登入嘅人**，
所以呢個功能應該跟住公開行事曆設定開放。已做兩層：

1. **後台硬閘**（`app/api/ics/route.ts`）：`!publicViewEnabled(config)` → **HTTP 403**
   「此旅團未開放公開行事曆，無法訂閱。」已實測：
   - `PUBLIC_VIEW` 未設定（預設開放）→ 200，13 個 VEVENT
   - `saveConfig PUBLIC_VIEW=FALSE` → **403**
   - 改返 `TRUE` → 200 恢復
2. **畫面跟住鎖**（`app/calendar/page.tsx`）：`publicOn === false` 時唔顯示訂閱掣，
   改成解釋框說明點解＋去邊度開；管理層多一行直達
   `管理中心 → 系統設定 → 🌐 公開瀏覽` 嘅連結，非管理層則提示「可向旅團領袖反映」。
   （公開版 `/calendar` 本身喺 `PUBLIC_VIEW=FALSE` 時早就 return `<PublicLocked>`，唔會見到面板。）
3. **切換時提醒**（`app/admin/settings/page.tsx`）：
   - 「🌐 公開瀏覽」section 加咗一個說明框，白紙黑字寫明呢個開關**同時控制**訂閱功能，
     並列明會公開乜（已公佈活動＋恆常集會：標題／日期／時間／地點／通告連結）、
     唔會公開乜（PRIVATE 活動、報名名單、出席紀錄、成員及家長電話）、
     關閉後已訂閱連結會即刻 403。
   - `togglePublicView()` 嘅確認對話框亦按方向列明後果：
     開 → 「一併開放訂閱／會公開／唔會公開／任何人拿到網址都睇到」；
     關 → 「已訂閱嘅用戶日曆會停止更新」。

### ★★ 三張公開資料卡：卡片開 ≠ 內容開（用戶要求，取代舊「兩層同意」）

用戶最新指示：管理員以**卡片**形式公開 —— 行事曆／相簿／通告 呢三張屬公開資料嘅卡
可以**全開、開 2 個、開 1 個**（互相獨立）。但「卡片開了不等於內容開」：

> 「旅是由管理員決定的，所以卡片開了默認旅活動 相簿 通告公開（但也可以關）
> （但當所有支部+旅都關了=該卡片重新關閉要再由管理員關）」「內容要由支部團長開放」

規則（`lib/publicScope.ts`＝單一真相來源）：

| 層 | 設定 | 邊個控制 | 效果 |
|---|---|---|---|
| 0 | `PUBLIC_VIEW`（既有） | 管理員 | 關 → 乜都唔公開，feed 403，訂閱掣唔顯示 |
| 1 | `PUBLIC_CARDS`（csv：`calendar,albums,notices`） | **管理員** | 三張卡獨立開關 |
| 2 | `PUBLIC_SCOPE_<CARD>`（csv：`troop` + `b1..b5`） | `troop`＝管理員；支部＝**該支部團長** | 只有列出嘅範圍先公開 |

- **開卡即預設公開全旅內容**：`toggleCard()` 喺 scope 清單為空時會自動加入 `troop`；
  關卡**保留** scope（重開唔使重新設定）。
- **seed 預設值**（GS `SystemConfig` ＋ mock 一致）：`PUBLIC_CARDS='calendar,notices'`、
  三張卡嘅 `PUBLIC_SCOPE_*` 全部 `'troop'`。
  ⚠️ 呢個值**唔可以 seed 做空字串** —— 82 旅嘅 `SystemConfig` 而家冇 `PUBLIC_CARDS` 呢個 key，
  部署新 GS 時 backfill 會 append seed 值；若 seed 空 → 三張卡全關 →
  佢哋而家運作緊嘅公開行事曆／通告會喺部署嗰一刻靜靜地熄咗（`/api/ics` 亦會 403）。
  seed `calendar,notices` ＝ 保留舊版公開瀏覽嘅實際行為（舊版訪客本來就睇唔到相簿，所以相簿卡預設關）。
- **`cardEffective()` = 卡開 ＋ 至少一個 scope**。全部範圍關晒 → 卡片等於重新關閉，
  要再由管理員開返（用戶明確要求）。
- `isItemPublic(config, card, branchId)` 一次過檢查三層；branchId 空值／`troop` ⇒ `troop` scope。

**寫入權限**（新 action `setPublicCard` / `setPublicScope`，handler 自己檢查）：
- 管理層（super_admin／troop_leader／admin）→ 可改任何卡、任何 scope
- `troop`（全旅內容）→ **只准管理層**
- 支部 scope → **只准該支部**嘅 group_leader／branch_leader／coach

**實測**（`.mockdata` 乾淨狀態，`/api/ics` 行事曆卡）：
- seed `calendar` + `troop,b2,b3` → 200，**7** VEVENT（全旅 2／幼童軍 2／童軍 3）
- 關 `troop` → 200，**5**（全旅 0）
- 三個 scope 全關 → **403**（cardEffective=false）
- 開返 `b2` → 200，**2**（幼童軍 2）
- 關閉成張卡 → **403**；重開 → 200 且 scope 保留
- 權限 12 個 case 全對：`u_gl3`/`u_bl` 改卡被拒；`u_bl`(b3) 改 `troop` 被拒、改 b3 通過、改 b2 被拒；
  家長 `u5` 一律被拒
- 相簿卡／通告卡同樣實測：`troop` → 0 個相簿（唯一相簿係 b3）；`b3` → 1 個；
  通告 `troop` → 只睇到全旅通告，加 `b3` → 多咗「營地安全指引.pdf[童軍]」（證明「童軍」→b3 對映正確）；
  全關 → 0 份

**UI**：
- `app/admin/settings` 新增「🗂️ 公開資料卡片」section：三張 `BigSwitch`（行事曆／相簿／通告）
  ＋每張卡顯示「已公開範圍」；確認對話框列明預設範圍／各支部／後果。`PUBLIC_VIEW` 關咗時顯示黃色提示。
- `app/admin/calendar`「🌐 公開行事曆範圍」：管理層見到「🏕️ 全旅內容」掣＋所有支部；
  支部領袖只見到自己支部，並提示「全旅內容由管理層決定」。
- 訪客 gating：`/calendar`＋`/api/ics` 用 `isItemPublic(…,'calendar',…)`；
  `/albums` 用 `'albums'`（訪客喺卡未開時顯示 `<PublicLocked>`）；
  `/notices` 用 `'notices'`（通告嘅 `branchTags` 存顯示名，經 `tagToScope()` 譯返 branchId）。
- 訂閱掣跟 `publicViewEnabled() && cardEffective(config,'calendar')`。
- **內容範圍掣已抽成共用組件** `components/ui/PublicScopePanel.tsx`（三張卡共用，逐卡文案），
  掛喺 `/admin/calendar`（行事曆）、`/albums`（相簿）、`/notices`（通告）——
  管理層見到「全旅內容」＋所有支部，支部領袖只見自己支部。
  （之前只有行事曆有掣，後端三張卡都支援，團長實際上冇地方開自己支部嘅相簿／通告。）

**檢查**：`npm run check:public` —— **唔需要 dev server**，直接 import 前後端共用嘅
`lib/publicScope.ts` 逐條規則斷言（48 項）：三張卡獨立、開卡默認公開全旅、關卡保留 scope、
範圍全關⇒卡片等於未開、`isItemPublic` 三層、權限分層。
（經 `scripts/node-ts-resolve.mjs` 補 `.ts` 副檔名，先至可以 import 有 relative import 嘅 .ts ——
其餘 check 腳本 import 嘅都係 leaf 模組所以唔使。）

⚠️ **要正式部署先至用得**：訂閱要 Google／Apple 嘅伺服器搵到個 URL。
live preview 嘅 sandbox 網址對外攞唔到，所以一鍵加入喺 preview 度实测唔到；部署上 Vercel 之後先得。

## 待完成（下一階段）
1. **82 旅重新部署 GS** — 把本 repo 的 `gs/SCOUTSYSTEM_2_SETUP.gs`（或 `public/downloads/SCOUTSYSTEM_2_SETUP.gs.txt`）貼回 82 旅 Script Editor → Deploy → 管理部署 → 新增版本；部署後用 `?action=health&apiKey=...` 確認 version=3.0-live，並複測超管登入。
   （過渡期：前端已改以 `sheep` 作 userId，未重新部署也能拿到全部資料；但仍建議盡快部署，才有 `publicConfig_` 敏感值剝除等修正）
6. ~~**安全待辦**~~ — ✅ **已修**（三處：問題 A／問題 B／提權洞）。
   ⚠️ 三處**全部都係 GS 端改動，未部署到 82 旅之前一律無效** —— 見上面第 1 項。
   回歸保護：`npm run check:security`（67 項斷言，執行真實代碼；負向對照已驗證有效）。

   **問題 A：技術測試帳號分支冇驗證密碼。**
   `handleLogin_` 嘅「技術測試帳號」分支只比對帳號名
   （`TECH_TEST_ACCOUNTS_.indexOf(identifier) >= 0`）就回 `super_admin`。
   實際 fall-through 路徑已逐行確認：`sheep` + 錯密碼 →
   「隱藏超管」分支（sha256 密碼比對）唔 match 所以唔 return →
   STAFF_TOKEN 分支因 `loginType`／`identifier` 唔啱而整個 block skip（連 2331 嘅 return 都唔執行）→
   落到技術測試帳號分支 → 直接取得 `super_admin`。
   修正：該分支加 `sha256_(String(password).trim()) !== sha256_('0728')` → 回「帳號或密碼不正確」。

   **問題 B：`'0728'` 被當成帳號名（用戶指出：0728 係密碼，唔係帳號）。**
   `TECH_TEST_ACCOUNTS_` 原本係 `['sheep', '0728']`，令到：
   ・用 `0728` 做**帳號名**登入可以取得 super_admin（而且完全免密碼）
   ・`isPrivilegedOperator_('0728')` → true
   ・`resolveAttendanceCaller_({operatedBy:'0728'})` → 自動 super_admin
   ・批量開戶嘅 `troop_super` 降級判斷把 `0728` 當特權操作者
   修正：`TECH_TEST_ACCOUNTS_ = ['sheep']`（只有一個超管帳號）。
   `sheep` 必須保留 —— `app/login/page.tsx` 會把帳號正規化成 `'sheep'` 做 session userId。
   （另：`toggleSystemLock` 第 3749 行嘅 `var techAccounts` 係死變數，声明後從未使用。）

   **實測**（用 `node vm` 載入**真實 `gs/SCOUTSYSTEM_2_SETUP.gs`**，只 stub Apps Script 嘅
   `Utilities`／`ContentService`／`getSheet_`，17 項全過）：
   ・`TECH_TEST_ACCOUNTS_` === `['sheep']`，唔含 `'0728'` ✅
   ・`sheep`+正確密碼 → `SUPER_ADMIN` ✅｜`sheep`+錯密碼／冇密碼 → 拒絕 ✅
   ・`SHEEP` 大寫、前後空白容錯保留 ✅
   ・帳號名 `0728`（有密碼／冇密碼）→ 一律拒絕，唔再係 super_admin ✅
   ・`isPrivilegedOperator_`：sheep／SUPER_ADMIN／staff_token 仍 true，`0728` → false ✅
   ・`resolveAttendanceCaller_`：sheep → super_admin，`0728` → null ✅

   **超管 dashboard 全鏈路另測**（`buildDashboardCore_`，12 項全過）——
   呢個係部署後最大風險位（認唔到超管 → 全頁空白）：
   ・`app/login/page.tsx` 第 112–114 行：超管嘅 session userId 係 **`sheep`**（唔係 `SUPER_ADMIN`），
     所以 `buildDashboardCore_` 必須靠 `TECH_TEST_ACCOUNTS_` 先認到 —— 保留 `sheep` 係必要嘅。
   ・`sheep` 同 `SUPER_ADMIN` 都拿到 **16 個 userFeatures**（兩者一致）✅｜`staff_token` 亦有 ✅
   ・`0728` 同未知 userId → **0 個 feature**（特權已收緊）✅
   ・端到端：`sheep`+`0728` 登入 → 前端計出 `sessionUserId='sheep'` → dashboard 有全套 feature ✅
   ・`sheep`+錯密碼喺 login 就被擋，到唔到 dashboard ✅
   ※ 注意 `buildDashboardCore_` 回傳嘅係 `state`（patrols／users／userFeatures…），**冇 `user` 欄位**；
     判別 role 要用 `state.userFeatures`，唔好假設有 `state.user.role`。

   ⚠️ 呢個測試行嘅係 repo 入面嘅 `.gs` 原始碼，**未部署到 82 旅**；
   部署後請親自複測：`sheep`+`0728` 應該照入到，`sheep`+亂噏密碼應該被拒。

   **⚠️ 陷阱：MOCK 後台嘅免密碼登入係設計如此，千祈唔好「順手修」。**
   `lib/mockServer.ts` 嘅 `handleMockLogin`（513–535 行）完全冇讀 `p.password`，
   demo 帳號用咩密碼都入到。呢個**唔係**上面嗰個洞：
   ・範圍只限演示旅團 —— `app/api/proxy/route.ts` 第 44 行：只有 `troopKey === DEMO_TROOP_KEY`
     （`troop_demo`）先行 MOCK；真實旅團一律 `fetch` 去 Apps Script（161／192 行）。
   ・demo 帳號**根本冇 password 欄位**（seed 只有 id／name／email／role／approved），冇嘢可驗證。
   ・`app/login/page.tsx` 第 55 行嘅 demo 快捷按鈕本身就傳 `password: ''` —— 加密碼檢查會直接搞壞佢。
   ・`lib/mock.ts` 第 22–28 行 `isMockMode()` 要 localStorage 開關 **且** 目前選中嘅係 `troop_demo`
     先成立，註解寫明係為咗避免把真旅團誤當 MOCK。

   **✅ 已處理：演示旅團唔再設超管帳戶（用戶指示「demo 也不應該存在超管這一帳戶的，只有管理員」）。**
   原本 seed 有個 `u_super`（`role: 'super_admin'`），任何人對住 `troop_demo` 都攞到
   `super_admin` session。已拆走，demo 最高只到「管理員」：
   ・`lib/mockServer.ts` seed 刪走 `u_super`（並加註解講明點解刻意唔設）
   ・`app/dashboard/page.tsx`／`app/dashboard/profile/page.tsx` 嘅 `Role` union、
     `ROLE_LABEL`（原標籤「技術測試」）、`isManager`／`isLeader` 一併清走 `super_admin`
     （呢兩頁嘅角色切換清單本來就冇包佢，預設分別係 `admin`／`member`）
   ・`super_admin` **作為角色**仍保留喺 mock 嘅 role list（`ROLE_FEATURES`／`TROOP_WIDE` 等）
     同 `check-public-cards.mjs` —— 真實旅團 GS 仍然有超管角色，拆嘅只係 demo 帳戶。
   實測（live HTTP，`.mockdata` 已重設）：`u_super` ✘、舊 email `sheep@demo.scout` ✘
   （兩者皆回「找不到此帳號」）；`DEMO_ACCOUNTS` 8 個快捷帳號 8/8 照常登入
   （u_m1／u_m14／u_m4 member、u5 parent、u_bl branch_leader、u_coach coach、
   u_gl group_leader、u_admin admin）。
   `troop_demo` 仍然冇 env 開關、恆常可選 —— 用戶揀咗保持現狀，而家最高只係 admin，
   而且攞到嘅係 seed 假資料，碰唔到真實旅團數據。

   **✅ 已修：提權洞 —— 後端冇限制「目標角色」，可造出第二個超管。**
   用戶要求「應該只有 1 個超管 account」。前端 `assignableRoles()` 確實唔會提供
   `super_admin`（`lib/permissions.ts` 93–98 行，連 `super_admin` 自己都得 `troop_super` 做頂），
   但**前端守衛唔等於後端守衛**：`operatedBy` 係前端傳上嚟嘅，request 可以自己砌。
   用 `node vm` 載入真實 GS 實測，確認三條提權路全部暢通：
   ・`updateUserRole` → 授權層 `checkActionPermission_` 回 `null`（放行），
     `handleUpdateUserRole_` 真的寫入 `role=super_admin`
   ・`updateUserField`（萬用寫入）→ `field='role', value='super_admin'` 同樣寫入成功
   ・`applyJoin`（**公開表單，唔使登入**）→ 申請人自填 `role=super_admin`，
     管理員一經 `decideApplication` 批核（2656 行讀申請人 role → 2651 行直接建帳號）
     就誕生第二個超管
   根因：`ACTION_REQUIRED_FEATURE_` 只驗操作者**有冇 `users` feature**（註解自己都寫住
   「最高危：可提權」），完全冇驗**目標角色係咪佢權限範圍內**。

   修法（`super_admin` 係硬編碼嘅系統帳號，全系統只應該有一個，所以一律唔准經 API 指派）：
   ・GS 新增 `RESERVED_ROLES_`／`isReservedRole_`／`requestedRole_`（1765–1780 行）
   ・**中央守衛**放喺 `checkActionPermission_` 最前面（1785 行）—— 喺**所有身份豁免之前**，
     連 `sheep` 都唔可以經 API 造第二個超管；dispatch 1853–1854 行會 early-return
   ・`applyJoin`（2554 行）靜默降級為 `parent` 並留審計。**刻意排除**喺中央守衛之外
     （`action !== 'applyJoin'`）：佢係匿名可調嘅公開端點，對匿名訪客回一個講明
     「super_admin 係系統內建帳號」嘅錯誤等於白白洩露內部角色名
   ・`decideApplication`（2668 行）第二道守衛：就算 Applications 表被直接植入
     `super_admin`（繞過 applyJoin），批核時都會降級並留審計
   ・`lib/mockServer.ts` 鏡像同一套守衛（`RESERVED_ROLES`／`isReservedRole`／`requestedRole`
     ＋ dispatch 最前面嘅中央守衛＋ `applyJoin` 例外），保持 MOCK mirror 現實
   ・`batchCreateUsers` **本身已經安全**，唔使改：`allowedRoles`（GS 3285 行）唔包
     `super_admin`，3298 行會將白名單以外嘅角色降級為 `parent`

   實測（全部行**真實 `doGet` dispatch**，唔係直接調 handler）：
   ・GS 端到端 8/8 ✅：三條 API 路全擋（錯誤訊息「「超級管理員」係系統內建帳號，
     不能經介面指派或建立。」）；`sheep` 都被擋；對照組 `role=branch_leader`
     同 `field=name` 照常放行且有寫入
   ・GS 第三條路 8/8 ✅：`applyJoin(role=super_admin)` → `success:true` 且存入
     Applications 嘅 role 已降級為 `parent`；Applications 表被直接植入 `super_admin`
     再批核 → 新帳號 role 仍係 `parent`；正常申請（`role=parent`）全程冇受影響
   ・MOCK live HTTP 6/6 ✅：三條路全擋、`applyJoin` 靜默降級（存入 `parent`，
     回應訊息冇出現 `super_admin` 字樣）、兩個對照組正常

   ⚠️ 陷阱（我自己踩过）：**直接調 `handleXxx_` 測試會繞過 `checkActionPermission_`**，
   睇落似「守衛冇效」。要驗證守衛就必須經 `doGet`／`handleMockRequest` 呢層 dispatch。
   另外 stub `getConfigValue_('API_KEY_HASH')` 時，`sha256_` 回傳嘅係**小寫** hex
   （GS 148 行 `toString(16)`），用 `.toUpperCase()` 會令所有請求死喺 API key 檢查，
   然後所有「應該被擋」嘅斷言假陽性通過 —— 呢種測試比冇測試更危險。

   **回歸保護：`npm run check:security`（第 6 個 check，唔需要 dev server）。**
   `scripts/check-reserved-roles.mjs`，67 項斷言，**執行真實代碼**而唔係 grep 原始碼：
   GS 用 `node:vm` 載入 `.gs` 經**真實 `doGet` dispatch** 打；MOCK 直接 import
   `lib/mockServer.ts` 嘅 `handleMockRequest`。覆蓋三條提權路＋對照組＋
   `applyJoin` 靜默降級＋`decideApplication` 第二道守衛＋`batchCreateUsers` 白名單
   ＋結構檢查（守衛必須喺 `isPrivilegedOperator_` 豁免之前）＋授權路越權審計。

   **同類 bug 審計：另外兩條授權路已確認冇同一個洞（並已鎖定做回歸測試）。**
   `checkActionPermission_` 嘅結構性弱點係「只驗操作者有冇某個 feature，
   唔驗佢批出嚟嘅嘢有冇超出自己權限」—— `updateUserRole` 就係咁中伏。
   逐一審計同類嘅寫入路：
   ・`grantFeature`（1586 行）✅ **已有雙重守衛**：1603 行唔准授權自己支部以外；
     1609 行唔准授出自己都冇嘅功能（`OPT_IN_FEATURES_` 例外，且限團長／支部領袖）。
     實測：b3 支部領袖授權去 b2 ✘、授出 `users` ✘、喺 b3 授出 `attendance` ✅
   ・`updateUserPermissions`（3909 行）✅ **限管理層**：3915 行只准
     `admin`／`super_admin`／`troop_super`，支部領袖同團長一律被拒（實測確認）
   ・`batchCreateUsers`（3285 行）✅ `allowedRoles` 白名單唔包 `super_admin`，
     3298 行會將白名單以外嘅角色降級為 `parent`
   ・**負向對照已做（三次）**：暫時停用 GS 中央守衛 → 7 項失敗；停用 MOCK 守衛
     → 5 項失敗；放鬆 `grantFeature` 支部守衛 → 2 項失敗。
     證明呢個 check 真係捉到回歸，唔係裝飾。（做完記得還原並 `rm -rf .mockdata`。）
   ・**hermetic**：MOCK 嘅 store 會由 `.mockdata` 載入持久狀態，所以用「基線快照」
     比對，只斷言今次攻擊嘗試冇**新增** super_admin，唔好斷言成個 store 乾淨
     （否則環境殘留會令佢假失敗）。連跑 3 次結果一致。
   ・順帶修咗 `lib/mockServer.ts` 嘅 import：`PublicCardId` 係純 type，
     要拆做 `import type` —— Node 嘅 `--experimental-strip-types` 唔會自動 elide
     混喺 value import 入面嘅 type（Next/webpack 會，所以之前冇爆）。
   ・負向對照會污染 `.mockdata`（停用守衛時 `createUser` 真的成功寫入 super_admin），
     做完記得 `rm -rf .mockdata`。

   **✅ 已修（2026-09-03）：角色階梯提權洞 —— `RESERVED_ROLES_` 只封咗最高嗰個。**
   上面嘅修法只擋 `super_admin`。但同一個結構性弱點仲有大半個身位：
   `admin` 一样可以砌 request 把別人升做 `troop_super`／`troop_leader` ——
   即係**造出比自己更高權限嘅帳號**。`lib/permissions.ts:95`
   `assignableRoles('admin')` 明確唔包含呢兩個角色，但後端完全冇 enforce。

   實測證明（經真實 `doGet` dispatch，修復前）：
   ・`admin` → `troop_super` ⚠️ **寫入咗**
   ・`admin` → `troop_leader` ⚠️ **寫入咗**
   ・`admin` → `admin` ✅ 寫入（**刻意容許**，見下）
   ・對照 `super_admin` ✅ 被既有守衛擋

   修法：
   ・GS 新增 `ABOVE_ADMIN_ROLES_ = ['troop_super','troop_leader']` ＋ `isAboveAdminRole_`
   ・階梯守衛放喺 `checkActionPermission_` **查到操作者角色之後**（因為要知道操作者
     自己係咩角色）：`wantedRole && isAboveAdminRole_(wantedRole) && role !== 'troop_super'`
     → 拒絕，錯誤「權限不足：只有超管可以指派「超管」或「旅長」。」，寫 `DENIED:<action>`
   ・`troop_super` 可以指派 `troop_leader`（同 `assignableRoles` 一致）；系統內建帳號
     已經喺上面 `isPrivilegedOperator_` 放行咗
   ・`lib/mockServer.ts` 鏡像同一套（`ABOVE_ADMIN_ROLES`／`isAboveAdminRole`＋守衛）
   ・**`admin → admin` 刻意唔擋**：管理員本来就可以開其他管理員帳號
     （`batchCreateUsers` 嘅 `allowedRoles` 亦容許）。呢度只封「**向上**提權」，
     平級／向下指派一律放行，所以正常流程零影響。

   回歸保護：`check:security` §9（GS，11 項）＋ §10（MOCK 鏡射，8 項），總數 46 → **67**。
   **負向對照已做（第五次／第六次）**：停用 GS 階梯守衛 → **8 項失敗**；
   停用 MOCK 階梯守衛 → **6 項失敗**。兩次都已還原，`grep -c "if (false &&"` → 0，
   GS 同 `public/downloads/` byte-identical，`.mockdata` 已清。

   ⚠️ **仍然 inert**：呢個同之前三個 GS 安全修正一樣，要 82 旅重新部署 GS 先生效。

   **★ 相關嘅未解設計矛盾（用戶已提出新模型，待實作）**：
   `troop_leader` 喺前後端待遇矛盾 —— `lib/model.ts:5-6` 話「旅長權限＝管理員」、
   `lib/model.ts:30` `ROLE_ORDER` 話 `troop_leader` 高過 `admin`、
   `lib/permissions.ts:35` 話兩者一樣，但 **GS 後端 9 處 admin 級守衛有 0 處包含
   `troop_leader`**（實測：`admin` 過到 L3915，`troop_leader` 被拒「你沒有權限修改
   功能授權。」）。用戶提議：**旅長唯一＝第一個管理員**（`Users` 表有 `createdAt`
   欄位，可客觀認定），管理員無限，第一個管理員權限最高可刪其他管理員，
   其他管理員只可以加唔可以減。呢個模型會令 `troop_leader` 變成唔可指派嘅身份，
   上面條提權路自然消失。
2. **/onboard 第 6 步實測** — 走一次表單提交，確認管理員 Sheet「申請記錄」有新記錄 + 收到通知 email
3. **旅團部署** — 新旅團接入流程（收到自動寄信 → `DEPLOY_ADMIN_GUIDE.md` 五步）
4. **`/dashboard/*` demo 樹** — 仍是內嵌 mock 的展示頁（帶 Demo 角色切換），非真實登入頁。**用戶已決定保留**（2026-09-03），繼續作展示用途；已一併清走佢嘅 `super_admin` 角色，最高只到管理員。
5. ~~**README 死鏈**~~ — ✅ 已處理：`ATTENDANCE_INTEGRATION.md` 從未 commit 過（`git log --all -- 'ATTENDANCE_INTEGRATION.md'` 為空），無法還原內容，所以刪咗條死鏈；簽到／報名分流嘅說明保留喺 README 本文。
6. **`npm run lint` 已可用**（2026-09-03 新增）。
   之前 `package.json` 有 `"lint": "next lint"` 但 repo **從未裝過 eslint、亦冇任何 config 檔**，
   所以一跑就 block 喺互動 prompt（`? How would you like to configure ESLint?`）—— 即係呢個
   check 一直係死嘅。已補：`eslint@8.57.1` ＋ `eslint-config-next@14.2.35`（devDependencies）
   ＋ `.eslintrc.json`（`extends: next/core-web-vitals`，ignore `node_modules`／`.next`／
   `public/downloads`）。
   ⚠️ 呢個改動係 agent 自己決定加嘅（用戶嘅標準要求列咗 `lint` 係項目 check 之一，
   而檢查受阻時解除阻塞屬於任務一部分）。**如果唔想要，revert 呢三個檔就可以**：
   `.eslintrc.json`、`package.json`、`package-lock.json`。

   **結果（實測）**：**9 個 warning、0 個 error**、exit code 0。
   全部 warning 都係 `react-hooks/exhaustive-deps`，分佈喺 5 個檔案：
   `app/admin/equipment/page.tsx`(3)、`app/equipment/page.tsx`(3)、
   `app/admin/registrations/page.tsx`(1)、`app/admin/users/page.tsx`(1)、
   `app/attendance/page.tsx`(1)。
   **呢 9 個刻意冇修** —— 用 `git blame` 逐行確認過，全部由 base commit `45f9fc8`
   或更早引入，係既有 code；而「補齊 hook 依賴」會改變 render／effect 觸發時機，
   屬於有行為風險嘅改動，唔應該溝入安全修正一齊做。要處理請獨立開一個 task。

   **本 session 自己引入嘅 3 個 warning 已全部修好**（原本 12 個 → 9 個）：
   ・`components/ui/SubscribeCalendar.tsx`(2)：`branchIds.join(',')` 直接做 dependency
     係複雜表達式，ESLint 靜態分析唔到 → 抽做 `branchParam` 變數。
   ・`app/dashboard/calendar/page.tsx`(1)：`useMemo` 缺 `inScope`／`isFamily` 依賴
     → `inScope` 用 `useCallback` 包住（否則每次 render 都係新函數，直接放落 deps
     會令 memo 失效），再補齊 deps；補完 ESLint 轉而報 `role` 係多餘依賴
     （已確認 `role` 喺 memo 本体冇直接使用，只經 `isLeader`／`inScope`／`isFamily`
     間接用到），所以一併移除。實測 `/dashboard/calendar` HTTP 200、16.6 KB、
     內容正常、冇 error overlay。
   ⚠️ 教訓：**唔好假設「lint warning 都係既有嘅」**。要先 `git blame` 逐行確認邊個
     commit 引入，先至分得清「既有技術債」同「自己今次引入嘅 regression」。
     我最初報告「10 個全部係既有 code」就係冇做呢步而講錯。

   ⚠️ **副作用**：Next 14 嘅 `next build` 預設會跑 ESLint，所以加咗 config 之後
   build 輸出多咗「Linting and checking validity of types...」同嗰 9 個 warning。
   已實測確認 **build 仍然通過**（exit 0、63 條路由）—— warning 唔會令 build 失敗，
   只有 error 先會。

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
4. **移動優先** — 底部導航 4 個 tab（成員／家長：行事曆、相簿、活動、主頁；領袖：行事曆、相簿、點名、管理中心）
5. **按需載入** — 每個頁面獨立 API（slice），不一次載入所有數據；角色過濾集中在 `buildDashboardCore_` 一處
6. **冇「公告」呢個概念** — 通知類訊息一律行最上方嘅 📣 最新消息 BAR（領袖直接喺條 BAR 加，最多 3 條）；
   有文件／要回覆嘅一律當「活動＝通告」，分 🏠 旅團活動（內部）同 🗺️ 區地域總會活動（外部）。
   所以統計格、導航、管理中心都唔會再出現「公告」。
7. **❤️ 有興趣 = 成員專用** — 只係成員向家長及領袖表達意願，唔等於報名；家長端唔會見到呢個掣。
8. **緊急聯絡資料 = 已連結家長嘅資料** — 有 parentUserId 就直接用家長帳戶（名／email），
   後台（`buildDashboardCore_` member 分支 + `buildMockState`）會連家長 user 一齊回傳畀成員。
9. **冇權限就唔顯示個數字** — 統計格（待審批／用戶）只會喺有相應 feature 時出現，避免撳落去撞牆。
10. **團長（group_leader）** — 有使用者管理同支部管理，但只限自己支部（`branchScoped`）。

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

---

## 2026-09-03 重構：廢除 `troop_super`，旅長成為最高人類權限

### 用戶決定（三條）

1. **`troop_super` 整個廢除，旅長（`troop_leader`）成為最高權限** —— 但**身份卡要顯示「旅長」而唔係「管理員」**。
2. **旅長交接係「交換職位」，唔係單向指派**：現任旅長撳掣同另一人對調，對方變旅長、
   自己接手對方原本嘅角色＋支部。**對象可以是支部領袖，唔一定係管理員。**
3. **管理員只能加不能減**：管理員唔可以刪其他管理員嘅帳號、唔可以改其他管理員嘅角色
   （其他欄位照改得）；要改角色必須經後台。用戶明確否決「可降級」變體（「會造成 BUG」）。

### 新角色階梯

```
super_admin      技術測試（寫死，全旅只有一個，唔經 API 指派）
troop_leader     旅長 ← 最高人類權限，**全旅只有一個**，唔可以經 API 指派
admin            管理員（可以無數個）
group_leader / branch_leader / coach / parent / member
```

`troop_super` 已喺 `lib/model.ts` 嘅 `Role` union 移除。
**但 `normalizeRole()` 會把舊 Sheet 列嘅 `role='troop_super'` 讀成 `troop_leader`** ——
唔係刪除，因為刪除會剝走佢哋所有權限（live-Sheet 相容）。

### 改咗啲乜

| 位置 | 改動 |
|---|---|
| `lib/model.ts` | `Role` 去 `troop_super`；新增 `normalizeRole()`；`ROLE_LABEL`／`ROLE_ORDER`／`MANAGER_ROLES`／`isAdmin()`／`canSeeRole()` 全部更新 |
| `lib/permissions.ts` | `checkEditPermission` 分開 `troop_leader`／`admin` 兩條分支；`assignableRoles()` 重寫 —— **`troop_leader` 唔喺任何列表**，`admin` 而家可以指派 `admin` |
| `lib/session.ts` | 移除 `case 'troop_super'` 同 `demoSession` 嘅 map entry |
| `app/admin/users/page.tsx` | 篩選項 超管→旅長；`locked` 旗標改指 `troop_leader`；**身份卡金色徽章「超管」→「旅長」**；新增「👑 交接旅長」掣 |
| `lib/api.ts` | 新增 `apiTransferTroopLeader()` |
| `gs/SCOUTSYSTEM_2_SETUP.gs` | 見下 |

### GS 改動

- **Bootstrap（L263 + L341）** 建 `role='troop_leader'`、名「旅長」（原本 `troop_super`）。
- **`NON_ASSIGNABLE_ROLES_ = ['troop_leader']` + `isNonAssignableRole_`** 取代 `ABOVE_ADMIN_ROLES_`／`isAboveAdminRole_`；
  中央守衛（~L1834）豁免 `applyJoin`（靜默降級）同 `transferTroopLeader`。
- **★ 副作用修咗一個真 bug**：12 條 admin-tier 守衛原本漏咗 `troop_leader`
  （實測 9 條入面 0 條有佢 —— 旅長調 `updateUserPermissions` 回「你沒有權限修改功能授權。」而 `admin` 通過）。
  把呢啲行嘅 `troop_super` 換成 `troop_leader` 之後，**「旅長權限 < 管理員」嘅前後端矛盾由構造上消失**。
- **新增 `handleTransferTroopLeader_(p)`**（~L3416，dispatcher L1978）——
  **對調角色 ＋ branchId**（只換角色會令前旅長變成分支領袖但冇支部）。
  拒絕自己／唔存在嘅用戶／`super_admin` 目標；只准現任 `troop_leader`
  （或 `TECH_TEST_ACCOUNTS_`／`system`／`staff_token`）；被拒會寫 `DENIED:transferTroopLeader`。
- **新增 `checkAdminPeerGuard_(p, kind)`**（~L1782）—— 把決定 3 落到服務端。
  接咗入 `handleUpdateUserRole_`（kind `'role'`，由 `String(p.field||'').toLowerCase() !== 'role'` 守著）
  同 `handleDeleteUser_`（kind `'delete'`）。

### ★ check:security §11 測出嚟嘅真漏洞

原本嘅 peer guard 只保護「目標係 `admin`」，**漏咗旅長** ——
`admin` 可以把旅長降級做 `member` 甚至刪除佢，咁樣全旅就會**冇旅長**，
而且**唔可以經 API 修復**（`transferTroopLeader` 要現任旅長發起）。

修正：受保護對象 = `admin` **同** `troop_leader`。GS 同 MOCK 兩邊都改。
拒絕訊息分開兩款（旅長版指引用「交接旅長」）。

### 檢查腳本更新

- `scripts/check-reserved-roles.mjs` —— §9／§10 為新模型重寫，新增 **§11**
  （「只能加不能減」＋交接旅長）同 **§12**（角色歸一＋旅長唯一不變量），
  GS ＋ MOCK 兩邊。**66 → 105 項斷言**。
- `scripts/check-public-cards.mjs` —— L82／L87 角色列表去 `troop_super`。

### ⚠️ 兩個踩過嘅陷阱（寫測試時必讀）

1. **唔好用 `u_admin` 還原 `u_m1`。** §11 嘅 peer guard 會擋住 admin 改 admin，
   令還原**靜默失敗**，`u_m1` 永久留喺 `admin` 狀態喺 `.mockdata` ——
   對照組喺**第二次跑**先假失敗。實測重現過：清 `.mockdata` 後第 1 次過、第 2 次 2 項失敗。
   **重置一律用 `u_tl`（旅長，唔受 peer guard 限制），而且喺開頭先重置。**
2. **負對照嘅方向要啱。** `if (false && …)` 令守衛**永遠擋住所有人**
   （掛嘅反而係正向對照組）；正確做法係 `if (true) return null;` —— **永遠放行**，
   咁先可以證明「唔可以」嗰啲斷言真係靠守衛先過。
   本次負對照：11 項失敗（包括 6 條「唔可以」斷言），還原後 91 項全綠。

### 「全旅只有一個旅長」不變量（§12）

**★ 呢個係為一個未爆嘅炸彈而設。** `troop_super` 喺階梯守衛（`56b94de`）之前
係**可以經 API 指派**嘅，所以 82 旅嘅 live Sheet 有可能有**多於一行**
`role='troop_super'`。廢除 `troop_super` 之後，`normalizeRole()` 會把佢哋**全部**
歸一成 `troop_leader` —— 直接違反「全旅只有一個旅長」，而且交接旅長會變得
冇意義（唔知邊個先係現任）。

修正（GS `normalizeRole_` + `enforceSingleTroopLeader_`，MOCK 鏡像）：
- 用 `createdAt` 決定邊個先係真旅長 —— **最早建立嗰個**（＝用戶講嘅「第一個管理員」）
- 其餘降做 `admin`（**唔係刪除** —— 刪除會剝走佢哋所有權限）
- 冇 `createdAt` 嘅排最後（`9999-12-31`）；同一時刻用 `userId` 打破平手，令結果**確定**
- ⚠️ 呢個係**讀入時**修正，**唔會寫返 Sheet／store** —— 原始資料唔會被靜默改寫，
  每次讀都會重新歸一。**要永久清理請人手改 Sheet。**

實測（§12，14 項斷言）：兩個 `troop_super`（2026-05-10 / 2026-01-02）→
淨返一個旅長（最早嗰個 `u_a`），另一個降做 `admin`，三行都冇被刪除，
普通成員角色冇被搞到；`createdAt` 都缺失時用 `userId` 打破平手。
負對照：癱瘓 `enforceSingleTroopLeader_` → 4 項失敗，還原後 105 項全綠。

## 2026-09-03 全 repo 連結審計：4 條真斷連結 ＋ `lib/routeAccess.ts`

用戶要求「從新以不同帳戶檢測有沒有 BUG 或矛盾地方，各卡之間的連結有沒有破壞」。

### 審計方法（全部用程式跑，唔係用眼睇）

| 層 | 做咗乜 | 結果 |
|---|---|---|
| A | 抽出全 repo 53 個內部路徑引用，對比 60 條 fs route | 4 個「唔存在」全部都係 `public/downloads/` 靜態檔案，經 HTTP 實測 **4/4 都係 200** → 冇斷連結 |
| B | 底部導航（per-role）× 目標頁 `<Auth>` gate | **0 斷** |
| C | 管理中心 8 張卡 × 角色 feature（經真實 mock API 攞 `userFeatures`）× 目標頁 gate | **0 斷** |
| D | **頁→頁** 全部對外連結 × 「源頁可達」× 目標頁 gate = **601 條組合** | **18 條候選** |
| E | 18 條候選逐個查實際渲染條件（靜態掃描分唔到條件渲染） | **16 條假陽性 ＋ 4 條真 bug** |

### 4 條真斷連結（全部同一個根因）

每頁嘅 `<Auth roles={[...]}>` 同每條 link 嘅顯示條件**各自 hardcode 角色列表**，兩邊 drift：

1. **`/admin/members`（gate 收 coach）→ `/admin/users`（gate 唔收 coach）**
   條「📥 批量開戶 / 匯入成員」link **完全冇守衛** → 教練員撳落去撞「未獲授權」牆。
2. **`/equipment`（冇 gate）→ `/admin/equipment`（gate 唔收 coach）**
   用 `LEADER_ROLES`（**包** coach）決定 show 唔 show「🛠️ 物資管理」掣 → 同一個牆。
3./4. **`/leader` → `/admin`**
   `/leader` 冇 gate 就 `redirect('/admin')`，家長／成員跟舊書籤入嚟撞牆
   （明明佢哋自己有 `/parent` `/member`）。

`components/Auth.tsx` 被拒時顯示「🔒 此功能需要團長授權」死胡同頁，
所以用戶係**撞牆**而唔係静默失敗 —— 但一樣係壞咗嘅體驗。

### 修法：`lib/routeAccess.ts` 做單一真相來源

- `ROUTE_ROLES`：每個 route 邊啲角色入到（同 17 個實際 `<Auth>` gate **逐項驗證過完全一致**）
- `ROUTE_ROLE_SETS`：語義化組合（`ADMIN_ONLY` / `ADMIN_AND_BRANCH` / `ADMIN_BRANCH_COACH` / `ALL_LOGGED_IN`）
- `canAccessRoute(path, role)`：link 守衛用呢個，唔好另抄角色列表

三個檔案改用佢：`app/admin/members/page.tsx`（補 `getSession` + 守衛）、
`app/equipment/page.tsx`（新增 `canManageEquipment`）、
`app/leader/page.tsx`（**改成 client component** 用 `dashboardFor(role)`）。

⚠️ `/leader` 必須係 **client** component：session 只存喺 `localStorage`
（`SESSION_KEY='scoutsystem2_current_user'`），server component 讀唔到，
而呢個 repo **冇**把 role 鏡像落 cookie。我第一版誤用咗一個自己作嘅
`scoutsystem2_role` cookie —— `grep` 證實全 repo 冇呢樣嘢，咁寫會令**所有人**
被當未登入送去 `/login`，比原本個 bug 更差。

### 新增 `npm run check:links`（141 項斷言）

防止再 drift。四節：
- §1 每頁 `<Auth roles>` 必須同 `ROUTE_ROLES` 完全一致（17 頁）
- §2 `ROUTE_ROLES` 冇懸空登記（每個 route 都要真係有 `page.tsx`）
- §3 全 repo 53 個內部路徑必須存在（app route 或 `public/` 靜態檔案）
- §4 `/leader` 唔可以再無條件 redirect；並驗證 8 個角色嘅 `dashboardFor()` 目標都收自己

**兩個負對照都驗證過並已還原**：
- 把 `/leader` 改返舊版 `redirect('/admin')` → **3 項失敗**
- 把 `coach` 加入 `/admin/equipment` gate（模擬 drift）→ **1 項失敗**（§1 抓到）

⚠️ §4 嘅 regex 必須**剝走註釋**先至 match —— `app/leader/page.tsx` 嘅文件註釋
刻意寫低咗舊行為 `redirect('/admin')` 做解說，直接 match 原文會**假失敗**（第一版中咗）。

### 順帶證實冇問題嘅位（避免下次重複查）

- **`troop_leader` vs `admin` 可見範圍**：經真實 HTTP 逐個 key 比對，**20 個 key 全部一致**
  → 用戶決定「旅長 ≥ 管理員」喺讀取層面成立。
- **`photos` feature**：唔係懸空引用，係 `OPT_IN_FEATURES` 入面嘅正規 opt-in feature，
  經 `USER_SCOPED_GRANTS` 批咗俾 `u_gl3`／`u_bl`／`u_m1`／`u5`（刻意嘅 seed 資料）。
- **`lib/registry.ts` 用另一套角色詞彙**（`leader` 而唔係 `group_leader`）：
  經 `mapHubRoleToMinRole()` 轉做 `minRole`，再用 `ROLE_ORDER` 比較 ——
  `ROLE_ORDER` 入面 `troop_leader` 喺 `admin` 之上，所以冇問題。
- **`lib/permissions.ts:111-113`**：掃描命中但係**假陽性** —— 個陣列係
  `assignableRoles()` 嘅**回傳值**（可指派邊啲角色），唔係權限檢查；L112 已經有 `troop_leader`。
- **`app/dashboard/calendar/page.tsx:68`** `role === 'admin'`：係唯一一處狹窄比較，
  會漏 `troop_leader`。審計當時判定為 latent（demo 樹選擇器冇 `troop_leader`，唔可達）；
  **後已一併修正** —— 見下一節「demo 樹加旅長」。

### 仍需人手做（呢個環境做唔到）

- **82 旅重新部署 GS** —— 上面所有 GS 修正**喺重新部署之前全部係 inert**。
- **人手清理 live Sheet 入面殘留嘅 `role='troop_super'` 列** —— 讀入時會自動歸一
  ＋ 只留最早嗰個做旅長，但 Sheet 上面嘅原始值唔會被改寫。

---

## 2026-09-03 用戶決定：交接對象收緊 ＋ demo 樹加旅長

重構後全 repo 重新審計（8 個角色 × 所有卡片）發現兩件事，用戶已決定處理方式。

### 1. 「交接旅長」對象收緊到領袖層（後端）

**發現嘅落差：**前端 `app/admin/users/page.tsx:693` 嘅交接掣條件係
`myRole==='troop_leader' && u.id!==myUserId && u.role!=='super_admin'` ——
但 L676 個帳戶表已經濾走咗 `member`／`parent`，所以 UI **永遠唔可能**提供呢兩種目標。
後端（GS `handleTransferTroopLeader_` ＋ mock `case 'transferTroopLeader'`）
**冇任何對象角色檢查** → 前後端能力落差。

**實測證據（真實 HTTP）：**
`?action=transferTroopLeader&targetUserId=u_m4&operatedBy=u_tl`
→ `success=true`，而 `u_m4` 係 `member`（未成年成員）—— 旅長職位成功交咗俾一個細路。

**修法：**GS ＋ mock 兩邊都加對象角色檢查，同 UI 一致。

```js
// GS handleTransferTroopLeader_
var ELIGIBLE_ = { admin: true, troop_leader: true, group_leader: true,
                  branch_leader: true, coach: true };
if (!ELIGIBLE_[target.role]) return { error: '只可以交接俾管理員／團長／支部領袖／教練員。' +
  (target.role === 'member' ? '成員' : '家長') + '帳號唔可以成為旅長。' };
```

**實測（修正後，真實 HTTP）：**

| 目標 | 結果 |
|---|---|
| `u_m4`（member 未成年） | ❌ 拒絕 |
| `u_m1`（member） | ❌ 拒絕 |
| `u5`（parent） | ❌ 拒絕 |
| `u_bl`（branch_leader） | ✅ 成功（之後還原狀態） |

`check:security` §11 已加入呢啲斷言（GS ＋ MOCK 兩邊）→ **114 項全過**。

### 2. `/dashboard/**` demo 樹加返旅長

**背景：**demo 樹有 3 個檔案各自宣告 local `type Role`，全部都冇 `troop_leader`
（原本有 `super_admin`，喺 `88c783f` 用戶要求「demo 唔應該存在超管」時一齊移走咗）。
結果係 demo 樹**冇辦法展示旅長呢個角色**。

**用戶決定：**「多加1個旅長（其實只是 COPY 管理員）讓用戶感覺有而已。」

**改咗乜（9 個檔案，全部 `/dashboard/**`）：**

| 改動 | 處數 |
|---|---|
| local `type Role` 加 `'troop_leader'` | 3 |
| `Record<Role, string>` 加 `troop_leader` entry（`ROLE_LABEL`／`ROLE_COLOR`） | 4 |
| `isLeader`／`isManager`／`isPrivileged`／`isBranchLeader`／`isStaffRole`／`isParentOrMember` 陣列 | 11 |
| 角色選擇器加旅長按鈕 ＋ label | 6 |
| `DEMO_MY_BRANCH` 加 `troop_leader: ''` | 1 |
| `isAdminRole = role === 'admin'` → `‖ role === 'troop_leader'` | 1 |

旅長用**金色**徽章（`bg-amber-100 text-amber-800`），同真實 `/admin/users:681`
嘅「旅長」金徽章一致。

**順手修正咗審計 flag 嘅狹窄比較：**`app/dashboard/calendar/page.tsx:68` 原本
`role === 'admin'`，令旅長睇唔到其他支部。而家旅長同管理員一樣睇到全部支部：

```
troop_leader   isAdminRole=True   myBranch=(空)  → ['全旅','幼童軍','童軍','深資','樂行']
admin          isAdminRole=True   myBranch=(空)  → ['全旅','幼童軍','童軍','深資','樂行']
```

> **呢個改動只影響 `/dashboard/**` demo 樹**，唔影響真實 UI／GS／mock。
> 真實系統嘅旅長一直係唯一一個，由 `/admin/users` 嘅「👑 交接旅長」管理。

### 驗證

`tsc` 0 error · `next build` exit 0 / 63 routes · `npm run lint` 9 warnings / 0 errors（同基線一致）
· 8 個 check 全綠（`check:gs` · `check:perms` 47/47/18 · `check:public` 46 ·
`check:security` **114** · `check:links` **141** · `check:modules` · `check:calendar` · `check:render`）。
GS 模板 244,654 bytes，同 `public/downloads/` 副本 `cmp` 一致。

---

## 2026-09-03 孤兒頁審計：`check:links` §5（BFS 可達性分析）

### 發現

全 repo 61 個 app route 做可達性掃描，搵到 **5 個完全冇入站連結嘅頁面**，
全部喺 `/dashboard/**` demo 樹：

```
/dashboard/admin/settings      ⚙️ 系統設定（168 行）
/dashboard/admin/plugins       🧩 單位元件設定
/dashboard/admin/branches      🏢 支部與小隊設定
/dashboard/marketplace         🛒 元件市場
/dashboard/connectors          🔌 轉駁中心
```

**根因：**真實 UI 嘅管理中心「系統管理」卡指去 **hub 頁** `/admin/system`
（`app/admin/system/page.tsx`，由 hub 再分流去 settings／audit／plugins／
marketplace／connectors）。但 demo 樹嘅同一張卡**直接指去 leaf 頁**
`/dashboard/admin/audit`（審核紀錄，嗰頁一條 href 都冇）→ 上面 5 頁
用戶永遠到唔到。

**修法：**新建 `app/dashboard/admin/system/page.tsx`（鏡像正式版 hub），
管理中心張卡改指去佢。5 頁全部恢復可達。

> `/dashboard/admin/branches` 有少少特殊：demo 管理中心刻意冇「支部管理」卡
> （見 `app/dashboard/admin/page.tsx` 底部註解「支部及小隊已併入帳戶管理」），
> 但頁面本身仍然存在。而家挂喺 hub 入面令佢可達；如果要跟 demo 嘅設計刪除呢頁，
> 改 hub 入面嗰一行就得。**未刪** —— 刪頁係破壞性操作，用戶冇明確要求。

### `check:links` §5 —— 點解要用 BFS 而唔係數入站連結

**第一版**只數「有冇入站連結」。**Negative control 證明咗呢個判準唔夠：**
把管理中心張卡由 hub 改返指去 leaf 頁之後，hub 自己變孤兒（✅ 被捉到），
但佢下面嗰 5 頁**仍然有入站連結** —— 因為佢哋嘅入站連結來自嗰個已經不可達嘅 hub。
用戶實際上已經到唔到佢哋，但「有冇入站連結」話佢哋冇事。

**而家嘅做法：**由 4 個 entry point 出發做 BFS，沿住連結行，行唔到嘅 route
就係不可達（不論直接定傳遞性）。同一個 negative control 而家**啱啱好咬到 6 個**
（hub ＋ 5 個下游頁），而唔係頭先嘅 1 個。

```
（檢查咗 61 個 route；由 4 個 entry point 出發可達 61 個；不可達 0 個）
```

### ★ 引用形式有 5 種 —— 呢個陷阱我今次 session 踩咗兩次

第一版 §5 用 `href=|router.push|redirect(` 做前綴，結果 **6 個假陽性**。
實際見過嘅內部路徑引用形式：

| # | 形式 | 例子 | 前綴式 regex |
|---|---|---|---|
| 1 | 精確字串 | `href="/badges"` | ✅ |
| 2 | 模板字串 | ``href={`/badges?member=${c.id}`}`` | ❌ 有 `$` 插值 |
| 3 | 物件屬性 | `{ href: '/badges' }`（array.map 砌卡） | ✅ |
| 4 | 三元 | `href: canUsers ? '/admin/users?tab=x' : '/admin/applications'` | ❌ 引號唔緊跟 |
| 5 | 嵌套三元 | `href: isDemo ? '/dashboard' : (role === 'parent' ? '/parent' : …)` | ❌ |

**教訓：**我審計時用形式 1 嘅 grep，誤判 `/badges` 係死碼 —— 佢其實有
`app/member/page.tsx:42`（形式 3）同 `app/parent/page.tsx:201`（形式 2）
兩條入站連結。而家 §5 改成「**剝走註解後，配任何引號包住嘅內部路徑**」，
再排除兩個已知非連結來源（`lib/routeAccess.ts` 登記表、`HIDDEN_PATHS` 排除陣列）。

### 4 個 entry point（allowlist，每個都要寫理由）

| Route | 理由 |
|---|---|
| `/` | app 入口，由瀏覽器直接入 |
| `/leader` | legacy redirect 頁，專接舊書籤；冇頁應該連去佢（見 §4） |
| `/library/import` | 外部通告圖書館帶 query 參數跳入（`?title=&sourceSite=&deadline=&fee=&audience=`）；`app/library/` 冇 index 頁 |
| `/troops` | 已接入旅團公開目錄；正常流程經根頁揀旅團，呢頁只供直接網址分享 |

`/troops` 嘅處置問過用戶，佢嘅答覆重新定義咗「公開展示」：
「先連結進旅團，再看旅團是否開放了行事曆等公開資料卡片，可在不登入情況下觀看
（下方 4 大按鈕）其之三」—— 即係正常流程係根頁揀旅團 → 底欄三個公開掣 →
內容由三張公開卡決定，呢個流程入面冇獨立嘅旅團目錄頁。用戶冇揀「刪除」，
所以保留做 entry point。

> ⚠️ 如果日後確定要刪 `/troops`，要一齊清 `components/LatestNewsBar.tsx:11`
> 同 `components/layout/BottomNav.tsx:39` 兩個 `HIDDEN_PATHS` 陣列入面嘅 `'/troops'`。

### 順手修咗：`/notices` 冇入口

`/admin/events:300` 一直有「📊 活動統計」連結（用戶要求：通告PDF 同活動統計
都屬於活動管理），但**冇通告PDF 嗰條** → 令 `/notices` 變孤兒。

**`/notices` 唔可以刪** —— 證據：

| 卡片 | 消費頁 | `isItemPublic` | `PublicScopePanel` |
|---|---|---|---|
| `calendar` | `/calendar` | 4 | — |
| `albums` | `/albums` | 2 | 2 |
| `notices` | **`/notices`** | 2 | 2 |

三張公開卡（`lib/publicScope.ts:29-33`）嘅消費面**一一對應**，
`/notices` 係 `notices` 卡**唯一**嘅表面，亦係全 repo 唯一用
`apiUpdatePdfTags` 嘅頁。刪咗佢，三張公開卡會剩兩張。

> **順帶發現（未修，屬設計問題）：**`/activities`（底欄「🎯 活動」）
> **完全冇消費任何公開卡** —— `isItemPublic` 0 處、`cardEffective` 0 處，
> 只用咗 L0 嘅 `publicViewEnabled`（全旅公開總開關）。
> 對照 `/calendar` 用 `isItemPublic` 4 處。
> 即係「活動」呢個底欄掣冇做 L1／L2 卡片＋範圍過濾。
> **未修** —— 呢個係產品決定（活動頁應該跟邊張卡？定係自成一格？），要問用戶。

### 驗證

`tsc` 0 error · `next build` exit 0 / **64 routes**（由 63 加 1 = 新 hub 頁）
· `npm run lint` 9 warnings / 0 errors（同基線一致）
· 8 個 check 全綠，其中 `check:links` **210 項斷言**（§1-5）。

**Negative control（第 10 個）：**管理中心張卡由 hub 改指 leaf 頁 →
BFS 版咬到 6 個不可達（hub ＋ 5 下游頁），舊「數入站連結」版只咬到 1 個。
還原後 0 殘留、210 項全綠。

---

## 2026-09-03 第三張公開卡：`notices`（通告）→ `activities`（活動）

### 用戶決定

審計發現三張公開卡同底欄三個公開掣**錯位**：

| 底欄公開掣 | 頁面 | `isItemPublic` | 用邊張卡 |
|---|---|---|---|
| 📅 行事曆 | `/calendar` | 4 | `calendar` |
| 📷 相簿 | `/albums` | 2 | `albums` |
| 🎯 活動 | `/activities` | **0** | **一張都冇** |

而第三張卡 `notices` 嘅消費面係 `/notices` —— 佢唔喺底欄。即係有一張卡
完全冇效力：管理員關咗佢，訪客喺「🎯 活動」掣一樣睇到晒。

**用戶答覆：**「1，但其實應該沒有 NOTICE 卡的，也只有活動管理，
根本沒有通告管理，通告是由活動管理去上載的。」

核實：`/admin/events:33-34` 確實有三種加入方法
（`1️⃣ 純在 APP 打入資料`／`2️⃣ 上載通告（.docx/.txt 自動讀資料）`／`3️⃣ 加入通告連結`）
—— 通告確實由活動管理上載，冇獨立嘅通告管理。

### 改咗乜

| 檔案 | 改動 |
|---|---|
| `lib/publicScope.ts` | 第三張卡 `notices`→`activities`（🎯 活動）；新增 `normalizeCardId()`＋`LEGACY_SCOPE_KEY`；`openCards()`／`openScopes()` 讀入時歸一 |
| `lib/api.ts` | 2 個 card 型別 union |
| `components/ui/PublicScopePanel.tsx` | `CARD_COPY` 第三張卡文案 |
| `app/activities/page.tsx` | **新增 `isItemPublic(s.config,'activities',e.branchId)` 過濾**（未登入訪客） |
| `app/notices/page.tsx` | 2 處 card id |
| `app/dashboard/admin/settings/page.tsx` | demo 樹卡片清單 |
| `app/admin/events/page.tsx` | 註解更新（通告PDF link 保留） |
| `lib/mockServer.ts` | import ＋ 2 處 card 驗證（先歸一再驗證）＋ 2 處 legacy fallback |
| `gs/SCOUTSYSTEM_2_SETUP.gs` | `normalizeCardId_()`／`normalizeCards_()`／`LEGACY_CARD_ID_`／`LEGACY_SCOPE_KEY_`；2 個 handler 先歸一再驗證；2 處 config seed；2 處 legacy fallback |

### ★ 點解必須做讀入時歸一（唔可以直接改名）

82 旅 live Sheet 已經有：
```
PUBLIC_CARDS       = 'calendar,notices'
PUBLIC_SCOPE_NOTICES = 'troop'
```

直接改名會有**兩個靜默失敗**（冇任何錯誤訊息）：

1. **讀取**：`openCards` 認唔到 `notices` → 第三張卡無聲無息變「已關閉」；
   `scopeKey('activities')` 去搵 `PUBLIC_SCOPE_ACTIVITIES`（唔存在）
   → 各支部領袖已設定嘅公開範圍全部消失。
2. **寫入**：管理員「關閉活動卡」→ `setInList_` 搵唔到 `activities` 嚟刪
   → 寫返 `calendar,notices` → 前端歸一之後**張卡照舊顯示為開，管理員關唔到**。

所以同 `normalizeRole()` 同一個做法：**讀入時歸一 ＋ 寫入時歸一**，
但唔改寫 Sheet 上面嘅其他原始值。新 key 存在時優先用新 key。

### 驗證

**讀路徑（真實 HTTP 攞返嚟嘅 live config，舊格式）—— 9/9：**
```
live config: {"PUBLIC_CARDS":"calendar,notices","PUBLIC_SCOPE_NOTICES":"troop,b2"}
  ✅ openCards 讀出新 id                     got=["calendar","activities"]
  ✅ 第三張卡仍係「開」（唔會無聲無息變關）   got=true
  ✅ openScopes 由舊 key fallback 讀到        got=["troop","b2"]
  ✅ b2 內容公開（支部領袖之前同意過）        got=true
  ✅ b3 內容唔公開（之前冇同意）              got=false
  ✅ albums 卡未開（唔受 fallback 污染）      got=false
```

**寫路徑（靜默失敗風險嘅直接証明）：**
```
起點   PUBLIC_CARDS = "calendar,notices"
關閉「活動」卡（card=activities）→ success=true
結果   PUBLIC_CARDS = "calendar"
  ★ 舊 id notices 已刪走 = true
  ★ 張卡真係關咗       = true
```

**Negative control（第 11 個）：**癱瘓 `normalizeCardId` ＋ scope fallback
→ `check:public` **7/60 失敗**；還原後 0 殘留、60 全綠。

**`check:public` 由 46 升到 60 項斷言**（新增第 9 節：舊卡 id 歸一，14 個斷言）。

### ★ 過程中被驗證否定咗嘅三個假設

記錄喺呢度，因為三個都係「睇落好合理但實測唔成立」：

1. **「`/badges` 係死碼」** —— 錯。佢有 `app/member/page.tsx:42`（物件屬性形式）
   同 `app/parent/page.tsx:201`（模板字串形式）兩條入站連結。我個 grep 只配精確字串。
2. **「`/activities` 攞唔到 `config` → 過濾會靜默放行」** —— 前半啱後半錯。
   實測 `isItemPublic(undefined, …)` 回 **`false`**（靜默**隱藏**全部，唔係放行）。
   但再查 GS `buildStateSlice_:1466-1482`：`config` 同 `userFeatures` 係
   **寫死喺 `out` 初始化**、唔理 `keyList`，所以 `/activities` 淨係請求
   `keys=events` 一樣攞到 `config`。mock 同 GS 兩邊行為一致 → 冇問題。
3. **「交接掣有 6 個」** —— 錯，實際 **5 個**。我之前報嘅 6 係量度自一個被
   測試污染咗嘅 `.mockdata`（`u_m2` 當時係 `branch_leader`）。
   原始 seed（`lib/mockServer.ts:131`）`u_m2` 係 `member`：
   admin 1 / troop_leader 1 / group_leader 2 / branch_leader 1 / coach 1
   / parent 2 / member 5 → 帳戶表 6 行 − 自己 = **5**。
   （`check:render` 嘅斷言係 `>0` 同 `<13`，所以冇被呢個錯數影響。）

### 驗證（全套）

`tsc` 0 error · `next build` exit 0 / 64 routes · `npm run lint` 9 warnings / 0 errors
（同基線一致）· 8 個 check 全綠：`check:gs` · `check:perms` 47/47/18 ·
`check:public` **60** · `check:security` **114** · `check:links` **210** ·
`check:modules` · `check:calendar` · `check:render`。
GS 模板 247,944 bytes，同 `public/downloads/` 副本 `cmp` 一致。

### 仍需人手做

**82 旅重新部署 GS** —— 上面所有 GS 修正喺重新部署之前全部係 inert。
重新部署後 live Sheet 入面嘅 `PUBLIC_CARDS='calendar,notices'` 同
`PUBLIC_SCOPE_NOTICES` **唔使人手改**，讀入時自動歸一；
管理員第一次撳「開／關活動卡」時先會寫成新格式。

### ★ 補做：`/activities` 嘅真正 client render 驗證

上面嘅驗證全部係**函數層**（`isItemPublic` 嘅回傳值）。但我改咗嘅係
`app/activities/page.tsx` 嘅 render 邏輯，**函數啱唔代表頁面對**。
HTTP 200 同 SSR 都證明唔到 client render（呢頁 state 由 `useEffect` 載入）。

已併入永久 `check:render`（`scripts/render-users-page.mjs`），用 jsdom 行 `useEffect`：

```
── /activities：未登入訪客（活動卡 scope = troop,b2）──
  ✅ 頁面有 render 出內容（唔係「載入中」）
  ✅ e02「童軍週末營」睇到          ← troop
  ✅ e08「全旅親子遠足日」睇到      ← troop
  ✅ e03「十一區運動會」睇到        ← b2
  ✅ e00「八月童軍技能日」睇唔到    ← b3（未同意公開）
  ✅ e01「九月山徑健行」睇唔到      ← b3
  ✅ e05「樂行社區服務日」睇唔到    ← b5
  ✅ e06「深資遠征」睇唔到          ← b4
  ✅ e07「小童軍親子日」睇唔到      ← b1
  ✅ 訪客淨係睇到 3 個活動（唔係改動前嘅 8 個）
```

數據由 curl 核實：`troop_demo` 有 8 個已發佈活動，
按支部 b3×2／troop×2／b2×1／b5×1／b4×1／b1×1；
「活動」卡 scope = `troop,b2`（經舊 key fallback）→ 預期 3 個。

**Negative control（第 12 個）：**攞走 `app/activities/page.tsx:48` 嘅
`isItemPublic` 過濾 → 訪客見到 **8 個**活動（正正係改動前嘅行為）、
**6 項斷言變紅**。還原後 `grep -c NEGCTRL` → 0，`check:render` 全綠。

### ★ 呢個驗證第一版係空轉嘅（記錄以免重犯）

第一次寫嘅 harness 用 `localStorage.clear()` 扮「訪客」，結果 10 項斷言
**全部空轉**：頁面永遠停喺「載入中...」（`text 長度=6`）。

原因：`getTroopKey()`（`lib/api.ts:8-14`）讀
`localStorage['scoutsystem2_selected_troop']` 嚟砌 API URL，
`clear()` 連**已選旅團**一齊清走 → API 回 `troopKey=unknown` → 400 →
`loadStateSlice` reject → 但 `err` 係空字串所以連錯誤都顯示唔出。

**教訓：「訪客」≠「乜都冇」。** 正確做法係淨係
`removeItem('scoutsystem2_current_user')` ＋ 保留已選旅團。
（dev server log 見到 `troopKey=unknown … 400` 先至搵到原因。）

**推廣：任何「未登入」嘅 jsdom render 測試都要咁做。**
