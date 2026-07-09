import { PrismaClient } from "@prisma/client";
import { addDaysToDateInput, displayDate, parseServiceDate, todayDateInput } from "../src/lib/dates";
import { buildIdentityKey, generateBookingCode } from "../src/lib/identity";

const prisma = new PrismaClient();

function dateInput(offset: number) {
  return parseServiceDate(addDaysToDateInput(todayDateInput(), offset));
}

async function main() {
  const tomorrow = dateInput(1);

  const defaultTemplates = [
    { routeName: "07:30 員工車", departureTime: "07:30", pickupPoint: "員工宿舍", defaultCapacity: 20, waitlistEnabled: true, note: "早班上班車" },
    { routeName: "08:30 員工車", departureTime: "08:30", pickupPoint: "員工宿舍", defaultCapacity: 20, waitlistEnabled: true, note: "日班上班車" },
    { routeName: "17:30 員工車", departureTime: "17:30", pickupPoint: "飯店側門", defaultCapacity: 18, waitlistEnabled: true, note: "下班車" },
    { routeName: "18:30 員工車", departureTime: "18:30", pickupPoint: "飯店側門", defaultCapacity: 18, waitlistEnabled: true, note: "下班車" },
  ];

  for (const template of defaultTemplates) {
    const exists = await prisma.scheduleTemplate.findFirst({
      where: { routeName: template.routeName, departureTime: template.departureTime },
    });
    if (!exists) {
      await prisma.scheduleTemplate.create({ data: template });
    }
  }

  const templates = await prisma.scheduleTemplate.findMany({ where: { active: true }, orderBy: { departureTime: "asc" } });

  for (const template of templates) {
    const existing = await prisma.shuttleSchedule.findFirst({
      where: {
        serviceDate: tomorrow,
        routeName: template.routeName,
        departureTime: template.departureTime,
      },
    });

    if (!existing) {
      await prisma.shuttleSchedule.create({
        data: {
          serviceDate: tomorrow,
          routeName: template.routeName,
          departureTime: template.departureTime,
          pickupPoint: template.pickupPoint,
          capacity: template.defaultCapacity,
          waitlistEnabled: template.waitlistEnabled,
          registrationOpen: true,
          note: template.note,
        },
      });
    }
  }

  const firstSchedule = await prisma.shuttleSchedule.findFirst({
    where: { serviceDate: tomorrow, departureTime: "07:30" },
  });

  if (firstSchedule) {
    const employees = [
      { employeeName: "王小明", department: "房務部", employeeNo: "H001", phone: "0911000001", status: "confirmed" as const },
      { employeeName: "陳小美", department: "餐飲部", employeeNo: "F002", phone: "0911000002", status: "confirmed" as const },
      { employeeName: "林小華", department: "櫃檯部", employeeNo: "G003", phone: "0911000003", status: "waitlist" as const },
      { employeeName: "張志偉", department: "工程部", employeeNo: "E004", phone: "0911000004", status: "cancelled" as const },
    ];

    for (const employee of employees) {
      const identityKey = buildIdentityKey(employee);
      const exists = await prisma.booking.findFirst({
        where: { scheduleId: firstSchedule.id, identityKey },
      });

      if (!exists) {
        await prisma.booking.create({
          data: {
            scheduleId: firstSchedule.id,
            employeeName: employee.employeeName,
            department: employee.department,
            employeeNo: employee.employeeNo,
            phone: employee.phone,
            status: employee.status,
            bookingCode: generateBookingCode(),
            identityKey,
            note: employee.status === "cancelled" ? "seed 取消樣本" : "seed 樣本",
            createdBy: "admin",
            cancelledAt: employee.status === "cancelled" ? new Date() : null,
          },
        });
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "seed.run",
      targetType: "system",
      source: "seed",
      newValue: { serviceDate: displayDate(tomorrow) },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
