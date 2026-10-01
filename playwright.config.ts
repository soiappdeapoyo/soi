import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000', locale: 'es-MX' },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : { command: 'npm run dev', port: 3000, reuseExistingServer: true },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
