/**
 * Auth.js (NextAuth v5) middleware.
 *
 * Protects all application routes — unauthenticated requests are
 * redirected to /login. /login, /api/auth/*, _next/static, and static
 * file extensions are excluded from the matcher.
 *
 * Supplying our own middleware body instead of relying on NextAuth's
 * `authorized` callback from auth.ts: `export { auth as middleware }`
 * does invoke `config.callbacks.authorized` internally, but the
 * independant wrapper still ends up preventing easy control when auth
 * is not configured — a direct check here avoids ambiguity.
 *
 * API routes (/api/*) return 401 JSON instead of a redirect, so that
 * client-side fetch() callers (fetchJSON) can detect the auth failure
 * and redirect to /login themselves. A 307 to /login surfaces as a
 * JSON parse error on the client, not an auth signal. (#33)
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PAGE = "/login";

export default async function middleware(request: NextRequest) {
  // Debugging/CI escape hatch. Must be checked HERE: enforcement lives in this
  // function, so a check in auth.ts's `authorized` export never runs. Without
  // it the E2E suite 307s on every request, CI fails, and deploy.yml — which
  // triggers on CI success — is skipped, so nothing reaches production.
  if (process.env.AUTH_DISABLED === "true") {
    return NextResponse.next();
  }

  // Get the session; auth() returns the parsed session object directly.
  const session = await auth();

  const isLoggedIn = !!session?.user;
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

  // Unauthenticated: API routes get 401 JSON (not a redirect) so that
  // client-side fetch() callers like fetchJSON can detect the auth failure
  // and redirect to /login themselves. A 307 to /login returns an HTML page
  // to fetch(), which surfaces as a JSON parse error instead.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pages get a redirect to /login.
  return NextResponse.redirect(new URL(LOGIN_PAGE, request.url));
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
