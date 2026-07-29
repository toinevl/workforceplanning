import { defineConfig, devices } from '@playwright/test';

// Functional suite. Runs with auth bypassed so tests can exercise the app
// without an Entra sign-in. Auth enforcement itself is covered separately by
// playwright.auth.config.ts, which runs the same server with auth ON.
export default defineConfig({
  testDir: './tests',
  testIgnore: '**/auth.spec.ts',
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'next dev -p 3000',
    port: 3000,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'ignore',
    timeout: 180000,
    env: {
      AUTH_DISABLED: 'true',
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
