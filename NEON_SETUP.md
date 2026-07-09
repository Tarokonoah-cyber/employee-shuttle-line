# Neon / Vercel 設定備忘

## 必填環境變數

```env
DATABASE_URL="Neon pooled connection"
DIRECT_URL="Neon direct connection"
ADMIN_PASSWORD="後台登入密碼"
ADMIN_SESSION_SECRET="長隨機字串，用於 cookie 簽章"
NEXT_PUBLIC_APP_NAME="員工車上車登記系統"
```

## 連線字串怎麼選

- `DATABASE_URL` 使用 Neon pooled connection，hostname 通常包含 `-pooler`。
- `DIRECT_URL` 使用 Neon direct connection，hostname 通常不包含 `-pooler`。

## 第一次部署流程

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

`npm run db:seed` 只在需要建立測試資料時執行。

## 安全提醒

`.env`、真實 Neon 密碼、真實後台密碼不可提交到 GitHub。
