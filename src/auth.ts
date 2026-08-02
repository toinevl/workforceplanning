import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

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
