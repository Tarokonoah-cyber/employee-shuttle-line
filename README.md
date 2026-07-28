# 員工車上車登記系統

正式架構為 GitHub 自動部署至 Railway Web Service，資料儲存在 Railway PostgreSQL。應用程式使用 Next.js 16 App Router、TypeScript、Prisma 及 PostgreSQL。

## Railway production

Railway Web Service 必要變數：

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_PASSWORD=<strong password>
ADMIN_SESSION_SECRET=<long random value>
APP_BASE_URL=https://employee-shuttle-line-production.up.railway.app
NEXT_PUBLIC_APP_NAME=員工車上車登記系統
BOOKING_CUTOFF_MINUTES=60 # 僅供尚未設定個別截止時間的舊車班相容使用
NEXT_PUBLIC_LINE_LIFF_ID=<LIFF ID>
LINE_LOGIN_CHANNEL_ID=<LINE Login channel ID>
LINE_SESSION_SECRET=<至少 32 字元的獨立隨機值>
LINE_IDENTITY_REQUIRED=true
LINE_CHANNEL_ACCESS_TOKEN=<現有官方帳號的 Messaging API channel access token>
LINE_GRO_TARGET_IDS=<初次部署／群組通知的備援 GRO target；多個以逗號分隔>
```

`DATABASE_URL` 必須使用 Railway PostgreSQL reference variable，不要將實際連線字串提交至 repository。Prisma runtime 與 migration 均使用同一個 Railway `DATABASE_URL`，不需要 `DIRECT_URL`。

Repository 內的 `railway.json` 定義：

- Builder：Railpack
- Build：`npm run prisma:generate && npm run build`
- Pre-deploy：`npm run prisma:migrate`（即 `prisma migrate deploy`）
- Start：`npm run start -- -H 0.0.0.0 -p $PORT`
- Health check：`/api/health`

Railway pre-deploy 會在新版本啟動前執行 committed migrations。若 migration 失敗，部署應停止，既有版本繼續服務。

### Production 禁止指令

不得在 Railway production 使用：

```text
prisma migrate dev
prisma db push
prisma migrate reset
npm run seed:demo
npm run db:seed
```

正式環境只能使用 `npx prisma migrate deploy`。

## Local development

1. 從 `.env.example` 建立本機 `.env`，使用獨立的開發資料庫。
2. 安裝、產生 Prisma client 並啟動：

```bash
npm ci
npm run prisma:generate
npm run prisma:dev
npm run dev
```

3. 驗證：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Demo seed 只允許在可安全清除的本機開發資料庫使用：`npm run seed:demo`。

## 員工報名管理

新員工報名完成後會建立高熵管理 token，資料庫只保存 SHA-256 hash。員工可從成功頁複製管理連結與 LINE 通知文字，或前往 `/booking/manage/<token>`。

管理頁只顯示該筆報名的安全資訊、即時計算候補順位，並在該車班的「報名／取消截止時間」前提供自助取消。取消使用 Serializable transaction、schedule row lock 及 idempotent 狀態檢查；正取取消後只遞補第一順位有效候補。

### 車班截止時間

- 新增車班與車班模板都必須設定截止規則，預設為「發車前一天 20:00」。
- 管理介面使用原生時間選擇器並提供常用時段，不需要手動輸入冒號。
- 模板保存「發車當日／前一天＋時間」；快速建立車班時，系統依指定服務日期換算為實際截止時間。
- 發車當日截止時，截止時間必須早於發車時間。
- migration 不改寫既有車班；舊車班若尚未有個別截止時間，才繼續使用 `BOOKING_CUTOFF_MINUTES` 相容規則。管理員編輯並儲存後即改用個別截止時間。

既有 booking 的 token 欄位保持 `NULL`，資料與狀態不會被 migration 修改。GRO 可在後台預約名單逐筆建立或重設管理連結；重設後舊連結立即失效，token hash 不會顯示於後台。

## Health check

`GET /api/health` 只讀檢查資料庫連線及必要 schema 欄位。成功回傳 `200`；資料庫離線或 migration 未完成回傳 `503`。回應不包含連線字串、資料、token 或管理者資訊。

## Production verification

部署後確認：

1. `/api/health` 為 `200`，`database=ok`、`schema=ready`。
2. 首頁無班次時顯示空狀態，不出現 JSON parse error。
3. 建立一筆最小測試報名，確認成功頁、管理頁、LINE 文字與管理連結。
4. 在截止前取消，確認狀態更新；如有候補，只遞補第一順位。
5. 確認 `/admin` 可登入，名單、CSV、LINE 公告、車班與範本功能正常。

## LINE「太魯閣員工服務台」整合

本 repository 只負責員工車網站、Rich Menu 圖檔與建立工具；**沒有新增 LINE webhook**。既有 IT／工程報修專案已經有 Messaging API webhook，請繼續讓同一個 LINE 官方帳號使用唯一入口：

```text
https://line-repair-vercel.vercel.app/api/line/webhook
```

在 LINE Developers Console 的 Messaging API 頁面設定上述 Webhook URL、啟用 `Use webhook`，並關閉會和 webhook 重複回覆的 Greeting message／Auto-reply（若現場仍需自動回覆，請先確認不會重複）。不要把 webhook 改指向本 Railway 專案，也不要建立第三個 LINE 官方帳號。

### Rich Menu 四格動作

Rich Menu 圖為 `public/line/rich-menu-taroko.png`（2500 × 1686、2 欄 × 2 列），可編輯來源為 `assets/line-rich-menu-taroko.svg`。介面只保留四個最常用的員工功能，以大型中英文標題呈現，不放說明句或重複的操作按鈕；各格和 API 點擊區座標完全對齊：

| 位置 | 按鈕 | LINE 動作 | 最終入口 |
| --- | --- | --- | --- |
| 左上 | 工程／IT 報修 | Message：`我要報修` | 既有報修 webhook 依 LINE 使用者產生 `/repair?token=...&view=repair` |
| 右上 | 員工車登記 | URI | `https://liff.line.me/<LIFF_ID>` |
| 左下 | 我的報修 | Message：`我的報修` | 既有報修 webhook 依 LINE 使用者產生 `/repair?token=...&view=mine` |
| 右下 | 我的員工車報名 | URI | `https://liff.line.me/<LIFF_ID>?view=my-bookings` |

