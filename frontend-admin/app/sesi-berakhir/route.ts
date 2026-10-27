import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Where a rejected session lands. Server Components cannot delete cookies, so
 * a route handler clears the dead one and sends the user to log in again —
 * without this the stale cookie would pass the proxy and loop back here.
 * The Location is relative on purpose: behind the ALB the request's own
 * origin may be the internal http address.
 */
export function GET() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH;
  const res = new NextResponse(null, { status: 303, headers: { Location: `${base}/login?expired=1` } });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: base, maxAge: 0 });
  return res;
}
