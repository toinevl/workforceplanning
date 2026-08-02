import { test as base, expect, type Page } from '@playwright/test';
import { encode } from '@auth/core/jwt';

/**
 * Auth test fixtures.
 *
 * These tests run against a server where AUTH_DISABLED is NOT set — auth is
 * fully enforced. Instead of going through the real Entra ID OAuth flow
 * (which requires an external IdP), we mint a NextAuth JWT session cookie
 * directly using @auth/core/jwt.encode with the same AUTH_SECRET the server uses.
 *
 * This validates the full middleware → session → protected-route pipeline
 * end-to-end without depending on network access to Microsoft login.
 *
 * IMPORTANT: The AUTH_SECRET here MUST match the one in playwright.auth.config.ts.
 * When a shell env var is explicitly set (e.g. AUTH_SECRET=xxx next dev), Next.js
 * uses it and does NOT override it with .env.local. This is why we can use a
 * fixed test secret — it's the only secret the dev server knows about.
 */

const AUTH_SECRET = process.env.AUTH_SECRET ?? 'test-auth-secret-for-e2e-do-not-use-in-prod';

/** Cookie name used by NextAuth v5 (Auth.js). */
const SESSION_COOKIE = 'authjs.session-token';

export interface TestUser {
  name: string;
  email: string;
}

const DEFAULT_USER: TestUser = {
  name: 'Test User',
  email: 'test@example.com',
};

/**
 * Mint a signed NextAuth JWT session cookie value for a test user.
 */
async function mintSessionCookie(user: TestUser = DEFAULT_USER): Promise<string> {
  const token = {
    name: user.name,
    email: user.email,
    sub: 'test-user-id',
    picture: null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    jti: 'test-jti',
  };

  return await encode({
    token,
    secret: AUTH_SECRET,
    salt: SESSION_COOKIE,
    maxAge: 30 * 24 * 60 * 60,
  });
}

type AuthFixtures = {
  /** A page with a valid session cookie — auth middleware passes. */
  authedPage: Page;
  /** Seed data then return an authed page. */
  authedSeededPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    const cookieValue = await mintSessionCookie();
    await page.context().addCookies([
      {
        name: SESSION_COOKIE,
        value: cookieValue,
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await use(page);
  },

  authedSeededPage: async ({ page, request }, use) => {
    // Mint session cookie BEFORE seeding — the /api/seed endpoint is also
    // behind the auth middleware when AUTH_DISABLED is not set.
    const cookieValue = await mintSessionCookie();

    // Set cookie on the API request context so the seed call authenticates
    const cookieHeader = `${SESSION_COOKIE}=${cookieValue}`;
    const res = await request.post('/api/seed', {
      data: {
        teams: [
          { name: 'Alpha Squad', color: '#3b82f6', members: 8, retirees: 1, squad: 2 },
          { name: 'Beta Team', color: '#ef4444', members: 6, retirees: 0, squad: 1 },
          { name: 'Gamma Crew', color: '#10b981', members: 5, retirees: 2, squad: 0 },
        ],
        resetFirst: true,
      },
      headers: { Cookie: cookieHeader },
    });

    if (!res.ok()) {
      const text = await res.text().catch(() => '');
      throw new Error(`Seed failed: ${res.status()} ${text}`);
    }

    // Set cookie on the browser context
    await page.context().addCookies([
      {
        name: SESSION_COOKIE,
        value: cookieValue,
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    await use(page);
  },
});

export { expect, AUTH_SECRET, mintSessionCookie, SESSION_COOKIE };
