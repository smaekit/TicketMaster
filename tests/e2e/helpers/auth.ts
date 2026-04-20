import { type Page, expect } from '@playwright/test';
import path from 'path';

// ---------------------------------------------------------------------------
// Credentials
//
// Sourced from apps/server/.env.test via global setup. The values below must
// stay in sync with that file. They are declared as module-level constants
// (not process.env reads) because global.setup.ts has already validated them
// and the test process inherits the same environment.
// ---------------------------------------------------------------------------
export const ADMIN_EMAIL = 'admin@test.local';
export const ADMIN_PASSWORD = 'Test1234!';

// ---------------------------------------------------------------------------
// storageState path
//
// Written by global.setup.ts after a successful headless login. Consumed by
// individual describe blocks via:
//
//   test.use({ storageState: ADMIN_STORAGE_STATE })
//
// This gives every test in that block a pre-authenticated browser context
// without touching the login page.
// ---------------------------------------------------------------------------
export const ADMIN_STORAGE_STATE = path.resolve(
  __dirname,
  '../.auth/admin.json',
);

// ---------------------------------------------------------------------------
// loginAsAdmin
//
// Drives a full UI login as the seeded admin user and asserts that the
// browser reaches /dashboard. Use this in tests that specifically exercise
// the login flow (auth.spec.ts). Do NOT use it as a beforeEach shortcut for
// tests that just need an authenticated context — use storageState instead.
// ---------------------------------------------------------------------------
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');

  // Wait for the card heading to appear before filling in fields so that
  // react-hook-form is fully mounted and the session check has resolved.
  await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('**/dashboard');

  // Confirm the dashboard heading is present — this ensures the session
  // cookie has been set and the React tree has rendered past ProtectedRoute.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

// ---------------------------------------------------------------------------
// logout
//
// Clicks the Navbar "Sign out" button and waits for the redirect to /login.
// Caller must already be on an authenticated page that renders the Navbar.
// ---------------------------------------------------------------------------
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/login');
}
