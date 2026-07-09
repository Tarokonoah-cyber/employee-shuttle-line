import { Prisma, type Booking, type ShuttleSchedule } from "@prisma/client";
import { buildIdentityKey, generateBookingCode } from "./identity";
import { getPrisma } from "./prisma";

export type ScheduleWithCounts = ShuttleSchedule & {
  confirmedCount: number;
  waitlistCount: number;
  cancelledCount: number;
  remainingCount: number;
  isFull: boolean;
  isOverbooked: boolean;
};

type Tx = Prisma.TransactionClient;

export class BusinessError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function toJson(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function logAudit(
  tx: Tx,
  input: {
    action: string;
    targetType: string;
    targetId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    source?: string;
  },
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      oldValue: toJson(input.oldValue),
      newValue: toJson(input.newValue),
      source: input.source ?? "system",
    },
  });
}

export async function decorateSchedules<T extends ShuttleSchedule>(schedules: T[]) {
  const prisma = getPrisma();

  return Promise.all(
    schedules.map(async (schedule) => {
      const grouped = await prisma.booking.groupBy({
        by: ["status"],
        where: { scheduleId: schedule.id },
        _count: { status: true },
      });

      const confirmedCount = grouped.find((row) => row.status === "confirmed")?._count.status ?? 0;
      const waitlistCount = grouped.find((row) => row.status === "waitlist")?._count.status ?? 0;
      const cancelledCount = grouped.find((row) => row.status === "cancelled")?._count.status ?? 0;
      const remainingCount = Math.max(schedule.capacity - confirmedCount, 0);

      return {
        ...schedule,
        confirmedCount,
        waitlistCount,
        cancelledCount,
        remainingCount,
        isFull: confirmedCount >= schedule.capacity,
        isOverbooked: confirmedCount > schedule.capacity,
      };
    }),
  );
}

async function createBookingInTransaction(
  tx: Tx,
  input: {
    scheduleId: string;
    employeeName: string;
    department: string;
    employeeNo?: string | null;
    phone?: string | null;
    note?: string | null;
    createdBy: "employee" | "admin";
    adminOverride?: boolean;
  },
) {
  await tx.$queryRaw`SELECT id FROM shuttle_schedules WHERE id = ${input.scheduleId} FOR UPDATE`;

  const schedule = await tx.shuttleSchedule.findUnique({ where: { id: input.scheduleId } });
  if (!schedule) {
    throw new BusinessError("找不到車班", 404);
  }

  if (!schedule.registrationOpen && !input.adminOverride) {
    throw new BusinessError("此車班已關閉登記");
  }

  const identityKey = buildIdentityKey(input);
  const duplicate = await tx.booking.findFirst({
    where: {
      scheduleId: input.scheduleId,
      identityKey,
      status: { not: "cancelled" },
    },
  });

  if (duplicate) {
    throw new BusinessError("你已經登記過此車班");
  }

  const confirmedCount = await tx.booking.count({
    where: { scheduleId: input.scheduleId, status: "confirmed" },
  });

  let status: "confirmed" | "waitlist";
  const adminOverride = Boolean(input.adminOverride);

  if (adminOverride) {
    status = "confirmed";
  } else if (confirmedCount < schedule.capacity) {
    status = "confirmed";
  } else if (schedule.waitlistEnabled) {
    status = "waitlist";
  } else {
    throw new BusinessError("此車班已額滿且未開放候補");
  }

  const booking = await tx.booking.create({
    data: {
      scheduleId: input.scheduleId,
      employeeName: input.employeeName.trim(),
      department: input.department.trim(),
      employeeNo: input.employeeNo?.trim() || null,
      phone: input.phone?.trim() || null,
      note: input.note?.trim() || null,
      createdBy: input.createdBy,
      identityKey,
      bookingCode: generateBookingCode(),
      status,
      adminOverride,
    },
    include: { schedule: true },
  });

  await logAudit(tx, {
    action: adminOverride ? "booking.force_create" : "booking.create",
    targetType: "booking",
    targetId: booking.id,
    newValue: {
      scheduleId: input.scheduleId,
      status,
      adminOverride,
      employeeName: booking.employeeName,
      department: booking.department,
    },
    source: input.createdBy,
  });

  return booking;
}

