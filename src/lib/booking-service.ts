import { Prisma, type Booking, type ShuttleSchedule } from "@prisma/client";
import { bookingDeadline } from "./dates";
import { buildIdentityKey, generateBookingCode } from "./identity";
import { generateManagementToken, hashManagementToken } from "./management-token";
import { getPrisma } from "./prisma";

export type ScheduleWithCounts = ShuttleSchedule & {
  confirmedCount: number;
  waitlistCount: number;
  cancelledCount: number;
  remainingCount: number;
  isFull: boolean;
  isOverbooked: boolean;
  registrationDeadline: Date;
  isRegistrationClosedByTime: boolean;
};

type Tx = Prisma.TransactionClient;

export class BusinessError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isPrismaKnownError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function toJson(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function bookingAuditSnapshot(booking: Booking) {
  return {
    id: booking.id,
    scheduleId: booking.scheduleId,
    status: booking.status,
    adminOverride: booking.adminOverride,
    createdBy: booking.createdBy,
    cancelledAt: booking.cancelledAt,
    cancellationSource: booking.cancellationSource,
    promotedAt: booking.promotedAt,
    hasManagementToken: Boolean(booking.managementTokenHash),
  };
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
      const registrationDeadline = bookingDeadline(schedule.serviceDate, schedule.departureTime);

      return {
        ...schedule,
        confirmedCount,
        waitlistCount,
        cancelledCount,
        remainingCount,
        isFull: confirmedCount >= schedule.capacity,
        isOverbooked: confirmedCount > schedule.capacity,
        registrationDeadline,
        isRegistrationClosedByTime: Date.now() >= registrationDeadline.getTime(),
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

  if (schedule.cancelledAt && !input.adminOverride) {
    throw new BusinessError("此車班已取消");
  }

  if (input.createdBy === "employee" && Date.now() >= bookingDeadline(schedule.serviceDate, schedule.departureTime).getTime()) {
    throw new BusinessError("此車班已超過報名截止時間");
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

  const managementToken = generateManagementToken();
  const booking = await tx.booking
    .create({
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
        managementTokenHash: hashManagementToken(managementToken),
        managementTokenCreatedAt: new Date(),
      },
      include: { schedule: true },
    })
    .catch((error) => {
      if (isPrismaKnownError(error, "P2002")) {
        throw new BusinessError("你已經登記過此車班");
      }

      throw error;
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

  return { booking, managementToken };
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
  try {
    return await prisma.$transaction(
      (tx) => createBookingInTransaction(tx, { ...input, createdBy: "employee" }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isPrismaKnownError(error, "P2002")) throw new BusinessError("你已經登記過此車班");
    throw error;
  }
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
  try {
    return await prisma.$transaction(
      (tx) => createBookingInTransaction(tx, { ...input, createdBy: "admin" }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isPrismaKnownError(error, "P2002")) throw new BusinessError("你已經登記過此車班");
    throw error;
  }
}

export async function cancelBooking(
  id: string,
  options: {
    source?: "employee" | "admin" | "system";
    enforceDeadline?: boolean;
    expectedTokenHash?: string;
    now?: Date;
  } = {},
) {
  const prisma = getPrisma();
  const locator = await prisma.booking.findUnique({ where: { id }, select: { scheduleId: true } });
  if (!locator) throw new BusinessError("找不到預約", 404);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM shuttle_schedules WHERE id = ${locator.scheduleId} FOR UPDATE`;
          await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${id} FOR UPDATE`;

          const booking = await tx.booking.findUnique({ where: { id }, include: { schedule: true } });
          if (!booking) throw new BusinessError("找不到預約", 404);
          if (options.expectedTokenHash && booking.managementTokenHash !== options.expectedTokenHash) {
            throw new BusinessError("無法使用此管理連結", 404);
          }
          if (booking.status === "cancelled") return { cancelled: booking, promoted: null, alreadyCancelled: true };

          const now = options.now ?? new Date();
          if (options.enforceDeadline && booking.schedule.cancelledAt) {
            throw new BusinessError("此班次已取消，無法再取消報名", 409);
          }
          if (options.enforceDeadline && now.getTime() >= bookingDeadline(booking.schedule.serviceDate, booking.schedule.departureTime).getTime()) {
            throw new BusinessError("已超過可取消時間", 409);
          }

          const cancelled = await tx.booking.update({
            where: { id },
            data: {
              status: "cancelled",
              cancelledAt: now,
              cancellationSource: options.source ?? "admin",
            },
            include: { schedule: true },
          });

          await logAudit(tx, {
            action: "booking.cancel",
            targetType: "booking",
            targetId: id,
            oldValue: bookingAuditSnapshot(booking),
            newValue: bookingAuditSnapshot(cancelled),
            source: options.source ?? "admin",
          });

          let promoted: (Booking & { schedule: ShuttleSchedule }) | null = null;
          if (booking.status === "confirmed") {
            const confirmedCount = await tx.booking.count({ where: { scheduleId: booking.scheduleId, status: "confirmed" } });
            if (confirmedCount < booking.schedule.capacity) {
              const nextWaitlist = await tx.booking.findFirst({
                where: { scheduleId: booking.scheduleId, status: "waitlist" },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                include: { schedule: true },
              });

              if (nextWaitlist) {
                promoted = await tx.booking.update({
                  where: { id: nextWaitlist.id },
                  data: { status: "confirmed", promotedAt: now },
                  include: { schedule: true },
                });
                await logAudit(tx, {
                  action: "booking.auto_promote_waitlist",
                  targetType: "booking",
                  targetId: nextWaitlist.id,
                  oldValue: bookingAuditSnapshot(nextWaitlist),
                  newValue: bookingAuditSnapshot(promoted),
                  source: options.source ?? "admin",
                });
              }
            }
          }

          return { cancelled, promoted, alreadyCancelled: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (!(isPrismaKnownError(error, "P2034") && attempt < 2)) throw error;
    }
  }

  throw new BusinessError("取消處理忙碌中，請稍後再試", 503);
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
        data: { status: "confirmed", adminOverride: adminOverride ? true : booking.adminOverride, promotedAt: new Date() },
        include: { schedule: true },
      });

      await logAudit(tx, {
        action: adminOverride ? "booking.force_confirm" : "booking.confirm",
        targetType: "booking",
        targetId: id,
        oldValue: bookingAuditSnapshot(booking),
        newValue: bookingAuditSnapshot(updated),
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
      oldValue: bookingAuditSnapshot(booking),
      newValue: bookingAuditSnapshot(updated),
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
          promotedAt: null,
          adminOverride: adminOverride ? true : booking.adminOverride,
        },
        include: { schedule: true },
      });

      await logAudit(tx, {
        action: adminOverride ? "booking.force_change_schedule" : "booking.change_schedule",
        targetType: "booking",
        targetId: id,
        oldValue: bookingAuditSnapshot(booking),
        newValue: bookingAuditSnapshot(updated),
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
