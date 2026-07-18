import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const LINE_SESSION_COOKIE_NAME = "shuttle_line_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function signingSecret() {
  const configured = process.env.LINE_SESSION_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  if (configured) throw new Error("LINE_SESSION_SECRET must be at least 32 characters");
  if (process.env.NODE_ENV !== "production") return "development-line-session-secret-change-me";
  return null;
}

function sign(payload: string) {
  const secret = signingSecret();
  if (!secret) throw new Error("LINE_SESSION_SECRET is required in production");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createLineSessionValue(profileId: string, now = Date.now()) {
  if (!profileId) throw new Error("profileId is required");
  const payload = Buffer.from(JSON.stringify({ profileId, issuedAt: now }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyLineSessionValue(value: string | undefined, now = Date.now()) {
  if (!value) return null;
  const [payload, signature, ...extra] = value.split(".");
  if (!payload || !signature || extra.length) return null;

  try {
    if (!safeEqual(signature, sign(payload))) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      profileId?: unknown;
      issuedAt?: unknown;
    };
    if (typeof decoded.profileId !== "string" || !decoded.profileId) return null;
    if (typeof decoded.issuedAt !== "number") return null;
    const age = now - decoded.issuedAt;
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_SECONDS * 1000) return null;
    return decoded.profileId;
  } catch {
    return null;
  }
}

export async function getLineSessionProfileId() {
  const cookieStore = await cookies();
  return verifyLineSessionValue(cookieStore.get(LINE_SESSION_COOKIE_NAME)?.value);
}

export function lineSessionCookie(value: string) {
  return {
    name: LINE_SESSION_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    priority: "high" as const,
  };
}

export function lineIdentityRequired() {
  const configured = process.env.LINE_IDENTITY_REQUIRED?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return Boolean(process.env.LINE_LOGIN_CHANNEL_ID?.trim());
}
