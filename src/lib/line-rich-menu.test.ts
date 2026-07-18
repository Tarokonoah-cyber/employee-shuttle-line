import assert from "node:assert/strict";
import test from "node:test";
import { buildLineRichMenu, resolveLineRichMenuUrls } from "./line-rich-menu";

const baseEnv = {
  APP_BASE_URL: "https://employee-shuttle-line-production.up.railway.app",
  NEXT_PUBLIC_LINE_LIFF_ID: "1234567890-AbCdEfGh",
};

test("rich menu covers the 2500x1686 image with six aligned areas", () => {
  const menu = buildLineRichMenu(baseEnv);
  assert.deepEqual(menu.size, { width: 2500, height: 1686 });
  assert.equal(menu.areas.length, 6);
  assert.deepEqual(menu.areas[0].bounds, { x: 0, y: 0, width: 1250, height: 562 });
  assert.deepEqual(menu.areas[5].bounds, { x: 1250, y: 1124, width: 1250, height: 562 });
});

test("repair actions preserve the existing webhook commands", () => {
  const menu = buildLineRichMenu(baseEnv);
  assert.deepEqual(menu.areas[0].action, { type: "message", label: "工程／IT 報修", text: "我要報修" });
  assert.deepEqual(menu.areas[2].action, { type: "message", label: "我的報修", text: "我的報修" });
});

test("shuttle links use verified LIFF entry points", () => {
  assert.deepEqual(resolveLineRichMenuUrls(baseEnv), {
    shuttle: "https://liff.line.me/1234567890-AbCdEfGh",
    myShuttle: "https://liff.line.me/1234567890-AbCdEfGh?view=my-bookings",
    help: "https://employee-shuttle-line-production.up.railway.app/line/help",
    admin: "https://employee-shuttle-line-production.up.railway.app/admin",
  });
});

test("rich menu refuses to fall back to an unverified general URL", () => {
  assert.throws(() => buildLineRichMenu({ APP_BASE_URL: baseEnv.APP_BASE_URL }), /NEXT_PUBLIC_LINE_LIFF_ID/);
});

test("explicit URL overrides must be concrete HTTPS URLs", () => {
  assert.throws(
    () => resolveLineRichMenuUrls({ ...baseEnv, LINE_HELP_URL: "https://example.com/?token={lineToken}" }),
    /placeholder/,
  );
  assert.throws(() => resolveLineRichMenuUrls({ ...baseEnv, LINE_HELP_URL: "http://example.com/help" }), /HTTPS/);
});
