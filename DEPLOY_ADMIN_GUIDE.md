# 2026 Scout System — 平台管理員操作手冊

> 這份是給**平台管理員**(你自己)用的,防止忘記新旅團開通步驟。
> 收到旅團接入申請後,照這份做,約 5 分鐘完成。

---

## 新旅團會怎麼申請?

旅團在 `https://troop-portal.vercel.app/onboard` 走完 6 個步驟後,按「📧 傳送接入資料」。
表單會**直接 POST 到管理員的接收端 Apps Script Web App**(與舊版 Scout Admin APP 同一個):

```
https://script.google.com/macros/s/AKfycbxj5BDDGgjs559smkK4Z5aYImWYeXbN5af8U1ObON0z9WnsN6QJW4I1XWolhs5kQ_H-UQ/exec
```

收到後接收端會:
1. 寫入**你的 Google Sheet「申請記錄」**工作表(提交時間 / 旅團號 / 名稱 / URL / API Key / 備注 / 狀態)
2. **Email 通知你的郵箱**(收件人 = 接收端腳本裡的 `ADMIN_EMAIL`)

> 🔒 旅團端完全看不到你的 email(前端只有一個網址、沒有任何 email),
> 也**不會從旅團的 Google 帳號寄出任何信件** —— 他們的信箱不會有寄件紀錄。
>
> ⚠️ 目前接收端 `ADMIN_EMAIL = playerkousas@hotmail.com`。
> 想換成其他信箱(如 skwddbs@gmail.com):打開接收端的 Apps Script → 改 `ADMIN_EMAIL` 那一行 →
> 部署 → 管理部署 → 新增版本。接收端健康檢查:瀏覽器直接開那個 URL,應回 `{"status":"ok"}`。

---

## 開通流程(5 步)

### Step 1:驗證後台

從「申請記錄」表(或通知 email)拿到旅團的 URL 和 Key,瀏覽器貼上:

```
https://script.google.com/macros/s/.../exec?action=health&apiKey=ak_xxxxxxxx
```

| 回傳 | 代表 | 處理 |
|---|---|---|
| `{"success":true,"version":"3.0-live",...}` | 後台正常 | 繼續 |
| `Unauthorized: invalid or missing apiKey` | Key 不對 | 叫旅團到 Sheet 選單「🔑 安全與連線 → 重新生成 API Key」重發 |
| 回傳 HTML 頁面 | Web App 沒公開 | 叫旅團重新 Deploy → 誰可以存取選「任何人」 |

同時確認旅團身份(名稱、旅團號是否合理、不重複)。

### Step 2:加入旅團登記表

開啟 `lib/troops.ts`,在 `APPROVED_TROOPS` 陣列加入(注意:**不放 API Key**):

```typescript
{
  key: 'troop_0084',      // 固定格式 troop_ + 4 位旅團號
  id: '0084',             // 純數字旅團號
  name: '第84旅',
  webAppUrl: 'https://script.google.com/macros/s/.../exec',
  status: 'active',       // 測試旅團用 'testing'
},
```

### Step 3:Push 上線

```bash
git add lib/troops.ts
git commit -m "接入:第84旅"
git push
```

Vercel 綁定了 GitHub,push 後會自動重新部署前端。

### Step 4:設定 Vercel 環境變數

Vercel Dashboard → `troop-portal` 專案 → **Settings → Environment Variables** → Add:

| 欄位 | 值 |
|---|---|
| Name | `TROOP_0084_APIKEY`(命名規則:`TROOP_` + 旅團號 + `_APIKEY`) |
| Value | 信裡的 `ak_...`(只複製 key 本身,不要帶空格換行) |
| Environments | **Production / Preview / Development 全勾** |

這個變數只有伺服器端讀得到,不會出現在前端 JS。設完 Vercel 會自動 redeploy。

### Step 5:驗證(兩條)

```
https://troop-portal.vercel.app/api/proxy?troopKey=troop_0084&action=proxyDebug
```
→ 應該看到 `"apiKeyFound":true`、`"apiKeyPrefix":"ak_..."`

```
https://troop-portal.vercel.app/api/proxy?troopKey=troop_0084&action=health
```
→ 應該看到 `{"success":true,"version":"3.0-live","action":"health","ready":true}`

最後回覆旅團:「✅ 已開通,到首頁選擇你的旅團,用 email + changeme 登入(登入後請立即改密碼)」。

---

## 日常維護

### 旅團更換 API Key
1. 旅團在 Sheet 選單 → 重新生成 API Key(新 Key 只顯示一次)
2. 旅團重新提交一次 /onboard 表單(或 Email 把新 Key 發給你的通知郵箱)
3. 你 Edit Vercel 的 `TROOP_{旅團號}_APIKEY` 成新值 → 自動 redeploy
4. 舊 Key 立即失效

### 停用旅團
- 暫時停用:`lib/troops.ts` 把該旅團 `status` 改 `'inactive'` + push
- 完全移除:刪掉 `troops.ts` 那一行 + 刪 Vercel 對應 env var + push

### 更新 GS 模板(平台級功能變更)
1. 改 `gs/SCOUTSYSTEM_2_SETUP.gs`
2. `cp gs/SCOUTSYSTEM_2_SETUP.gs public/downloads/SCOUTSYSTEM_2_SETUP.gs.txt`(兩者必須同步)
3. push → 新旅團下載到的就是新版
4. 已接入旅團:通知他們重新貼代碼 + 部署新版本(選「現有部署 → 編輯 → 代碼版本:新增版本」)

### 快速檢查清單

- [ ] health + apiKey 測試通過
- [ ] 驗證旅團身份、旅團號不重複
- [ ] 加入 `lib/troops.ts`
- [ ] git push
- [ ] Vercel env var `TROOP_{旅團號}_APIKEY`(三個 environment 全勾)
- [ ] proxyDebug + health 驗證
- [ ] 回覆旅團

---

## 故障對照表

| 症狀 | 原因 | 處理 |
|---|---|---|
| `旅團 API Key 尚未設定(需要環境變數 TROOP_XXXX_APIKEY)` | Vercel env 沒設或設錯環境 | Step 4 重做,三個 environment 都要勾 |
| `Unauthorized: invalid or missing apiKey` | Key 值與 GS 登記的不符 | 旅團重新生成 Key;注意複製時只取 `ak_...` 本身(GS 已容許前後空白,但仍要乾淨) |
| `Apps Script 未公開(請確認 Deploy → Anyone)` | Web App 部署為「我」 | 旅團重新部署,選「任何人」 |
| `未知旅團,請確認已開通` | troopKey 不在 troops.ts | 確認 Step 2 的 key 格式(`troop_0084`)與首頁下拉值一致 |
| 旅團登入後全部空白 | 帳號角色 / 資料問題 | 用 sheep/0728(技術測試帳號)登入檢查;看 AuditLogs |

## 安全提醒

- API Key **絕不**寫進 git(只進 Vercel env)
- 你的 email 只存在**接收端 Apps Script**(`ADMIN_EMAIL`)與接收端 Sheet,前端與旅團端都看不到
- GS 回傳給前端的 `config` 已自動剝除敏感欄位(STAFF_TOKEN / API_KEY_HASH / 密碼等);管理員要看請直接看 Sheet 的 SystemConfig 表
- 技術測試帳號 `sheep / 0728` 是寫死在代碼的固定後門(不經 Users 表),等同最高權限,不要外流
