/**
 * Auth.js middleware.
 *
 * Protects all application routes — unauthenticated requests are
 * redirected to /login by the `authorized` callback in `@/auth`.
 *
 * Excluded from the matcher (never invoke middleware on these):
 *   - /api/auth/*      — Auth.js callback/sign-in endpoints
 *   - /_next/*         — Next.js static assets and chunks
 *   - /favicon.ico     — browser favicon request
 *   - Static file extensions (png, svg, etc.)
 *
 * Note: other /api/* routes (e.g. /api/scenarios) ARE protected — the
 * middleware runs before the route handler, and unauthenticated requests
 * receive a redirect to /login.
 */
export { auth as middleware } from "@/auth";

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
