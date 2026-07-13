import { normalizeDepartureTime } from "./schedule-time";

export const APP_TIME_ZONE = "Asia/Taipei";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateInputFromParts(date: Date) {
  const parts = dateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("日期格式化失敗");
  }

  return `${year}-${month}-${day}`;
}

export function formatDateInput(date: Date) {
  return dateInputFromParts(date);
}

export function addDaysToDateInput(value: string, days: number) {
  const date = parseServiceDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function tomorrowDateInput() {
  return addDaysToDateInput(todayDateInput(), 1);
}

export function todayDateInput() {
  return dateInputFromParts(new Date());
}

export function parseServiceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("日期格式不正確");
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export function displayDate(value: Date | string) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

export function startOfTaipeiDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("日期格式不正確");
  }

  return new Date(Date.UTC(year, month - 1, day, -8, 0, 0, 0));
}

export function taipeiScheduleDateTime(serviceDate: Date | string, departureTime: string) {
  const date = displayDate(serviceDate);
  const normalizedDepartureTime = normalizeDepartureTime(departureTime);
  const match = /^(\d{2}):(\d{2})$/.exec(normalizedDepartureTime ?? "");
  if (!match) throw new Error("發車時間格式不正確");

  const [year, month, day] = date.split("-").map(Number);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!year || !month || !day || hour > 23 || minute > 59) throw new Error("發車時間格式不正確");

  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
}

export function bookingCutoffMinutes() {
  const parsed = Number(process.env.BOOKING_CUTOFF_MINUTES ?? "60");
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 60;
}

export function bookingDeadline(serviceDate: Date | string, departureTime: string, cutoffMinutes = bookingCutoffMinutes()) {
  return new Date(taipeiScheduleDateTime(serviceDate, departureTime).getTime() - cutoffMinutes * 60_000);
}

export function taipeiDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}
