import assert from "node:assert/strict";
import test from "node:test";
import { forgetBookingToken, parseManagementToken, parseSavedBookingTokens, saveBookingToken } from "./saved-bookings";

const tokenA = "A".repeat(43);
const tokenB = "b".repeat(43);

function memoryStorage() {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}

test("management token can be imported from the existing management URL", () => {
  assert.equal(parseManagementToken(`https://example.com/booking/manage/${tokenA}`), tokenA);
  assert.equal(parseManagementToken(`https://example.com/booking/success/${tokenB}`), tokenB);
  assert.equal(parseManagementToken("https://example.com/?token={lineToken}"), null);
});

test("saved tokens are deduplicated, bounded and malformed storage is ignored", () => {
  assert.deepEqual(parseSavedBookingTokens(JSON.stringify([tokenA, tokenA, "bad", tokenB])), [tokenA, tokenB]);
  assert.deepEqual(parseSavedBookingTokens("not-json"), []);
});

test("save and forget update browser storage without changing booking data", () => {
  const storage = memoryStorage();
  assert.deepEqual(saveBookingToken(storage, tokenA), [tokenA]);
  assert.deepEqual(saveBookingToken(storage, tokenB), [tokenB, tokenA]);
  assert.deepEqual(forgetBookingToken(storage, tokenB), [tokenA]);
});