export async function createEmployeeBooking(input: {
  scheduleId: string;
  employeeName: string;
  department: string;
  employeeNo?: string | null;
  phone?: string | null;
  note?: string | null;
}) {
  const prisma = getPrisma();
  return prisma.$transaction(
    (tx) => createBookingInTransaction(tx, { ...input, createdBy: "employee" }),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function createAdminBooking(input: {
  scheduleId: string;
  employeeName: string;
  department: string;
  employeeNo?: string | null;
  phone?: string | null;
  note?: string | null;
  adminOverride?: boolean;
}) {
  const prisma = getPrisma();
  return prisma.$transaction(
    (tx) => createBookingInTransaction(tx, { ...input, createdBy: "admin" }),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function cancelBooking(id: string) {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new BusinessError("找不到預約", 404);
    if (booking.status === "cancelled") throw new BusinessError("此預約已取消");

    const updated = await tx.booking.update({
      where: { id },
      data: { status: "cancelled", cancelledAt: new Date() },
      include: { schedule: true },
    });

    await logAudit(tx, {
      action: "booking.cancel",
      targetType: "booking",
      targetId: id,
      oldValue: booking,
      newValue: updated,
      source: "admin",
    });

    return updated;
  });
}

export async function confirmWaitlistBooking(id: string, adminOverride = false) {
  const prisma = getPrisma();

  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id }, include: { schedule: true } });
      if (!booking) throw new BusinessError("找不到預約", 404);
      if (booking.status === "cancelled") throw new BusinessError("已取消的預約不可轉正取");
      if (booking.status === "confirmed") return booking;

      await tx.$queryRaw`SELECT id FROM shuttle_schedules WHERE id = ${booking.scheduleId} FOR UPDATE`;

      const confirmedCount = await tx.booking.count({
        where: { scheduleId: booking.scheduleId, status: "confirmed" },
      });

      if (confirmedCount >= booking.schedule.capacity && !adminOverride) {
        throw new BusinessError("此車班已額滿，需勾選強制轉正取才可超收");
      }

      const updated = await tx.booking.update({
        where: { id },
        data: { status: "confirmed", adminOverride: adminOverride ? true : booking.adminOverride },
        include: { schedule: true },
      });

      await logAudit(tx, {
        action: adminOverride ? "booking.force_confirm" : "booking.confirm",
        targetType: "booking",
        targetId: id,
        oldValue: booking,
        newValue: updated,
        source: "admin",
      });

      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function updateBooking(id: string, input: Partial<Pick<Booking, "employeeName" | "department" | "employeeNo" | "phone" | "note">>) {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new BusinessError("找不到預約", 404);

    const data: Prisma.BookingUpdateInput = {
      employeeName: input.employeeName?.trim(),
      department: input.department?.trim(),
      employeeNo: input.employeeNo === undefined ? undefined : input.employeeNo?.trim() || null,
      phone: input.phone === undefined ? undefined : input.phone?.trim() || null,
      note: input.note === undefined ? undefined : input.note?.trim() || null,
    };

    if (input.employeeName !== undefined || input.employeeNo !== undefined || input.phone !== undefined) {
      data.identityKey = buildIdentityKey({
        employeeName: input.employeeName ?? booking.employeeName,
        employeeNo: input.employeeNo === undefined ? booking.employeeNo : input.employeeNo,
        phone: input.phone === undefined ? booking.phone : input.phone,
      });
    }

    const updated = await tx.booking.update({ where: { id }, data, include: { schedule: true } });

    await logAudit(tx, {
      action: "booking.update",
      targetType: "booking",
      targetId: id,
      oldValue: booking,
      newValue: updated,
      source: "admin",
    });

    return updated;
  });
}

export async function changeBookingSchedule(id: string, scheduleId: string, adminOverride = false) {
  const prisma = getPrisma();

  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id }, include: { schedule: true } });
      if (!booking) throw new BusinessError("找不到預約", 404);
      if (booking.status === "cancelled") throw new BusinessError("已取消的預約不可更換車班");

      await tx.$queryRaw`SELECT id FROM shuttle_schedules WHERE id = ${scheduleId} FOR UPDATE`;
      const schedule = await tx.shuttleSchedule.findUnique({ where: { id: scheduleId } });
      if (!schedule) throw new BusinessError("找不到新車班", 404);

      const duplicate = await tx.booking.findFirst({
        where: {
          id: { not: id },
          scheduleId,
          identityKey: booking.identityKey,
          status: { not: "cancelled" },
        },
      });

      if (duplicate) throw new BusinessError("該員工已登記過新車班");

      const confirmedCount = await tx.booking.count({ where: { scheduleId, status: "confirmed" } });
      let status: "confirmed" | "waitlist" = "confirmed";

      if (adminOverride) {
        status = "confirmed";
      } else if (confirmedCount < schedule.capacity) {
        status = "confirmed";
      } else if (schedule.waitlistEnabled) {
        status = "waitlist";
      } else {
        throw new BusinessError("新車班已額滿且未開放候補");
      }

      const updated = await tx.booking.update({
        where: { id },
        data: {
          scheduleId,
          status,
          adminOverride: adminOverride ? true : booking.adminOverride,
        },
        include: { schedule: true },
      });

      await logAudit(tx, {
        action: adminOverride ? "booking.force_change_schedule" : "booking.change_schedule",
        targetType: "booking",
        targetId: id,
        oldValue: booking,
        newValue: updated,
        source: "admin",
      });

      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export function isBusinessError(error: unknown): error is BusinessError {
  return error instanceof BusinessError;
}
