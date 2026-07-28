import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGroBookingMessage,
  buildScheduleCancellationMessage,
  groNotificationTargets,
  lineNotificationReadiness,
  lineRetryKey,
  resolveGroNotificationTargets,
  sendLinePush,
} from "./line-notification";

const userTarget = `U${"a".repeat(32)}`;
const groupTarget = `C${"b".repeat(32)}`;

test("GRO targets accept LINE users and groups, remove duplicates, and reject malformed values", () => {
  assert.deepEqual(
    groNotificationTargets(`${userTarget}, ${groupTarget};${userTarget} invalid`),
    [userTarget, groupTarget],
  );
});

test("admin-managed GRO recipients override environment targets", () => {
  assert.deepEqual(
    resolveGroNotificationTargets({
      managedInAdmin: true,
      databaseTargets: [userTarget, userTarget, "invalid"],
      environmentTargets: groupTarget,
    }),
    [userTarget],
  );
});

test("admin can intentionally configure no GRO recipients", () => {
  assert.deepEqual(
    resolveGroNotificationTargets({
      managedInAdmin: true,
      databaseTargets: [],
      environmentTargets: groupTarget,
    }),
    [],
  );
});

test("LINE readiness reports the active admin-managed recipient count", () => {
  const readiness = lineNotificationReadiness({ managedInAdmin: true, databaseTargetCount: 2 });
  assert.equal(readiness.source, "admin");
  assert.equal(readiness.groTargetCount, 2);
});

test("new-booking notice contains the operational fields GRO needs", () => {
  const message = buildGroBookingMessage({
    id: "booking_1",
    bookingCode: "BK123456",
    employeeName: "王小明",
    department: "房務部",
    employeeNo: "E001",
    phone: "0912345678",
    status: "confirmed",
    schedule: {
      id: "schedule_1",
      serviceDate: new Date("2026-07-28T00:00:00.000Z"),
      routeName: "太魯閣線",
      departureTime: "07:30",
      pickupPoint: "員工宿舍",
    },
  });

  assert.match(message, /【員工車新預約】/);
  assert.match(message, /2026-07-28/);
  assert.match(message, /07:30 太魯閣線/);
  assert.match(message, /王小明/);
  assert.match(message, /房務部/);
  assert.match(message, /正取/);
  assert.match(message, /BK123456/);
});

test("schedule cancellation notice is explicit and does not ask the user to cancel again", () => {
  const message = buildScheduleCancellationMessage({
    id: "schedule_1",
    serviceDate: new Date("2026-07-28T00:00:00.000Z"),
    routeName: "太魯閣線",
    departureTime: "07:30",
    pickupPoint: "員工宿舍",
  });

  assert.match(message, /【員工車班次取消通知】/);
  assert.match(message, /已取消/);
  assert.match(message, /無須再自行取消/);
});

test("LINE retry key is deterministic and UUID-shaped", () => {
  const first = lineRetryKey("notification_1");
  assert.equal(first, lineRetryKey("notification_1"));
  assert.notEqual(first, lineRetryKey("notification_2"));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("LINE push uses the configured token, stable retry key, and target", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const result = await sendLinePush(
    {
      notificationId: "notification_1",
      target: userTarget,
      message: "測試通知",
      accessToken: "runtime-secret",
    },
    (async (input, init) => {
      requests.push({ url: String(input), init });
      return new Response("{}", { status: 200 });
    }) as typeof fetch,
  );

  const request = requests[0];
  assert.ok(request);
  assert.equal(result.sent, true);
  assert.equal(request.url, "https://api.line.me/v2/bot/message/push");
  assert.equal(new Headers(request.init?.headers).get("Authorization"), "Bearer runtime-secret");
  assert.equal(new Headers(request.init?.headers).get("X-Line-Retry-Key"), lineRetryKey("notification_1"));
  assert.deepEqual(JSON.parse(String(request.init?.body)), {
    to: userTarget,
    messages: [{ type: "text", text: "測試通知" }],
    notificationDisabled: false,
  });
});

test("LINE duplicate retry response is treated as already delivered", async () => {
  const result = await sendLinePush(
    {
      notificationId: "notification_1",
      target: groupTarget,
      message: "測試通知",
      accessToken: "runtime-secret",
    },
    (async () => new Response("{}", { status: 409 })) as typeof fetch,
  );
  assert.equal(result.sent, true);
});
