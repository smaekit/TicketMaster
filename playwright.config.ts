import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Ensure bun is on PATH when Playwright spawns webServer child processes.
// Windows uses USERPROFILE; Unix uses HOME.
const home = process.env.HOME || process.env.USERPROFILE || '';
process.env.PATH = `${path.join(home, '.bun', 'bin')}${path.delimiter}${process.env.PATH}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: './tests/test-results',
  reporter: [['html', { outputFolder: './tests/playwright-report' }]],

  globalSetup: require.resolve('./tests/global.setup'),
  globalTeardown: require.resolve('./tests/global.teardown'),

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'bun --env-file=apps/server/.env.test apps/server/src/index.ts',
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
