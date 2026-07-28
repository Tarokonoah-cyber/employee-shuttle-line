import { normalizeDepartureTime } from "./schedule-time";

export const APP_TIME_ZONE = "Asia/Taipei";
export const DEFAULT_REGISTRATION_CUTOFF_DAY_OFFSET = 1;
export const DEFAULT_REGISTRATION_CUTOFF_TIME = "20:00";

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

export function registrationDeadlineFromRule(serviceDate: Date | string, dayOffset: number, cutoffTime: string) {
  if (!Number.isInteger(dayOffset) || dayOffset < 0 || dayOffset > 1) {
    throw new Error("截止日期只能選擇發車當日或前一天");
  }

  const cutoffDate = addDaysToDateInput(displayDate(serviceDate), -dayOffset);
  return taipeiScheduleDateTime(cutoffDate, cutoffTime);
}

export function resolveBookingDeadline(schedule: {
  serviceDate: Date | string;
  departureTime: string;
  registrationDeadline?: Date | string | null;
}) {
  if (schedule.registrationDeadline) {
    const configured = schedule.registrationDeadline instanceof Date
      ? schedule.registrationDeadline
      : new Date(schedule.registrationDeadline);
    if (!Number.isNaN(configured.getTime())) return configured;
  }

  return bookingDeadline(schedule.serviceDate, schedule.departureTime);
}

export function registrationDeadlineRule(serviceDate: Date | string, deadline: Date | string) {
  const configured = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(configured.getTime())) {
    return {
      dayOffset: DEFAULT_REGISTRATION_CUTOFF_DAY_OFFSET,
      time: DEFAULT_REGISTRATION_CUTOFF_TIME,
    };
  }

  const deadlineDate = formatDateInput(configured);
  const serviceDateInput = displayDate(serviceDate);
  const dayOffset = Math.round(
    (parseServiceDate(serviceDateInput).getTime() - parseServiceDate(deadlineDate).getTime()) / 86_400_000,
  );
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(configured);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  return {
    dayOffset: dayOffset === 0 ? 0 : DEFAULT_REGISTRATION_CUTOFF_DAY_OFFSET,
    time: hour && minute ? `${hour}:${minute}` : DEFAULT_REGISTRATION_CUTOFF_TIME,
  };
}

export function taipeiDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function taipeiDateTimeShort(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: APP_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
