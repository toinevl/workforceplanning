import { test as base, expect, type Page } from '@playwright/test';

/**
 * Test fixture that ensures the app has seeded data before tests run.
 * Uses Playwright's APIRequestContext which respects the webServer config.
 */

const SEED_TEAMS = [
  { name: 'Alpha Squad', color: '#3b82f6', members: 8, retirees: 1, squad: 2 },
  { name: 'Beta Team', color: '#ef4444', members: 6, retirees: 0, squad: 1 },
  { name: 'Gamma Crew', color: '#10b981', members: 5, retirees: 2, squad: 0 },
];

type AppFixtures = {
  seededPage: Page;
};

export const test = base.extend<AppFixtures>({
  seededPage: async ({ page, request }, usePage) => {
    const res = await request.post('/api/seed', {
      data: { teams: SEED_TEAMS, resetFirst: true },
    });

    if (!res.ok()) {
      const text = await res.text().catch(() => '');
      throw new Error(`Seed failed: ${res.status()} ${text}`);
    }

    const body = await res.json().catch(() => ({}));
    const usedFallback =
      body && typeof body === 'object' ? Boolean((body as { fallback?: boolean }).fallback) : false;

    if (usedFallback) {
      console.warn('Using emulator fallback; skipping data-dependent assertions.');
    }

    await usePage(page);
  },
});

export { expect };
