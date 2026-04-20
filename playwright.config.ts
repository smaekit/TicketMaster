import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  globalSetup: require.resolve('./tests/global.setup'),
  globalTeardown: require.resolve('./tests/global.teardown'),

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'bun run dev:server:test',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'bun run dev:client:test',
      port: 5174,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
