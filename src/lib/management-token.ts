import { createHash, randomBytes } from "node:crypto";

const MANAGEMENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateManagementToken() {
  return randomBytes(32).toString("base64url");
}

export function isManagementToken(value: string) {
  return MANAGEMENT_TOKEN_PATTERN.test(value);
}

export function hashManagementToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
