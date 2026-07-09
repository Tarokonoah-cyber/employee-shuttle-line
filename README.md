# 員工車上車登記系統

正式可營運的 Next.js App Router 專案，提供員工前台登記、GRO 後台管理、PostgreSQL/Prisma 資料模型、名額控管、候補管理、CSV 匯出、LINE 群組公告文字產生與操作紀錄。

## 技術

- Next.js 16 App Router
- TypeScript
- PostgreSQL
- Prisma 6
- lucide-react
- Tailwind CSS 4

## 環境變數

複製 `.env.example` 為 `.env`，並填入：

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/employee_shuttle?schema=public"
ADMIN_PASSWORD="change-this-admin-password"
NEXT_PUBLIC_APP_NAME="員工車上車登記系統"
```

若本機沒有設定 `ADMIN_PASSWORD`，開發登入密碼會 fallback 為 `admin`。正式環境請務必設定強密碼。

## 安裝

```bash
npm install
npm run prisma:generate
```

## 建立資料表

開發環境：

```bash
npm run prisma:dev
```

正式/部署環境：

```bash
npm run prisma:migrate
```

本專案的 migration 會建立 partial unique index：

```sql
CREATE UNIQUE INDEX "bookings_schedule_identity_active_unique"
ON "bookings"("schedule_id", "identity_key")
WHERE "status" <> 'cancelled';
```

用來防止同一車班非取消狀態重複登記。

## 匯入 Seed Data

```bash
npm run db:seed
```

Seed 會建立：

- 預設車班模板：07:30、08:30、17:30、18:30 員工車
- 明日車班
- confirmed / waitlist / cancelled 預約樣本
- seed audit log

## 啟動本機開發

```bash
npm run dev
```

前台：`http://localhost:3000/`

後台：`http://localhost:3000/admin`

## Build

```bash
npm run build
```

## 部署到 Vercel

1. 在 Vercel 建立 PostgreSQL 資料庫或連接既有 PostgreSQL。
2. 在 Vercel Project Settings 設定 `DATABASE_URL`、`ADMIN_PASSWORD`、`NEXT_PUBLIC_APP_NAME`。
3. 部署後執行 migration：

```bash
npm run prisma:migrate
```

4. 需要初始資料時執行：

```bash
npm run db:seed
```

## 功能摘要

- `/`：員工登記前台，預設明日車班，可切換日期。
- `/booking/success`：登記結果頁。
- `/admin`：後台登入頁。
- `/admin/dashboard`：明日營運摘要、注意車班、最新預約。
- `/admin/schedules`：車班新增、編輯、關閉、刪除與快速建立明日車班。
- `/admin/templates`：車班模板管理。
- `/admin/bookings`：預約名單篩選、手動新增、取消、候補轉正取、強制轉正取、改車班、CSV 匯出、複製 LINE 公告。
- `/admin/audit-logs`：操作紀錄查詢。

LINE Messaging API 尚未串接；目前只建立 `notification_logs` 與 `src/lib/line-notification.ts` 作為未來擴充點。
