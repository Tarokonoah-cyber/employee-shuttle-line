export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function tomorrowDateInput() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDateInput(date);
}

export function todayDateInput() {
  return formatDateInput(new Date());
}

export function parseServiceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("日期格式不正確");
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export function displayDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}
