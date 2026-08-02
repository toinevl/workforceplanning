import { test, expect } from './auth-fixtures';
import { SESSION_COOKIE } from './auth-fixtures';

/**
 * E2E auth tests — run with auth enforcement ON (no AUTH_DISABLED).
 *
 * Validates the full middleware → session → route pipeline without hitting
 * the real Entra ID IdP. A valid JWT session cookie is minted by the test
 * fixtures using the same AUTH_SECRET the server runs with.
 *
 * Note: page.goto() follows redirects by default. A 307 from the middleware
 * is transparently followed to /login (200). We assert the final URL to
 * verify the redirect happened, not the intermediate status code.
 *
 * Coverage:
 *   - Unauthenticated: redirect to /login, API endpoints protected
 *   - Authenticated: protected routes accessible, user info shown
 *   - Session expiry: removing cookie redirects to /login
 *   - Login page: always accessible (auth or not)
 */

// ── Unauthenticated access ──────────────────────────────────────────────────

test.describe('Unauthenticated access (no session cookie)', () => {
  test('redirects to /login when visiting home', async ({ page }) => {
    await page.goto('/');
    // page.goto follows the 307 → we land on /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to /login when visiting settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to /login when visiting departments', async ({ page }) => {
    await page.goto('/departments');
    await expect(page).toHaveURL(/\/login/);
  });

  test('API endpoints return 401 JSON (not redirect) for anonymous callers', async ({ request }) => {
    // /api/* routes return 401 JSON so client-side fetchJSON can detect the
    // auth failure and redirect to /login. A 307 would be followed to an
    // HTML /login page, surfacing as a JSON parse error instead.
    const routes = ['/api/scenarios', '/api/teams', '/api/members', '/api/departments'];
    for (const route of routes) {
      const res = await request.get(route, { maxRedirects: 0 });
      expect(res.status()).toBe(401);
      expect(res.headers()['content-type']).toContain('application/json');
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    }
  });

  test('seed endpoint is not writable anonymously (POST returns 401)', async ({ request }) => {
    const res = await request.post('/api/seed', {
      data: { teams: [], resetFirst: true },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  });

  test('scenarios board redirects to /login', async ({ page }) => {
    await page.goto('/scenarios');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/login page is accessible without auth', async ({ page }) => {
    const resp = await page.goto('/login');
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /workforce planning/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in with microsoft/i })).toBeVisible();
  });
});

// ── Authenticated access ────────────────────────────────────────────────────

test.describe('Authenticated access (valid session cookie)', () => {
  test('can access home page', async ({ authedSeededPage: page }) => {
    const resp = await page.goto('/');
    expect(resp?.status()).toBe(200);
    await expect(page).toHaveTitle(/Workforce Planning/i);
  });

  test('can access settings page', async ({ authedPage: page }) => {
    const resp = await page.goto('/settings');
    expect(resp?.status()).toBe(200);
  });

  test('can access departments page', async ({ authedPage: page }) => {
    const resp = await page.goto('/departments');
    expect(resp?.status()).toBe(200);
  });

  test('API endpoints return data (200)', async ({ authedSeededPage: page }) => {
    const res = await page.request.get('/api/teams');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('session API returns user info', async ({ authedPage: page }) => {
    // Direct check of the session endpoint that useSession() calls
    const res = await page.request.get('/api/auth/session');
    expect(res.status()).toBe(200);
    const session = await res.json();
    expect(session.user).toBeDefined();
    expect(session.user.name).toBe('Test User');
    expect(session.user.email).toBe('test@example.com');
  });

  test('user info is displayed in the nav', async ({ authedSeededPage: page }) => {
    await page.goto('/');
    // UserMenu shows the name and email from the session via useSession()
    // Wait for the client-side session check to resolve
    await expect(page.getByText('Test User')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('test@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });

  test('authenticated user visiting /login still sees the login page', async ({ authedPage: page }) => {
    // /login is always accessible — middleware does not redirect logged-in users
    // away from it (intentional: no infinite redirect loop)
    const resp = await page.goto('/login');
    expect(resp?.status()).toBe(200);
  });
});

// ── Session expiry ──────────────────────────────────────────────────────────

test.describe('Session expiry', () => {
  test('removing session cookie redirects to /login', async ({ authedSeededPage: page }) => {
    // First confirm we're authed and on the home page
    await page.goto('/');
    await expect(page).toHaveTitle(/Workforce Planning/i);

    // Clear the session cookie — simulates expiry/logout
    await page.context().clearCookies();

    // Navigate to a protected route — should redirect to /login
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('tampered session cookie redirects to /login', async ({ page }) => {
    // Set a garbage session cookie
    await page.context().addCookies([
      {
        name: SESSION_COOKIE,
        value: 'invalid-jwt-token-garbage',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    // Visit a protected route — invalid JWT means no session → redirect
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
