export type BookingFilters = {
  date: string;
  status: string;
  scheduleId: string;
  keyword: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validAdminDate(value: string | null | undefined, fallback: string) {
  return value && datePattern.test(value) ? value : fallback;
}

export function readBookingFilters(params: URLSearchParams, fallbackDate: string): BookingFilters {
  return {
    date: validAdminDate(params.get("date"), fallbackDate),
    status: params.get("status") ?? "",
    scheduleId: params.get("schedule_id") ?? "",
    keyword: params.get("keyword") ?? "",
  };
}

export function bookingFiltersToSearchParams(filters: BookingFilters) {
  const params = new URLSearchParams();
  if (filters.date) params.set("date", filters.date);
  if (filters.status) params.set("status", filters.status);
  if (filters.scheduleId) params.set("schedule_id", filters.scheduleId);
  if (filters.keyword) params.set("keyword", filters.keyword);
  return params;
}

export function bookingListHref(filters: Partial<BookingFilters>) {
  const params = bookingFiltersToSearchParams({
    date: filters.date ?? "",
    status: filters.status ?? "",
    scheduleId: filters.scheduleId ?? "",
    keyword: filters.keyword ?? "",
  });
  const query = params.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

export function adminDateHref(pathname: "/admin/dashboard" | "/admin/schedules", date: string) {
  const params = new URLSearchParams({ date });
  return `${pathname}?${params.toString()}`;
}
