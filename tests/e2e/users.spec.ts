/**
 * users.spec.ts — End-to-end tests for the TicketMaster user management page.
 *
 * Coverage:
 *  - Read   — /users renders the heading and the seeded admin row
 *  - Create — happy path: fill Create User dialog, assert new row appears
 *  - Update — happy path: create a user via UI then edit their name
 *  - Delete — happy path: create a user via UI then soft-delete them
 *
 * All tests run as the seeded admin (ADMIN_STORAGE_STATE) so no login UI
 * is touched here. Each CRUD test that mutates data creates its own user
 * first so tests remain fully independent of each other and of DB state
 * beyond the initial seed.
 */

import { test, expect, type Page } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './helpers/auth';

// ---------------------------------------------------------------------------
// Shared helper — fill and submit the Create User dialog.
// Kept inline-adjacent to its callers; no separate file needed.
// ---------------------------------------------------------------------------
async function createUserViaUI(
  page: Page,
  name: string,
  email: string,
  password = 'TestPass1!',
) {
  await page.getByRole('button', { name: 'Create User' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Password').fill(password);
  await dialog.getByRole('button', { name: 'Create User' }).click();

  // Wait for the dialog to close before returning — callers can then assert
  // on the table without racing against the optimistic close animation.
  await expect(dialog).not.toBeVisible();
}

// ==========================================================================
// 1. Read — users list displays
// ==========================================================================
test.describe('Users page — read', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('renders the Users heading', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });

  test('shows the seeded admin row in the table', async ({ page }) => {
    await page.goto('/users');

    // The admin email is always present after global setup resets + re-seeds.
    await expect(page.getByRole('cell', { name: 'admin@test.local' })).toBeVisible();
  });

  test('shows the Create User button', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('button', { name: 'Create User' })).toBeVisible();
  });
});

// ==========================================================================
// 2. Create — happy path
// ==========================================================================
test.describe('Users page — create', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('creates a new user and shows them in the table', async ({ page }) => {
    await page.goto('/users');

    await createUserViaUI(page, 'E2E Created', 'e2e-create@test.local');

    // The new user's name and email must both appear in the table.
    await expect(page.getByRole('cell', { name: 'E2E Created', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'e2e-create@test.local', exact: true })).toBeVisible();
  });

  test('dialog closes after successful creation', async ({ page }) => {
    await page.goto('/users');

    // Open the dialog to verify it was open, then confirm it closes on submit.
    await page.getByRole('button', { name: 'Create User' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Name').fill('Dialog Close Test');
    await dialog.getByLabel('Email').fill('e2e-dialog-close@test.local');
    await dialog.getByLabel('Password').fill('TestPass1!');
    await dialog.getByRole('button', { name: 'Create User' }).click();

    await expect(dialog).not.toBeVisible();
  });
});

// ==========================================================================
// 3. Update — happy path
// ==========================================================================
test.describe('Users page — update', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('edits an existing user name and reflects the change in the table', async ({ page }) => {
    await page.goto('/users');

    // Create the target user first so this test owns its own data.
    await createUserViaUI(page, 'Edit Target', 'e2e-edit@test.local');

    // Open the edit dialog for the newly created user.
    await page.getByRole('button', { name: 'Edit Edit Target' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Edit User' })).toBeVisible();

    // Clear the name field and type the updated value.
    const nameInput = dialog.getByLabel('Name');
    await nameInput.clear();
    await nameInput.fill('Edit Target Updated');

    await dialog.getByRole('button', { name: 'Save Changes' }).click();

    // Dialog must close before the table re-renders with the updated name.
    await expect(dialog).not.toBeVisible();

    await expect(page.getByRole('cell', { name: 'Edit Target Updated', exact: true })).toBeVisible();
  });
});

// ==========================================================================
// 4. Delete — happy path
// ==========================================================================
test.describe('Users page — delete', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('deletes a user and removes them from the table', async ({ page }) => {
    await page.goto('/users');

    // Create the target user first so this test owns its own data.
    await createUserViaUI(page, 'Delete Target', 'e2e-delete@test.local');

    // Trigger the delete confirmation dialog.
    await page.getByRole('button', { name: 'Delete Delete Target' }).click();

    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible();

    // Confirm the dialog title names the right user.
    await expect(alertDialog.getByRole('heading', { name: 'Delete Delete Target?' })).toBeVisible();

    // Confirm deletion.
    await alertDialog.getByRole('button', { name: 'Delete' }).click();

    // AlertDialog must close before we assert on the table.
    await expect(alertDialog).not.toBeVisible();

    // The soft-deleted user must no longer appear in the table.
    await expect(page.getByRole('cell', { name: 'e2e-delete@test.local' })).not.toBeVisible();
  });

  test('admin delete button is disabled and cannot open a dialog', async ({ page }) => {
    await page.goto('/users');

    // The seeded admin row must have a disabled trash button.
    const adminDeleteBtn = page.getByRole('button', {
      name: 'Admin users cannot be deleted',
    });
    await expect(adminDeleteBtn).toBeVisible();
    await expect(adminDeleteBtn).toBeDisabled();
  });
});
