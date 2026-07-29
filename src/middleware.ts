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

  return NextResponse.redirect(new URL(LOGIN_PAGE, request.url));
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
