import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyAdminSessionValue } from "./lib/admin-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin/") && !verifyAdminSessionValue(request.cookies.get("shuttle_admin_session")?.value)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*", "/admin/schedules/:path*", "/admin/templates/:path*", "/admin/bookings/:path*", "/admin/line-users/:path*", "/admin/audit-logs/:path*"],
};
