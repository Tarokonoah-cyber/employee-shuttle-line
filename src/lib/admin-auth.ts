import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "shuttle_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret() {
  return process.env.ADMIN_PASSWORD || "development-admin-password";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return password === "admin";
  }

  return safeEqual(password, expected);
}

export function createAdminSessionValue() {
  const issuedAt = Date.now().toString();
  const nonce = randomBytes(16).toString("hex");
  const payload = `${issuedAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionValue(value?: string) {
  if (!value) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;

  const [issuedAt, nonce, signature] = parts;
  const payload = `${issuedAt}.${nonce}`;
  const age = Date.now() - Number(issuedAt);

  if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_SECONDS * 1000) {
    return false;
  }

  return safeEqual(signature, sign(payload));
}

export async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSessionValue(cookieStore.get(COOKIE_NAME)?.value);
}

export function adminCookie(value: string) {
  return {
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export function expiredAdminCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
