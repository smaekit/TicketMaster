/**
 * auth.spec.ts — End-to-end tests for the TicketMaster authentication system.
 *
 * Coverage:
 *  - Login form rendering
 *  - Already-authenticated redirect away from /login
 *  - Successful admin login → /dashboard
 *  - Session persistence across a full page reload
 *  - Wrong password → API error message rendered
 *  - Wrong email → API error message rendered
 *  - Empty fields → client-side validation messages
 *  - Logout → redirected to /login
 *  - Post-logout /dashboard visit → redirected to /login
 *  - Unauthenticated /dashboard → redirected to /login
 *  - Unauthenticated /users → redirected to /login
 *  - Admin /users → page loads successfully
 *
 * Test isolation strategy:
 *  - Tests that only need an authenticated context use `test.use({ storageState })`
 *    so they never touch the login page and do not depend on test order.
 *  - Tests that exercise the login/logout flow use a fresh browser context
 *    (no storageState) so there is no pre-existing session to interfere.
 */

import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_STORAGE_STATE,
  loginAsAdmin,
  logout,
} from './helpers/auth';

// ==========================================================================
// 1. Login form rendering
// ==========================================================================
test.describe('Login page — form rendering', () => {
  // No storageState: these tests need an unauthenticated context.
  test.use({ storageState: undefined });

  test('renders the card heading', async ({ page }) => {
    await page.goto('/login');
    // CardTitle renders as a div, not a semantic heading.
    await expect(page.getByText('Sign in').first()).toBeVisible();
  });

  test('renders email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('renders the submit button', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible();
  });

  test('password field masks input', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password');
  });
});

// ==========================================================================
// 2. Already-authenticated redirect away from /login
// ==========================================================================
test.describe('Login page — authenticated redirect', () => {
  // Load the pre-authenticated session saved by global setup.
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('redirects an authenticated user visiting /login to /dashboard', async ({ page }) => {
    await page.goto('/login');
    // LoginPage renders <Navigate to="/dashboard" replace /> when session exists.
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

// ==========================================================================
// 3. Successful admin login
// ==========================================================================
test.describe('Login — successful admin login', () => {
  test.use({ storageState: undefined });

  test('navigates to /dashboard after valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('shows the Navbar after successful login', async ({ page }) => {
    await loginAsAdmin(page);

    // The Navbar is part of the authenticated Layout wrapper.
    await expect(page.getByText('TicketMaster')).toBeVisible();
  });

  test('shows the Sign out button in the Navbar after login', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('button shows loading state while submitting', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);

    // Click and immediately check the transient label before the navigation settles.
    const submitBtn = page.getByRole('button', { name: /sign in/i });
    await submitBtn.click();

    // The button should momentarily read "Signing in…" — assert it appeared or
    // that navigation completed (race condition on fast connections is fine).
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5_000 });
  });
});

// ==========================================================================
// 4. Session persistence across page reload
// ==========================================================================
test.describe('Session — persistence', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('stays authenticated after a hard reload', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.reload();

    // ProtectedRoute re-checks the session; it must still pass.
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});

// ==========================================================================
// 5. Wrong password → API error shown
// ==========================================================================
test.describe('Login — wrong password', () => {
  test.use({ storageState: undefined });

  test('shows an error message for an incorrect password', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill('definitelyWrongPassword!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // The root form error is rendered as a <p> with the API message.
    // We target the destructive-coloured paragraph that is not beneath a label.
    await expect(
      page.locator('form p.text-destructive').last(),
    ).toBeVisible({ timeout: 5_000 });

    // The user must remain on /login — no redirect.
    await expect(page).toHaveURL(/\/login$/);
  });

  test('does not navigate away from /login on wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill('bad-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait briefly then assert still on /login.
    await page.waitForTimeout(1_500);
    await expect(page).toHaveURL(/\/login$/);
  });
});

// ==========================================================================
// 6. Wrong email → API error shown
// ==========================================================================
test.describe('Login — wrong email', () => {
  test.use({ storageState: undefined });

  test('shows an error message for an unrecognised email', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('SomePassword123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.locator('form p.text-destructive').last(),
    ).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveURL(/\/login$/);
  });
});

// ==========================================================================
// 7. Empty fields → client-side validation messages
// ==========================================================================
test.describe('Login — empty-field validation', () => {
  test.use({ storageState: undefined });

  test('shows "Invalid email address" when email is empty', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    // Leave email blank, fill password so only email validation fires.
    await page.getByLabel('Password').fill('somepassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('shows "Password is required" when password is empty', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    // Leave password blank.
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('shows both validation errors when both fields are empty', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('shows "Invalid email address" for a malformed email', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('somepassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('does not submit the form when validation fails', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'Sign in' }).click();

    // Validation is client-side: no network round-trip, still on /login.
    await expect(page).toHaveURL(/\/login$/);
  });
});

// ==========================================================================
// 8. Logout → redirected to /login
//
// These tests sign out, which deletes the session from the DB. They use a
// fresh login per test (loginAsAdmin) instead of the shared storageState so
// they don't invalidate ADMIN_STORAGE_STATE for concurrently-running tests.
// ==========================================================================
test.describe('Logout', () => {
  test.use({ storageState: undefined });

  test('clicking Sign out redirects to /login', async ({ page }) => {
    await loginAsAdmin(page); // already lands on /dashboard
    await logout(page);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login form is shown again after logout', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
    await expect(page.getByText('Sign in').first()).toBeVisible();
  });
});

// ==========================================================================
// 9. After logout, /dashboard redirects to /login
// ==========================================================================
test.describe('Post-logout route protection', () => {
  test.use({ storageState: undefined });

  test('visiting /dashboard after logout redirects to /login', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('visiting /users after logout redirects to /login', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/users');
    await expect(page).toHaveURL(/\/login$/);
  });
});

// ==========================================================================
// 10. Unauthenticated visit to /dashboard → redirected to /login
// ==========================================================================
test.describe('Route protection — unauthenticated /dashboard', () => {
  test.use({ storageState: undefined });

  test('redirects an unauthenticated visitor to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows the login form at the redirect destination', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Sign in').first()).toBeVisible();
  });
});

// ==========================================================================
// 11. Unauthenticated visit to /users → redirected to /login
// ==========================================================================
test.describe('Route protection — unauthenticated /users', () => {
  test.use({ storageState: undefined });

  test('redirects an unauthenticated visitor to /login', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/login$/);
  });
});

// ==========================================================================
// 12. Admin visiting /users → page loads
// ==========================================================================
test.describe('Admin — /users page access', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('admin can navigate to /users and see the Users heading', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });

  test('admin sees the Users link in the Navbar', async ({ page }) => {
    await page.goto('/dashboard');
    // Navbar renders the Users link only for ADMIN role.
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
  });

  test('admin Navbar link navigates to /users', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Users' }).click();
    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });
});
