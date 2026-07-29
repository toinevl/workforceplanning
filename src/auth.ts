import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { NextResponse } from "next/server";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Uses the Microsoft Entra ID (formerly Azure AD) OIDC provider in
 * single-tenant mode — only users from the configured tenant can sign in.
 *
 * Session strategy is JWT (the default when no adapter is configured):
 * the session is stored as a signed, httpOnly cookie — no database
 * session store is needed.
 *
 * Environment variables (inferred automatically by Auth.js):
 *   AUTH_MICROSOFT_ENTRA_ID_ID       — Application (client) ID
 *   AUTH_MICROSOFT_ENTRA_ID_SECRET   — Client secret value
 *   AUTH_MICROSOFT_ENTRA_ID_ISSUER   — Single-tenant issuer URL
 *                                       https://login.microsoftonline.com/<tenant-id>/v2.0/
 *   AUTH_SECRET                       — Used to sign the session JWT
 *   AUTH_URL                          — Canonical app URL (e.g. https://app.example.com)
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the Host header on non-Vercel hosting (App Service, containers, etc.)
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],
  // JWT session (stateless — httpOnly cookie, no DB store).
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * Middleware-level authorization.
     *
     * MUST live inside `callbacks` — the `auth` middleware export enforces
     * access control solely through this callback. Declaring it as a
     * standalone export does nothing and lets every request through.
     *
     * AUTH_DISABLED=true bypasses auth entirely (debugging escape hatch).
     *
     * API routes get 401 JSON rather than a redirect: a 307 to /login
     * returns an HTML page to a fetch() caller, which surfaces as a JSON
     * parse error instead of an auth failure.
     *
     * NOTE: Do NOT gate on process.env.AUTH_SECRET here — Next.js can inline
     * env var reads at build time during static prerendering, which bakes the
     * check in as "true" (auth disabled) when the secret isn't present at
     * build time. AUTH_SECRET is still used internally by NextAuth for JWT
     * signing; it just must not be part of the access control decision.
     */
    authorized({ request, auth }) {
      if (process.env.AUTH_DISABLED === "true") return true;

      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login")) return true;
      if (auth?.user) return true;

      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    },
    /**
     * Persist the user's name and email into the JWT so they are
     * available in the session on every request without an extra
     * network round-trip to the provider.
     */
    jwt({ token, profile }) {
      if (profile) {
        // Microsoft Entra ID profile fields (see MicrosoftEntraIDProfile).
        token.name = profile.name ?? token.name;
        token.email =
          (profile as { email?: string; preferred_username?: string }).email ??
          (profile as { preferred_username?: string }).preferred_username ??
          token.email;
      }
      return token;
    },
    /**
     * Surface name/email from the JWT onto the session object so server
     * components and route handlers can read `session.user.name`.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

