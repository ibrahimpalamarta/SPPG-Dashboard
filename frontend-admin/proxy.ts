import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * Mounts /auth/* and sends anyone without a session to Auth0. This is only the
 * "are you logged in" gate; what a role may see is decided per page from
 * /api/me (lib/guard.ts) and, for data, by the backend on every request.
 */
export async function proxy(request: NextRequest) {
  const authResponse = await auth0.middleware(request);
  if (request.nextUrl.pathname.startsWith("/auth")) return authResponse;

  if (!(await auth0.getSession(request))) {
    const login = request.nextUrl.clone();
    login.pathname = "/auth/login";
    // returnTo is resolved against APP_BASE_URL (origin only), so it carries the base path.
    login.search = `?returnTo=${encodeURIComponent(request.nextUrl.basePath + request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
