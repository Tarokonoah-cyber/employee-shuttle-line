# 員工車上車登記系統

## 架構

Next.js 16 + Prisma + Neon PostgreSQL + Vercel。

本專案保留 Prisma 架構，不使用 Supabase，也不改成 Neon serverless driver。

## Vercel 環境變數

請在 Vercel Project Settings 設定：

```env
DATABASE_URL
DIRECT_URL
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
NEXT_PUBLIC_APP_NAME
```

- `DATABASE_URL`：Neon pooled connection，給網站查詢使用，hostname 通常包含 `-pooler`。
- `DIRECT_URL`：Neon direct connection，給 Prisma migration 使用，hostname 通常不包含 `-pooler`。
- `ADMIN_PASSWORD`：GRO 後台登入密碼。
- `ADMIN_SESSION_SECRET`：後台 cookie 簽章密鑰，請使用長隨機字串。
- `NEXT_PUBLIC_APP_NAME`：網站顯示名稱。

範例請看 `.env.example`。不要把真實 Neon 密碼提交到 GitHub。

## Neon 設定

在 Neon 專案中複製兩種連線字串：

1. Pooled connection 放到 `DATABASE_URL`
2. Direct connection 放到 `DIRECT_URL`

Prisma schema 使用：

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 第一次部署前

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

需要測試資料時：

```bash
npm run db:seed
```

## 本機開發

```bash
npm install
npm run dev
```

若 `3000` 已被其他系統使用，可執行：

```bat
start-dev-3010.cmd
```

然後開啟 `http://127.0.0.1:3010/`。

## 後台入口

```text
/admin
```

開發環境若未設定 `ADMIN_PASSWORD`，可用 `admin` 登入。正式環境必須設定 `ADMIN_PASSWORD` 和 `ADMIN_SESSION_SECRET`，否則會拒絕登入或建立 session。

## 功能

- 員工前台登記車班
- 台灣時區的今天 / 明天日期計算
- 防止重複報名
- 額滿自動進候補
- 取消正取後自動遞補最早候補
- 後台 Dashboard 可選日期
- 車班與模板管理
- 用模板建立指定日期車班，並略過重複車班
- 預約名單篩選、取消、轉正取、強制轉正取、改車班
- CSV 匯出，含 BOM，Excel 可正常顯示中文
- 可貼到 LINE 群組的名單文字
- audit log 操作紀錄
- 預留 LINE notification logs 與 service 架構，尚未串 LINE Messaging API

## 注意事項

以下不可提交到 GitHub：

- `.env`
- `.env.*`
- `.next`
- `node_modules`
- `.vercel`
- `*.log`
- 真實 Neon 連線字串
- 真實密碼

`.env.example` 必須保留，供部署設定參考。
