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
