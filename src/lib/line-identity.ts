import { upsertVerifiedLineProfile, type VerifiedLineIdentity } from "./line-profile";

type FetchLike = typeof fetch;

type LineIdTokenPayload = {
  sub?: unknown;
  aud?: unknown;
  exp?: unknown;
  name?: unknown;
  picture?: unknown;
};

export class LineIdentityError extends Error {
  constructor(message = "LINE 身分驗證失敗，請重新從官方帳號開啟") {
    super(message);
  }
}

function safeOptionalString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength ? value : null;
}

export async function verifyLineIdToken(idToken: string, fetcher: FetchLike = fetch): Promise<VerifiedLineIdentity> {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();
  if (!channelId) throw new LineIdentityError("LINE Login channel 尚未設定");
  if (!idToken || idToken.length > 4096) throw new LineIdentityError();

  let response: Response;
  try {
    response = await fetcher("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new LineIdentityError("LINE 身分驗證服務暫時無法連線，請稍後重試");
  }

  let payload: LineIdTokenPayload;
  try {
    payload = await response.json() as LineIdTokenPayload;
  } catch {
    throw new LineIdentityError();
  }

  if (!response.ok || payload.aud !== channelId) throw new LineIdentityError();
  if (typeof payload.sub !== "string" || !/^U[0-9a-f]{32}$/i.test(payload.sub)) throw new LineIdentityError();
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) throw new LineIdentityError();

  return {
    lineUserId: payload.sub,
    lineDisplayName: safeOptionalString(payload.name, 100),
    linePictureUrl: safeOptionalString(payload.picture, 2048),
  };
}

export async function establishLineSessionProfile(
  idToken: string,
  dependencies: {
    verify?: (token: string) => Promise<VerifiedLineIdentity>;
    upsert?: typeof upsertVerifiedLineProfile;
  } = {},
) {
  const identity = await (dependencies.verify ?? verifyLineIdToken)(idToken);
  return (dependencies.upsert ?? upsertVerifiedLineProfile)(identity);
}
