import assert from "node:assert/strict";
import test from "node:test";
import type { LineUserProfile } from "@prisma/client";
import { rememberedLineProfileData } from "./booking-service";
import { lineProfileUpdateSchema, maskLineUserId, publicLineProfile } from "./line-profile";

test("first verified booking remembers normalized employee data", () => {
  const now = new Date("2026-07-18T01:00:00.000Z");
  assert.deepEqual(rememberedLineProfileData({ employeeName: " 王小明 ", department: " 客務部 ", employeeNo: " A123 ", phone: " 0912-345-678 " }, "員工宿舍", now), {
    employeeName: "王小明",
    department: "客務部",
    employeeNo: "A123",
    phone: "0912-345-678",
    defaultPickupLocation: "員工宿舍",
    lastUsedAt: now,
  });
});

test("remembered profile is returned for the same verified session", () => {
  const now = new Date();
  const profile: LineUserProfile = {
    id: "profile_1", lineUserId: `U${"d".repeat(32)}`, lineDisplayName: "LINE 員工", linePictureUrl: null,
    employeeName: "王小明", employeeNo: "A123", department: "客務部", phone: "0912-345-678",
    defaultPickupLocation: "員工宿舍", lastUsedAt: now, createdAt: now, updatedAt: now,
  };
  assert.equal(publicLineProfile(profile).employeeName, "王小明");
  assert.equal(publicLineProfile(profile).department, "客務部");
});

test("profile update rejects spoofed lineUserId and invalid phone", () => {
  assert.throws(() => lineProfileUpdateSchema.parse({ lineUserId: `U${"e".repeat(32)}`, employeeName: "偽造" }));
  assert.throws(() => lineProfileUpdateSchema.parse({ phone: "not-a-phone" }));
  assert.equal(lineProfileUpdateSchema.parse({ phone: "0912 345 678" }).phone, "0912 345 678");
});

test("LINE userId is masked for admin display", () => {
  assert.equal(maskLineUserId("U1234567890abcdef1234567890abcdef"), "U1234…cdef");
});
