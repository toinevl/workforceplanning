/**
 * Auth.js (NextAuth v5) middleware.
 *
 * Protects all application routes — unauthenticated requests are
 * redirected to /login. The /login page and /api/auth/* endpoints are
 * excluded from the matcher and allowed through unconditionally.
 *
 * Note on why we do auth({ returnRef: true }) here instead of relying
 * on the `authorized` callback exported from @/auth:
 *
 * The `authorized` option in the NextAuth config dict is consumed by
 * NextAuth's own auth wrapper, which is exported as `auth`. That wrapper
 * does NOT invoke our `authorized()` callback from auth.ts when running
 * as middleware on a serverless/standalone host — it only uses it for
 * route handlers that import `auth` directly. So middleware appeared to
 * run (CSRF cookies were set) but never enforced access control.
 *
 * calling `auth({ returnRef: true })` ourselves gives us the session
 * directly; we then decide whether to allow the request or redirect.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PAGE = "/login";

export default async function middleware(request: NextRequest) {
  // Run Auth.js handler; we only need the session info here.
  const session = await auth({ returnRef: true });

  const isLoggedIn = !!(session as { user?: unknown } | null)?.user;
  const pathname = request.nextUrl.pathname;
  const isLoginPage =
    pathname === LOGIN_PAGE ||
    pathname.startsWith(`${LOGIN_PAGE}/`);

  if (isLoginPage) {
    return NextResponse.next();
  }

  if (isLoggedIn) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(LOGIN_PAGE, request.url));
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   api/auth/...  (Auth.js callback endpoints)
     *   _next/...     (Next internals)
     *   static files (favicon, images, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
