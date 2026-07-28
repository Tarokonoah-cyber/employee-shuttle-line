import assert from "node:assert/strict";
import test from "node:test";
import { buildLineRichMenu, resolveLineRichMenuUrls } from "./line-rich-menu";

const baseEnv = {
  APP_BASE_URL: "https://employee-shuttle-line-production.up.railway.app",
  NEXT_PUBLIC_LINE_LIFF_ID: "1234567890-AbCdEfGh",
};

test("rich menu covers the 2500x1686 image with four aligned areas", () => {
  const menu = buildLineRichMenu(baseEnv);
  assert.deepEqual(menu.size, { width: 2500, height: 1686 });
  assert.equal(menu.areas.length, 4);
  assert.deepEqual(menu.areas[0].bounds, { x: 0, y: 0, width: 1250, height: 843 });
  assert.deepEqual(menu.areas[3].bounds, { x: 1250, y: 843, width: 1250, height: 843 });
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
  });
});

test("rich menu refuses to fall back to an unverified general URL", () => {
  assert.throws(() => buildLineRichMenu({ APP_BASE_URL: baseEnv.APP_BASE_URL }), /NEXT_PUBLIC_LINE_LIFF_ID/);
});

test("menu contains only the four employee-facing actions", () => {
  const menu = buildLineRichMenu(baseEnv);
  assert.deepEqual(menu.areas.map(({ action }) => action.label), [
    "工程／IT 報修",
    "員工車登記",
    "我的報修",
    "我的員工車報名",
  ]);
});