LINE Rich Menu 的 URI 是固定網址，不會把 `/?token={lineToken}` 中的 `{lineToken}` 動態替換。員工車入口必須使用正式 LIFF URL；LIFF SDK 取得 ID token 後，後端呼叫 LINE Login `POST /oauth2/v2.1/verify`，核對 `LINE_LOGIN_CHANNEL_ID` 與 token 有效期，再建立本系統的簽章 session。前端 profile、query string 或自行填入的 `lineUserId` 都不可信任。

「我的員工車報名」使用相同 LIFF 身分 session，只查詢 `line_profile_id` 屬於目前 LINE 使用者的報名，並可在原截止規則內取消。舊報名的 `line_profile_id` 維持 `NULL`，不會失效或被自動認領，仍可使用原 `/booking/manage/<token>` 管理連結；既有 `/line/my-bookings` local-storage 相容頁也保留。

### 建立 LINE Login 與 LIFF App

1. 到 LINE Developers Console 建立或選擇 **LINE Login channel**。可與既有 Messaging API channel 放在同一 Provider 下，不需要新增第三個 LINE 官方帳號。
2. 在該 LINE Login channel 的 LIFF 分頁新增 LIFF App：
   - Endpoint URL：`https://employee-shuttle-line-production.up.railway.app/liff`
   - Size：`Full` 或 `Tall`（建議 `Full`）
   - Scopes：勾選 `openid`、`profile`
3. 取得 LIFF ID 與 LINE Login channel ID。不要把 channel secret、ID token 或 access token寫進 repository。
4. Railway Web Service 設定並重新部署：

   ```env
   APP_BASE_URL=https://employee-shuttle-line-production.up.railway.app
   NEXT_PUBLIC_LINE_LIFF_ID=<LIFF ID>
   LINE_LOGIN_CHANNEL_ID=<LINE Login channel ID>
   LINE_SESSION_SECRET=<至少 32 字元的獨立隨機值>
   LINE_IDENTITY_REQUIRED=true
   ```

`NEXT_PUBLIC_LINE_LIFF_ID` 會進入前端 bundle，屬於公開識別碼；`LINE_LOGIN_CHANNEL_ID` 只用於後端驗證 audience；`LINE_SESSION_SECRET` 只存在 Railway server env，用來簽署 `httpOnly`、`sameSite=lax`、production `secure` 的 7 天 session cookie。系統不需要也不儲存 LINE Login channel secret。

部署後使用手機 LINE 點 Rich Menu 驗證：第一次進入顯示「正在辨識 LINE 身分」，填寫姓名、手機、員編與部門後送出；再次從同一 LINE 帳號開啟，欄位應自動帶入。一般瀏覽器直接開 `/` 或 `/liff` 不可偽造 LINE 身分，會提示從官方帳號開啟。

### 用 Messaging API 建立 Rich Menu

1. 確認使用的是**現有報修 LINE 官方帳號**的 Messaging API channel access token。
2. 在本機或受控的部署環境設定 `NEXT_PUBLIC_LINE_LIFF_ID` 與現有官方帳號的 `LINE_CHANNEL_ACCESS_TOKEN`；不要把真實值寫入 `.env.example` 或 commit。
3. 先執行 dry run，檢查四格動作、圖片大小與 URL：

   ```bash
   npm run line:rich-menu
   ```

4. 確認輸出後才建立、上傳圖片並設為該官方帳號的預設 Rich Menu：

   ```bash
   npm run line:rich-menu -- --apply
   ```

