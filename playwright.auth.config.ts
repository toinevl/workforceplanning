import { defineConfig, devices } from '@playwright/test';

/**
 * Auth-enforcement suite.
 *
 * Runs the app with auth ON — no AUTH_DISABLED bypass — so unauthenticated
 * access is exercised for real. The functional suite (playwright.config.ts)
 * runs with the bypass enabled and therefore cannot catch an auth regression.
 *
 * Uses port 3001 so both suites can run in the same job without colliding.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/auth.spec.ts',
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'next dev -p 3001',
    port: 3001,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'ignore',
    timeout: 180000,
    env: {
      // A signing secret must be present, but it must NOT act as an auth
      // toggle — see the note in src/auth.ts.
      AUTH_SECRET: 'test-secret-not-used-in-production-abcdefghijklmnop',
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
