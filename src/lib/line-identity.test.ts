import assert from "node:assert/strict";
import test from "node:test";
import type { LineUserProfile } from "@prisma/client";
import { establishLineSessionProfile, LineIdentityError, verifyLineIdToken } from "./line-identity";

const originalChannelId = process.env.LINE_LOGIN_CHANNEL_ID;
process.env.LINE_LOGIN_CHANNEL_ID = "1234567890";

test.after(() => {
  if (originalChannelId === undefined) delete process.env.LINE_LOGIN_CHANNEL_ID;
  else process.env.LINE_LOGIN_CHANNEL_ID = originalChannelId;
});

function profile(lineUserId: string): LineUserProfile {
  const now = new Date();
  return {
    id: "profile_1",
    lineUserId,
    lineDisplayName: "太魯閣員工",
    linePictureUrl: null,
    employeeName: null,
    employeeNo: null,
    department: null,
    phone: null,
    defaultPickupLocation: null,
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

test("valid LIFF ID token is verified by LINE and creates a profile", async () => {
  const lineUserId = `U${"a".repeat(32)}`;
  const verified = await verifyLineIdToken("signed-id-token", async (_url, init) => {
    assert.equal(new URLSearchParams(String(init?.body)).get("client_id"), "1234567890");
    assert.equal(new URLSearchParams(String(init?.body)).get("id_token"), "signed-id-token");
    return new Response(JSON.stringify({ sub: lineUserId, aud: "1234567890", exp: Math.floor(Date.now() / 1000) + 3600, name: "太魯閣員工" }), { status: 200 });
  });
  assert.equal(verified.lineUserId, lineUserId);

  let upserted = false;
  const created = await establishLineSessionProfile("signed-id-token", {
    verify: async () => verified,
    upsert: async (identity) => {
      upserted = true;
      return profile(identity.lineUserId);
    },
  });
  assert.equal(upserted, true);
  assert.equal(created.lineUserId, lineUserId);
});

test("invalid LIFF token never creates a profile", async () => {
  let upserted = false;
  await assert.rejects(
    establishLineSessionProfile("forged-token", {
      verify: async () => { throw new LineIdentityError(); },
      upsert: async () => { upserted = true; return profile(`U${"b".repeat(32)}`); },
    }),
    LineIdentityError,
  );
  assert.equal(upserted, false);
});

test("wrong channel id and expired tokens are rejected", async () => {
  const lineUserId = `U${"c".repeat(32)}`;
  await assert.rejects(
    verifyLineIdToken("signed-id-token", async () => new Response(JSON.stringify({ sub: lineUserId, aud: "other", exp: Math.floor(Date.now() / 1000) + 3600 }), { status: 200 })),
    LineIdentityError,
  );
  await assert.rejects(
    verifyLineIdToken("signed-id-token", async () => new Response(JSON.stringify({ sub: lineUserId, aud: "1234567890", exp: 1 }), { status: 200 })),
    LineIdentityError,
  );
});
