import assert from "node:assert/strict";
import test from "node:test";
import { createLineSessionValue, verifyLineSessionValue } from "./line-session";

test("LINE session is signed, scoped to one profile and expires", () => {
  const now = Date.now();
  const session = createLineSessionValue("profile_owner", now);
  assert.equal(verifyLineSessionValue(session, now + 1000), "profile_owner");
  assert.notEqual(verifyLineSessionValue(session, now + 1000), "profile_other");
  assert.equal(verifyLineSessionValue(`${session.slice(0, -1)}x`, now + 1000), null);
  assert.equal(verifyLineSessionValue(session, now + 8 * 24 * 60 * 60 * 1000), null);
});
