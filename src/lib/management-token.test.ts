import assert from "node:assert/strict";
import test from "node:test";
import { generateManagementToken, hashManagementToken, isManagementToken } from "./management-token";

test("management token uses 32 bytes of base64url entropy", () => {
  const token = generateManagementToken();
  assert.equal(token.length, 43);
  assert.equal(isManagementToken(token), true);
});

test("management tokens are not predictable duplicates", () => {
  const tokens = new Set(Array.from({ length: 64 }, () => generateManagementToken()));
  assert.equal(tokens.size, 64);
});

test("token hash is stable and does not store plaintext", () => {
  const token = generateManagementToken();
  const hash = hashManagementToken(token);
  assert.equal(hash.length, 64);
  assert.equal(hash, hashManagementToken(token));
  assert.notEqual(hash, token);
});

test("malformed management tokens are rejected", () => {
  assert.equal(isManagementToken("booking-123"), false);
  assert.equal(isManagementToken("a".repeat(42)), false);
  assert.equal(isManagementToken("a".repeat(44)), false);
});
