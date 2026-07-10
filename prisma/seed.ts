import { PrismaClient } from "@prisma/client";
import { addDaysToDateInput, displayDate, parseServiceDate, todayDateInput } from "../src/lib/dates";
import { buildIdentityKey, generateBookingCode } from "../src/lib/identity";

const prisma = new PrismaClient();

type DemoBooking = {
  employeeName: string;
  department: string;
  employeeNo: string;
  phone: string;
  status: "confirmed" | "waitlist" | "cancelled";
  note?: string;
};

const departments = ["房務部", "餐飲部", "櫃檯部", "工程部", "保全組", "財務部", "人資部", "宴會廳"];
const names = [
  "王小明",
  "陳小美",
  "林子豪",
  "張雅婷",
  "黃志偉",
  "李佳蓉",
  "吳宗翰",
  "劉怡君",
  "蔡明哲",
  "許佩珊",
  "鄭宇翔",
  "郭欣怡",
  "周冠廷",
  "謝宜庭",
  "曾俊宏",
  "楊雅雯",
  "羅品妤",
  "方建宏",
  "宋佳樺",
  "邱柏翰",
  "何佩君",
  "廖承恩",
  "葉庭萱",
  "潘柏宇",
  "姚欣潔",
  "沈冠霖",
  "余采蓁",
  "高彥廷",
  "朱怡安",
  "鍾孟儒",
];

function dateInput(offset: number) {
  return parseServiceDate(addDaysToDateInput(todayDateInput(), offset));
}

function demoEmployee(index: number, status: DemoBooking["status"], note?: string): DemoBooking {
  const serial = String(index).padStart(3, "0");
  return {
    employeeName: names[(index - 1) % names.length],
    department: departments[(index - 1) % departments.length],
    employeeNo: `DEMO-${serial}`,
    phone: `0911${String(index).padStart(6, "0")}`,
    status,
    note,
  };
}

async function main() {
  const tomorrow = dateInput(1);

  const templates = [
    { routeName: "07:30 員工車", departureTime: "07:30", pickupPoint: "員工宿舍", defaultCapacity: 20, waitlistEnabled: true, note: "早班上班車" },
    { routeName: "08:30 員工車", departureTime: "08:30", pickupPoint: "員工宿舍", defaultCapacity: 12, waitlistEnabled: true, note: "日班上班車，主管展示：接近額滿" },
    { routeName: "17:30 員工車", departureTime: "17:30", pickupPoint: "飯店側門", defaultCapacity: 6, waitlistEnabled: true, note: "下班車，主管展示：額滿候補" },
    { routeName: "18:30 員工車", departureTime: "18:30", pickupPoint: "飯店側門", defaultCapacity: 18, waitlistEnabled: true, note: "下班車，主管展示：關閉登記" },
  ];

  for (const template of templates) {
    const exists = await prisma.scheduleTemplate.findFirst({
      where: { routeName: template.routeName, departureTime: template.departureTime },
    });

    if (exists) {
      await prisma.scheduleTemplate.update({ where: { id: exists.id }, data: { ...template, active: true } });
    } else {
      await prisma.scheduleTemplate.create({ data: template });
    }
  }

  const scheduleDefinitions = [
    { routeName: "07:30 員工車", departureTime: "07:30", pickupPoint: "員工宿舍", capacity: 20, registrationOpen: true, waitlistEnabled: true, note: "正常登記中，剩餘名額充足" },
    { routeName: "08:30 員工車", departureTime: "08:30", pickupPoint: "員工宿舍", capacity: 12, registrationOpen: true, waitlistEnabled: true, note: "接近額滿，適合展示即時名額" },
    { routeName: "17:30 員工車", departureTime: "17:30", pickupPoint: "飯店側門", capacity: 6, registrationOpen: true, waitlistEnabled: true, note: "已額滿並產生候補名單" },
    { routeName: "18:30 員工車", departureTime: "18:30", pickupPoint: "飯店側門", capacity: 18, registrationOpen: false, waitlistEnabled: true, note: "主管展示：已關閉登記" },
  ];

  const schedules = [];
  for (const schedule of scheduleDefinitions) {
    const existing = await prisma.shuttleSchedule.findFirst({
      where: {
        serviceDate: tomorrow,
        routeName: schedule.routeName,
        departureTime: schedule.departureTime,
      },
    });

    if (existing) {
      schedules.push(await prisma.shuttleSchedule.update({ where: { id: existing.id }, data: schedule }));
    } else {
      schedules.push(await prisma.shuttleSchedule.create({ data: { ...schedule, serviceDate: tomorrow } }));
    }
  }

  const scheduleIds = schedules.map((schedule) => schedule.id);
  await prisma.booking.deleteMany({
    where: {
      scheduleId: { in: scheduleIds },
      employeeNo: { startsWith: "DEMO-" },
    },
  });

  const rosters: Record<string, DemoBooking[]> = {
    "07:30": [
      ...Array.from({ length: 8 }, (_, index) => demoEmployee(index + 1, "confirmed", "demo seed：正常正取")),
      demoEmployee(9, "cancelled", "demo seed：員工已取消"),
    ],
    "08:30": Array.from({ length: 11 }, (_, index) => demoEmployee(index + 10, "confirmed", "demo seed：接近額滿")),
    "17:30": [
      ...Array.from({ length: 6 }, (_, index) => demoEmployee(index + 21, "confirmed", "demo seed：額滿正取")),
      demoEmployee(27, "waitlist", "demo seed：候補第 1 位"),
      demoEmployee(28, "waitlist", "demo seed：候補第 2 位"),
      demoEmployee(29, "waitlist", "demo seed：候補第 3 位"),
      demoEmployee(30, "cancelled", "demo seed：取消後保留紀錄"),
    ],
    "18:30": [
      demoEmployee(31, "confirmed", "demo seed：關閉班次既有正取"),
      demoEmployee(32, "confirmed", "demo seed：關閉班次既有正取"),
    ],
  };

  for (const schedule of schedules) {
    const entries = rosters[schedule.departureTime] ?? [];
    for (const employee of entries) {
      const identityKey = buildIdentityKey(employee);
      await prisma.booking.create({
        data: {
          scheduleId: schedule.id,
          employeeName: employee.employeeName,
          department: employee.department,
          employeeNo: employee.employeeNo,
          phone: employee.phone,
          status: employee.status,
          bookingCode: generateBookingCode(),
          identityKey,
          note: employee.note,
          createdBy: "admin",
          cancelledAt: employee.status === "cancelled" ? new Date() : null,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "seed.demo",
      targetType: "system",
      source: "seed",
      newValue: {
        serviceDate: displayDate(tomorrow),
        schedules: schedules.map((schedule) => ({ id: schedule.id, departureTime: schedule.departureTime })),
        demoBookings: Object.values(rosters).reduce((total, list) => total + list.length, 0),
      },
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
