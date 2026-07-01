import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    webServer: {
      command: 'bash -lc "npm run azurite:clean >/tmp/azurite.log 2>&1 & sleep 4 && npm run dev -- -p 3000"',
      port: 3000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'ignore',
      timeout: 180000,
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
