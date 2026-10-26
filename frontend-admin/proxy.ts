import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** Reachable without a session. Everything else needs the cookie. */
const PUBLIC = ["/login", "/lupa-kata-sandi", "/reset-password","/aktivasi", "/sesi-berakhir"];

/**
 * Only the "is there a session cookie" gate. Whether that session is still
 * alive is the backend's call, made on the first API request of each page
 * (lib/api.ts sends a dead one to /sesi-berakhir); what a role may see is
 * decided per page from /api/me (lib/guard.ts) and, for data, by the backend
 * on every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    // Only pages are worth returning to; the login form re-validates this value.
    login.search = pathname === "/" ? "" : `?returnTo=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
