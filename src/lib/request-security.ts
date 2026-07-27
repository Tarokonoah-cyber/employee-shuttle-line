function normalizedOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function forwardedOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const host = firstForwardedValue(request.headers.get("x-forwarded-host"))
    ?? request.headers.get("host");
  const protocol = firstForwardedValue(request.headers.get("x-forwarded-proto"))
    ?? requestUrl.protocol.slice(0, -1);

  if (!host || (protocol !== "http" && protocol !== "https")) return null;
  return normalizedOrigin(`${protocol}://${host}`);
}

export function hasSafeRequestOrigin(request: Request) {
  const origin = normalizedOrigin(request.headers.get("origin"));
  if (!request.headers.get("origin")) return true;
  if (!origin) return false;

  const allowedOrigins = new Set<string>();
  const requestOrigin = normalizedOrigin(request.url);
  const configuredOrigin = normalizedOrigin(process.env.APP_BASE_URL);
  const proxyOrigin = forwardedOrigin(request);

  if (requestOrigin) allowedOrigins.add(requestOrigin);
  if (configuredOrigin) allowedOrigins.add(configuredOrigin);
  if (proxyOrigin) allowedOrigins.add(proxyOrigin);

  return allowedOrigins.has(origin);
}
