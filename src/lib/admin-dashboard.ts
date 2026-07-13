import type { Booking, BookingStatus, ShuttleSchedule } from "@prisma/client";
import { bookingDeadline, displayDate, tomorrowDateInput } from "./dates";

type StatusCount = {
  status: BookingStatus;
  _count: { status: number };
};

type LatestBookingSource = Pick<
  Booking,
  "id" | "employeeName" | "department" | "status" | "bookingCode" | "createdAt" | "scheduleId"
>;

type LatestScheduleSource = Pick<ShuttleSchedule, "id" | "routeName" | "departureTime">;

export type DashboardSchedule = {
  id: string;
  serviceDate: string;
  routeName: string;
  departureTime: string;
  pickupPoint: string;
  capacity: number;
  registrationOpen: boolean;
  confirmedCount: number;
  waitlistCount: number;
  cancelledCount: number;
  remainingCount: number;
  isFull: boolean;
  isOverbooked: boolean;
  cancelledAt: string | null;
  registrationDeadline: string | null;
  isRegistrationClosedByTime: boolean;
};

export type DashboardLatestBooking = {
  id: string;
  employeeName: string;
  department: string;
  status: BookingStatus;
  bookingCode: string;
  createdAt: string;
  schedule: {
    routeName: string;
    departureTime: string;
  };
};

export type DashboardPayload = {
  date: string;
  summary: {
    confirmed: number;
    waitlist: number;
    cancelled: number;
    remaining: number;
    todayNew: number;
  };
  schedules: DashboardSchedule[];
  latestBookings: DashboardLatestBooking[];
  attention: DashboardSchedule[];
};

export function emptyDashboardPayload(date = tomorrowDateInput(), todayNew = 0): DashboardPayload {
  return {
    date,
    summary: { confirmed: 0, waitlist: 0, cancelled: 0, remaining: 0, todayNew },
    schedules: [],
    latestBookings: [],
    attention: [],
  };
}

export function normalizeDashboardDate(value: string | null) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : tomorrowDateInput();
}

function countFor(rows: StatusCount[], status: BookingStatus) {
  return rows.find((row) => row.status === status)?._count.status ?? 0;
}

function safePositiveInteger(value: number) {
  return Number.isFinite(value) ? Math.max(Math.trunc(value), 0) : 0;
}

function safeTime(value: string | null | undefined) {
  return /^\d{2}:\d{2}$/.test(value ?? "") ? value! : "--:--";
}

function isoOrNull(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
}

export function buildDashboardSchedules(schedules: ShuttleSchedule[], countsByScheduleId: Map<string, StatusCount[]>, now = new Date()) {
  return schedules.map((schedule): DashboardSchedule => {
    const statusCounts = countsByScheduleId.get(schedule.id) ?? [];
    const capacity = safePositiveInteger(schedule.capacity);
    const confirmedCount = countFor(statusCounts, "confirmed");
    const waitlistCount = countFor(statusCounts, "waitlist");
    const cancelledCount = countFor(statusCounts, "cancelled");
    const departureTime = safeTime(schedule.departureTime);
    const remainingCount = Math.max(capacity - confirmedCount, 0);

    let registrationDeadline: Date | null = null;
    if (departureTime !== "--:--") {
      try {
        registrationDeadline = bookingDeadline(schedule.serviceDate, departureTime);
      } catch {
        registrationDeadline = null;
      }
    }

    return {
      id: schedule.id,
      serviceDate: displayDate(schedule.serviceDate),
      routeName: schedule.routeName ?? "",
      departureTime,
      pickupPoint: schedule.pickupPoint ?? "",
      capacity,
      registrationOpen: Boolean(schedule.registrationOpen),
      confirmedCount,
      waitlistCount,
      cancelledCount,
      remainingCount,
      isFull: confirmedCount >= capacity,
      isOverbooked: confirmedCount > capacity,
      cancelledAt: isoOrNull(schedule.cancelledAt),
      registrationDeadline: isoOrNull(registrationDeadline),
      isRegistrationClosedByTime: registrationDeadline ? now.getTime() >= registrationDeadline.getTime() : false,
    };
  });
}

export function buildLatestBookings(bookings: LatestBookingSource[], schedules: LatestScheduleSource[]) {
  const schedulesById = new Map(schedules.map((schedule) => [schedule.id, schedule]));

  return bookings.map((booking): DashboardLatestBooking => {
    const schedule = schedulesById.get(booking.scheduleId);
    return {
      id: booking.id,
      employeeName: booking.employeeName ?? "",
      department: booking.department ?? "",
      status: booking.status,
      bookingCode: booking.bookingCode ?? "",
      createdAt: booking.createdAt.toISOString(),
      schedule: {
        routeName: schedule?.routeName ?? "已刪除班次",
        departureTime: safeTime(schedule?.departureTime),
      },
    };
  });
}

export function buildDashboardPayload(input: {
  date: string;
  schedules: DashboardSchedule[];
  latestBookings: DashboardLatestBooking[];
  todayNew: number;
}): DashboardPayload {
  const summary = input.schedules.reduce(
    (acc, schedule) => {
      acc.confirmed += schedule.confirmedCount;
      acc.waitlist += schedule.waitlistCount;
      acc.cancelled += schedule.cancelledCount;
      acc.remaining += schedule.remainingCount;
      return acc;
    },
    { confirmed: 0, waitlist: 0, cancelled: 0, remaining: 0, todayNew: safePositiveInteger(input.todayNew) },
  );

  return {
    date: input.date,
    summary,
    schedules: input.schedules,
    latestBookings: input.latestBookings,
    attention: input.schedules.filter(
      (schedule) =>
        Boolean(schedule.cancelledAt) ||
        schedule.isFull ||
        schedule.waitlistCount > 0 ||
        !schedule.registrationOpen ||
        schedule.isOverbooked,
    ),
  };
}
