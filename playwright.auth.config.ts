import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the auth E2E suite.
 *
 * Starts a dev server WITHOUT AUTH_DISABLED — auth middleware is fully
 * enforced. Tests mint JWT session cookies via @auth/core/jwt.encode
 * using the same AUTH_SECRET.
 *
 * Run separately from the main suite:
 *   npm run test:e2e:auth
 *
 * The two suites must run against different servers because they need
 * different AUTH_DISABLED settings.
 */

const TEST_AUTH_SECRET = 'test-auth-secret-for-e2e-do-not-use-in-prod';

export default defineConfig({
  testDir: './tests',
  testMatch: /auth\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: `AUTH_SECRET="${TEST_AUTH_SECRET}" next dev -p 3001`,
    port: 3001,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'ignore',
    timeout: 180_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
