import { z } from "zod";
import { normalizeDepartureTime } from "./schedule-time";

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value || null);

const optionalLimitedText = (max: number) => z.string().trim().max(max).optional().nullable().transform((value) => value || null);
const optionalPhone = z.string().trim().max(30).refine(
  (value) => !value || /^[0-9+()\-\s]{7,30}$/.test(value),
  "手機格式不正確",
).optional().nullable().transform((value) => value || null);

const departureTimeInput = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeDepartureTime(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "發車時間格式需為 HH:mm" });
      return z.NEVER;
    }

    return normalized;
  });

export const bookingInputSchema = z.object({
  scheduleId: z.string().min(1, "請選擇車班"),
  employeeName: z.string().trim().min(1, "請填寫姓名").max(80, "姓名過長"),
  department: z.string().trim().min(1, "請填寫部門").max(80, "部門名稱過長"),
  employeeNo: optionalLimitedText(50),
  phone: optionalPhone,
  note: optionalLimitedText(500),
});

export const adminBookingInputSchema = bookingInputSchema.extend({
  adminOverride: z.boolean().optional().default(false),
});

export const scheduleInputSchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式需為 YYYY-MM-DD"),
  routeName: z.string().trim().min(1, "請填寫車班名稱"),
  departureTime: departureTimeInput,
  pickupPoint: z.string().trim().min(1, "請填寫上車點"),
  capacity: z.coerce.number().int().min(1, "名額至少為 1"),
  registrationOpen: z.boolean().optional().default(true),
  waitlistEnabled: z.boolean().optional().default(true),
  cancelled: z.boolean().optional().default(false),
  note: optionalText,
});

export const templateInputSchema = z.object({
  routeName: z.string().trim().min(1, "請填寫範本名稱"),
  departureTime: departureTimeInput,
  pickupPoint: z.string().trim().min(1, "請填寫上車點"),
  defaultCapacity: z.coerce.number().int().min(1, "預設名額至少為 1"),
  waitlistEnabled: z.boolean().optional().default(true),
  note: optionalText,
  active: z.boolean().optional().default(true),
});

export const updateBookingSchema = z.object({
  employeeName: z.string().trim().min(1, "請填寫姓名").optional(),
  department: z.string().trim().min(1, "請填寫部門").optional(),
  employeeNo: optionalText.optional(),
  phone: optionalText.optional(),
  note: optionalText.optional(),
});
