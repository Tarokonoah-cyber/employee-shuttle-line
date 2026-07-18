import assert from "node:assert/strict";
import test from "node:test";
import { buildLineRichMenu, resolveLineRichMenuUrls } from "./line-rich-menu";

const baseEnv = { APP_BASE_URL: "https://employee-shuttle-line-production.up.railway.app" };

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

test("shuttle links default to the Railway application routes", () => {
  assert.deepEqual(resolveLineRichMenuUrls(baseEnv), {
    shuttle: "https://employee-shuttle-line-production.up.railway.app/",
    myShuttle: "https://employee-shuttle-line-production.up.railway.app/line/my-bookings",
    help: "https://employee-shuttle-line-production.up.railway.app/line/help",
    admin: "https://employee-shuttle-line-production.up.railway.app/admin",
  });
});

test("explicit URL overrides must be concrete HTTPS URLs", () => {
  assert.throws(
    () => resolveLineRichMenuUrls({ ...baseEnv, LINE_SHUTTLE_URL: "https://example.com/?token={lineToken}" }),
    /placeholder/,
  );
  assert.throws(() => resolveLineRichMenuUrls({ ...baseEnv, LINE_HELP_URL: "http://example.com/help" }), /HTTPS/);
});
