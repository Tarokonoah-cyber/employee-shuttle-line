import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientRequestTimeoutError,
  fetchWithTimeout,
  readJsonResponse,
  withClientDeadline,
} from "./client-http";

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

test("client requests include the response body inside the same deadline", async () => {
  const response = await fetchWithTimeout(
    "/api/example",
    {},
    100,
    (async () => new Response('{"ok":true}')) as typeof fetch,
  );
  const result = await readJsonResponse<{ ok: boolean }>(response, "讀取失敗");
  assert.equal(result.ok, true);
});

test("client requests stop loading before the configured deadline", async () => {
  const startedAt = Date.now();
  await assert.rejects(
    () => fetchWithTimeout(
      "/api/slow",
      {},
      25,
      ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      })) as typeof fetch,
    ),
    ClientRequestTimeoutError,
  );
  assert.ok(Date.now() - startedAt < 250);
});

test("LIFF operations share a hard client deadline", async () => {
  await assert.rejects(
    () => withClientDeadline(new Promise(() => undefined), 20, "LINE timeout"),
    /LINE timeout/,
  );
});
