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
BOOKING_CUTOFF_MINUTES=60
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

管理頁只顯示該筆報名的安全資訊、即時計算候補順位，並在 `BOOKING_CUTOFF_MINUTES` 截止前提供自助取消。取消使用 Serializable transaction、schedule row lock 及 idempotent 狀態檢查；正取取消後只遞補第一順位有效候補。

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

### Rich Menu 六格動作

Rich Menu 圖為 `public/line/rich-menu-taroko.png`（2500 × 1686、2 欄 × 3 列），可編輯來源為 `assets/line-rich-menu-taroko.svg`。各格和 API 點擊區座標完全對齊：

| 位置 | 按鈕 | LINE 動作 | 最終入口 |
| --- | --- | --- | --- |
| 左上 | 工程／IT 報修 | Message：`我要報修` | 既有報修 webhook 依 LINE 使用者產生 `/repair?token=...&view=repair` |
| 右上 | 員工車登記 | URI | `https://employee-shuttle-line-production.up.railway.app/` |
| 左中 | 我的報修 | Message：`我的報修` | 既有報修 webhook 依 LINE 使用者產生 `/repair?token=...&view=mine` |
| 右中 | 我的員工車報名 | URI | `https://employee-shuttle-line-production.up.railway.app/line/my-bookings` |
| 左下 | 使用說明 | URI | `https://employee-shuttle-line-production.up.railway.app/line/help` |
| 右下 | 後台入口 | URI | `https://employee-shuttle-line-production.up.railway.app/admin` |

LINE Rich Menu 的 URI 是固定網址，不會把 `/?token={lineToken}` 中的 `{lineToken}` 動態替換。因此目前員工車登記直接使用既有可運作的 `/` 流程，不可在 Rich Menu 寫入 literal placeholder。若日後既有 webhook／LIFF 增加能安全簽發員工車 token 的固定 gateway URL，再透過 `LINE_SHUTTLE_URL` 覆寫；不得把 LINE access token 或使用者 token 寫進圖檔、程式碼或 repository。

「我的員工車報名」不更動資料庫，也不建立可猜測的帳號查詢。新報名成功後，管理 token 會保存在同一個 LINE 內建瀏覽器的 local storage，頁面再呼叫既有 `/api/bookings/manage/<token>`。舊報名可貼上原管理連結匯入；換手機或清除 LINE 瀏覽器資料後仍以原管理連結為準。

### 用 Messaging API 建立 Rich Menu

1. 確認使用的是**現有報修 LINE 官方帳號**的 Messaging API channel access token。
2. 在本機或受控的部署環境設定 `APP_BASE_URL` 與 `LINE_CHANNEL_ACCESS_TOKEN`；不要把真實值寫入 `.env.example` 或 commit。
3. 先執行 dry run，檢查六格動作、圖片大小與 URL：

   ```bash
   npm run line:rich-menu
   ```

4. 確認輸出後才建立、上傳圖片並設為該官方帳號的預設 Rich Menu：

   ```bash
   npm run line:rich-menu -- --apply
   ```

腳本依序呼叫 LINE 官方的 validate、create、image upload 與 set-default API，且不會輸出 channel access token。若只想用 LINE Official Account Manager 手動建立，請選 2 × 3 格版型、上傳同一 PNG，並依上表設定 Message／URI 動作；不要同時在 Manager 與 Messaging API 維護兩份預設選單，以免優先順序造成誤判。

可選 URI 覆寫（全部必須是完整 HTTPS URL）：

```env
LINE_SHUTTLE_URL=
LINE_MY_SHUTTLE_URL=
LINE_HELP_URL=
LINE_ADMIN_URL=
```

### LINE 環境變數放置位置

- Railway 員工車 runtime：Rich Menu 是靜態 URI，本身不需要 `LINE_CHANNEL_SECRET` 或 `LINE_CHANNEL_ACCESS_TOKEN`。只有要從 Railway shell 執行一次建立工具時，才暫時設定 `LINE_CHANNEL_ACCESS_TOKEN`；完成後可移除。
- Vercel 既有報修／webhook 專案：保留既有 `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`，由 webhook 驗證簽章、回覆訊息與產生個人報修連結。
- `LINE_CHANNEL_SECRET` 不應複製到本員工車專案，因為本專案沒有 webhook；所有 secret 僅從環境變數讀取，不可硬編碼。

官方參考：[Rich Menu overview](https://developers.line.biz/en/docs/messaging-api/rich-menus-overview/)、[Use rich menus](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/)、[Messaging API actions](https://developers.line.biz/en/docs/messaging-api/actions/)。
