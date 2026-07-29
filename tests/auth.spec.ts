import { test, expect } from '@playwright/test';

/**
 * Regression tests for the middleware authorization callback.
 *
 * Production served every one of these routes to anonymous callers because
 * `authorized` was declared as a standalone export in src/auth.ts instead of
 * inside `callbacks`. The middleware ran, attached session info, and allowed
 * the request through. Nothing failed, because no test ran with auth on.
 *
 * These must run WITHOUT AUTH_DISABLED — see playwright.auth.config.ts.
 */

const API_ROUTES = [
  '/api/teams',
  '/api/members',
  '/api/scenarios',
  '/api/departments',
  '/api/assignments',
];

const PAGE_ROUTES = ['/', '/scenarios', '/settings'];

test.describe('auth enforcement (anonymous)', () => {
  for (const route of API_ROUTES) {
    test(`GET ${route} returns 401 JSON, never data`, async ({ request }) => {
      const res = await request.get(route, { maxRedirects: 0 });

      expect(res.status()).toBe(401);
      expect(res.headers()['content-type']).toContain('application/json');
      await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
    });
  }

  for (const route of PAGE_ROUTES) {
    test(`GET ${route} redirects to /login`, async ({ request }) => {
      const res = await request.get(route, { maxRedirects: 0 });

      expect(res.status()).toBe(307);
      expect(res.headers()['location']).toContain('/login');
    });
  }

  test('/login is reachable so the redirect target is not itself gated', async ({ request }) => {
    const res = await request.get('/login', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });

  test('seed endpoint is not writable anonymously', async ({ request }) => {
    const res = await request.post('/api/seed', {
      data: { teams: [], resetFirst: true },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  });
});
