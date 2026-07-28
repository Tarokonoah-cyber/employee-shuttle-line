import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

test("rich menu artwork uses large bilingual labels without descriptive copy", () => {
  const artwork = readFileSync(resolve("assets/line-rich-menu-taroko.svg"), "utf8");
  for (const label of [
    "工程 / IT 報修",
    "ENGINEERING / IT REPAIR",
    "員工車登記",
    "SHUTTLE BOOKING",
    "我的報修",
    "MY REPAIR REQUESTS",
    "我的員工車報名",
    "MY SHUTTLE BOOKINGS",
  ]) {
    assert.match(artwork, new RegExp(label.replace("/", "\\/")));
  }
  assert.doesNotMatch(artwork, /class="desc"|class="cta"|開始報修|開啟登記|查看案件|管理報名/);
});

test("rich menu PNG keeps LINE's required dimensions and file limit", () => {
  const image = readFileSync(resolve("public/line/rich-menu-taroko.png"));
  assert.equal(image.readUInt32BE(16), 2500);
  assert.equal(image.readUInt32BE(20), 1686);
  assert.ok(image.byteLength < 1_000_000);
});
