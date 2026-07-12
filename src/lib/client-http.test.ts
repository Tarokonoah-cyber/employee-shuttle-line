import assert from "node:assert/strict";
import test from "node:test";
import { readJsonResponse } from "./client-http";

test("valid JSON response is parsed", async () => {
  const result = await readJsonResponse<{ ok: boolean }>(new Response('{"ok":true}'), "讀取失敗");
  assert.equal(result.ok, true);
});

test("empty response does not expose JSON parse errors", async () => {
  await assert.rejects(() => readJsonResponse(new Response("", { status: 502 }), "讀取失敗"), /讀取失敗（HTTP 502）/);
});

test("non-JSON response becomes a readable error", async () => {
  await assert.rejects(() => readJsonResponse(new Response("Bad gateway", { status: 502 }), "讀取失敗"), /讀取失敗（HTTP 502）/);
});
