export function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildIdentityKey(input: {
  employeeName: string;
  employeeNo?: string | null;
  phone?: string | null;
}) {
  const employeeNo = normalizeText(input.employeeNo);
  if (employeeNo) {
    return `no:${employeeNo}`;
  }

  return `name-phone:${normalizeText(input.employeeName)}:${normalizeText(input.phone)}`;
}

export function generateBookingCode() {
  const segment = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `BUS-${timestamp}-${segment}`;
}