腳本依序呼叫 LINE 官方的 validate、create、image upload 與 set-default API，且不會輸出 channel access token。若只想用 LINE Official Account Manager 手動建立，請選 2 × 2 格版型、上傳同一 PNG，並依上表設定 Message／URI 動作；不要同時在 Manager 與 Messaging API 維護兩份預設選單，以免優先順序造成誤判。

員工車兩個入口不可用一般 URI 覆寫，建立工具會強制使用 `NEXT_PUBLIC_LINE_LIFF_ID` 產生的 `liff.line.me` 網址。

### LINE 環境變數放置位置

- Railway 員工車 runtime：需要 `NEXT_PUBLIC_LINE_LIFF_ID`、`LINE_LOGIN_CHANNEL_ID`、`LINE_SESSION_SECRET`、`APP_BASE_URL`，正式啟用時設定 `LINE_IDENTITY_REQUIRED=true`。自動推播需要永久保存 `LINE_CHANNEL_ACCESS_TOKEN`；`LINE_GRO_TARGET_IDS` 作為後台尚未接管時的初始備援，也可保留群組 `groupId`／聊天室 `roomId`，多個值以逗號分隔。
- Vercel 既有報修／webhook 專案：保留既有 `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`，由 webhook 驗證簽章、回覆訊息與產生個人報修連結。
- `LINE_CHANNEL_SECRET` 不應複製到本員工車專案，因為本專案沒有 webhook；所有 secret 僅從環境變數讀取，不可硬編碼。

### 員工車 LINE 自動通知

- USER 預約完成後，資料庫交易先完成並立即回應；GRO 推播在回應送出後執行，不會等待 LINE API 才顯示預約成功。
- 新預約通知只保留狀態、班次、員工與上車資訊四行；後台長網址不顯示在訊息內，改由 LINE 原生「查看名單」快捷按鈕開啟。
- 後台「系統 → LINE 通知管理」可把一位或多位已驗證 LINE 使用者設為 GRO 通知管理員。第一次勾選後，收件人改由後台名單控制；取消最後一位時會明確顯示目前沒有收件人，也可切回 Railway 備援設定。
- 管理員把班次由正常改為取消時，系統只在該次取消狀態轉換觸發通知，對當下仍為正取或候補且有驗證 LINE 身分的 USER 逐一推播。
- 班次取消通知同樣採四行短版，已預約 USER 可由「查看報名」快捷按鈕直接回到個人報名頁。
- LINE 推播使用既有官方帳號的 Messaging API，不新增 webhook，也不改動現有報修 webhook。LINE Login 與 Messaging API channel 必須位於同一 Provider，兩邊 userId 才能對應。
- 每筆推播先寫入 `notification_logs`；傳送使用固定 retry key，暫時性錯誤最多重試三次，成功或失敗均會留下紀錄。USER 封鎖官方帳號時，LINE 可能回應成功但實際不送達。
- 所有瀏覽器資料請求、表單送出與 LIFF 身分初始化都在 2.8 秒內結束 loading；超時會顯示可重試錯誤。LINE token 驗證的伺服器外部請求限制為 1.8 秒，LINE 推播限制為每次 2 秒且在回應後執行。

要在網頁指定個人收件人，請先讓該 GRO 人員從官方帳號開啟一次員工車登記並完成 LINE 身分驗證，再到「LINE 通知管理」點選「設為通知管理員」。後台只顯示遮蔽後的 userId。若改用群組，先讓官方帳號加入 GRO 通知群組，再由現有唯一 webhook 的群組事件取得 `source.groupId` 並放入 `LINE_GRO_TARGET_IDS`；不要把 Railway 設成第二個 webhook URL。

### 資料庫與相容性

Migration `20260718000000_line_user_profiles` 只新增 `line_user_profiles`、nullable `bookings.line_profile_id`、索引與 `ON DELETE SET NULL` 外鍵。既有 booking 不更新、不刪除且仍可在前後台顯示。新 LIFF 報名會在同一個 Serializable transaction 綁定 profile，並記住姓名、手機、員編、部門、常用上車點與最後使用時間；ID token 與 access token 永不寫入資料庫。

新增 API：

- `POST /api/liff/session`：接收 ID token，交由 LINE 平台驗證並建立安全 session。
- `GET /api/me/profile`：讀取本人記憶資料。
- `PATCH /api/me/profile`：更新本人的員工資料，無法指定其他 userId。
- `GET /api/me/bookings`：列出本人已綁定報名。
- `PATCH /api/me/bookings/:id/cancel`：依既有截止與候補規則取消本人的報名。
- `GET /api/admin/line-users`：管理員查看遮蔽 userId、記憶資料、最後使用時間與報名次數。

官方參考：[Using user data in LIFF apps and servers](https://developers.line.biz/en/docs/liff/using-user-profile/)、[Verify ID tokens](https://developers.line.biz/en/docs/line-login/verify-id-token/)、[LIFF API reference](https://developers.line.biz/en/reference/liff/)、[Opening a LIFF app](https://developers.line.biz/en/docs/liff/opening-liff-app/)、[Use rich menus](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/)。
