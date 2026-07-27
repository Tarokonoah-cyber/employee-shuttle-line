import assert from "node:assert/strict";
import test from "node:test";
import { hasSafeRequestOrigin } from "./request-security";

const originalAppBaseUrl = process.env.APP_BASE_URL;

test.afterEach(() => {
  if (originalAppBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalAppBaseUrl;
});

test("allows requests without an Origin header", () => {
  assert.equal(hasSafeRequestOrigin(new Request("http://internal:3000/api/bookings")), true);
});

test("allows a direct same-origin request", () => {
  const request = new Request("https://shuttle.example/api/bookings", {
    headers: { Origin: "https://shuttle.example" },
  });
  assert.equal(hasSafeRequestOrigin(request), true);
});

test("allows the configured public origin behind a reverse proxy", () => {
  process.env.APP_BASE_URL = "https://employee-shuttle-line-production.up.railway.app";
  const request = new Request("http://internal:3000/api/liff/session", {
    headers: { Origin: "https://employee-shuttle-line-production.up.railway.app" },
  });
  assert.equal(hasSafeRequestOrigin(request), true);
});

test("allows the public origin supplied by trusted reverse-proxy headers", () => {
  delete process.env.APP_BASE_URL;
  const request = new Request("http://internal:3000/api/liff/session", {
    headers: {
      Origin: "https://employee-shuttle-line-production.up.railway.app",
      "X-Forwarded-Host": "employee-shuttle-line-production.up.railway.app",
      "X-Forwarded-Proto": "https",
    },
  });
  assert.equal(hasSafeRequestOrigin(request), true);
});

test("rejects malformed and unrelated origins", () => {
  process.env.APP_BASE_URL = "https://employee-shuttle-line-production.up.railway.app";
  assert.equal(hasSafeRequestOrigin(new Request("http://internal:3000/api/bookings", {
    headers: { Origin: "not-a-url" },
  })), false);
  assert.equal(hasSafeRequestOrigin(new Request("http://internal:3000/api/bookings", {
    headers: { Origin: "https://attacker.example" },
  })), false);
});
