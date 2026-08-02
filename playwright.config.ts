import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Exclude auth specs — they need their own server config (playwright.auth.config.ts)
  testMatch: /.*\.spec\.ts/,
  testIgnore: /auth\.spec\.ts|auth-fixtures\.ts/,
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'AUTH_DISABLED=true next dev -p 3000',
    port: 3000,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'ignore',
    timeout: 180000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
