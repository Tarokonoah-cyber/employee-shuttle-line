import { z } from "zod";

const optionalText = z.string().trim().optional().nullable().transform((value) => value || null);

export const bookingInputSchema = z.object({
  scheduleId: z.string().min(1, "請選擇車班"),
  employeeName: z.string().trim().min(1, "請填寫員工姓名"),
  department: z.string().trim().min(1, "請填寫部門"),
  employeeNo: optionalText,
  phone: optionalText,
  note: optionalText,
});

export const adminBookingInputSchema = bookingInputSchema.extend({
  adminOverride: z.boolean().optional().default(false),
});

export const scheduleInputSchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式不正確"),
  routeName: z.string().trim().min(1, "請填寫車班名稱"),
  departureTime: z.string().trim().min(1, "請填寫發車時間"),
  pickupPoint: z.string().trim().min(1, "請填寫上車點"),
  capacity: z.coerce.number().int().min(1, "名額至少為 1"),
  registrationOpen: z.boolean().optional().default(true),
  waitlistEnabled: z.boolean().optional().default(true),
  note: optionalText,
});

export const templateInputSchema = z.object({
  routeName: z.string().trim().min(1, "請填寫模板名稱"),
  departureTime: z.string().trim().min(1, "請填寫發車時間"),
  pickupPoint: z.string().trim().min(1, "請填寫上車點"),
  defaultCapacity: z.coerce.number().int().min(1, "預設名額至少為 1"),
  waitlistEnabled: z.boolean().optional().default(true),
  note: optionalText,
  active: z.boolean().optional().default(true),
});

export const updateBookingSchema = z.object({
  employeeName: z.string().trim().min(1, "請填寫員工姓名").optional(),
  department: z.string().trim().min(1, "請填寫部門").optional(),
  employeeNo: optionalText.optional(),
  phone: optionalText.optional(),
  note: optionalText.optional(),
});
