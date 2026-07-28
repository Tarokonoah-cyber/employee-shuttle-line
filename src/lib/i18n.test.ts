import assert from "node:assert/strict";
import test from "node:test";
import {
  intlLocale,
  resolveLocale,
  statusTranslationKey,
  supportedLocales,
  translate,
  translateServerError,
} from "./i18n";

test("employee portal supports Chinese, English, and Indonesian", () => {
  assert.deepEqual(supportedLocales, ["zh-TW", "en", "id"]);
  assert.equal(translate("zh-TW", "booking.title"), "員工車登記");
  assert.equal(translate("en", "booking.title"), "Employee Shuttle Booking");
  assert.equal(translate("id", "booking.title"), "Pendaftaran Shuttle Karyawan");
});

test("translations interpolate operational values", () => {
  assert.equal(translate("en", "schedule.total", { count: 3 }), "3 shuttles");
  assert.equal(translate("id", "success.position", { position: 2 }), "Nomor 2");
});

test("browser locale variants resolve to supported locales", () => {
  assert.equal(resolveLocale("zh-Hant-TW"), "zh-TW");
  assert.equal(resolveLocale("en-US"), "en");
  assert.equal(resolveLocale("id-ID"), "id");
  assert.equal(resolveLocale("fr-FR"), null);
  assert.equal(intlLocale("id"), "id-ID");
});

test("known server business errors are localized without changing API payloads", () => {
  assert.equal(
    translateServerError("en", "此車班已取消", "booking.createFailed"),
    "Shuttle cancelled",
  );
  assert.equal(
    translateServerError("id", "已超過可取消時間", "manage.cancelFailed"),
    "Batas pembatalan sudah lewat. Hubungi GRO untuk bantuan.",
  );
  assert.equal(
    translateServerError("zh-TW", "此車班已取消", "booking.createFailed"),
    "此車班已取消",
  );
});

test("status values map to localized dictionary keys", () => {
  assert.equal(statusTranslationKey("waitlist"), "status.waitlist");
  assert.equal(statusTranslationKey("unknown"), "status.closed");
});
