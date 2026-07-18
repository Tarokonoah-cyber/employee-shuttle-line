const MANAGEMENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SAVED_BOOKINGS_STORAGE_KEY = "employee-shuttle:management-tokens:v1";

export function parseManagementToken(value: string) {
  const trimmed = value.trim();
  if (MANAGEMENT_TOKEN_PATTERN.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/^\/booking\/(?:manage|success)\/([A-Za-z0-9_-]{43})\/?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function parseSavedBookingTokens(raw: string | null) {
  if (!raw) return [];
  try {
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values)) return [];
    return [...new Set(values.filter((value): value is string => typeof value === "string" && MANAGEMENT_TOKEN_PATTERN.test(value)))].slice(0, 20);
  } catch {
    return [];
  }
}

export function readSavedBookingTokens(storage: Pick<Storage, "getItem">) {
  return parseSavedBookingTokens(storage.getItem(SAVED_BOOKINGS_STORAGE_KEY));
}

export function saveBookingToken(storage: Pick<Storage, "getItem" | "setItem">, value: string) {
  const token = parseManagementToken(value);
  if (!token) return null;
  const tokens = [token, ...readSavedBookingTokens(storage).filter((item) => item !== token)].slice(0, 20);
  storage.setItem(SAVED_BOOKINGS_STORAGE_KEY, JSON.stringify(tokens));
  return tokens;
}

export function forgetBookingToken(storage: Pick<Storage, "getItem" | "setItem">, token: string) {
  const tokens = readSavedBookingTokens(storage).filter((item) => item !== token);
  storage.setItem(SAVED_BOOKINGS_STORAGE_KEY, JSON.stringify(tokens));
  return tokens;
}
