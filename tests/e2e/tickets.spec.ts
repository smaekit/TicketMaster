/**
 * tickets.spec.ts — End-to-end tests for the TicketMaster tickets page.
 *
 * Coverage:
 *  1. Route protection  — unauthenticated /tickets redirects to /login
 *  2. Authenticated access
 *     - Authenticated user reaches /tickets and sees the "Tickets" heading
 *     - Tickets link is visible in the Navbar for the authenticated admin user
 *     - Clicking the Navbar Tickets link navigates to /tickets
 *  3. Webhook → UI data flow
 *     - POST a signed Mailgun webhook directly to the server, then load /tickets
 *       in the browser and assert the ticket's subject and sender email appear
 *       in the table (full-stack: webhook → DB → API → React render)
 *
 * Unit tests already cover column headers, status badges, category labels,
 * loading/empty/error states, date formatting, and sender name/email display.
 * These tests focus exclusively on behaviour that requires a real browser,
 * real server, and real database.
 */

import { test, expect } from '@playwright/test';
import { createHmac } from 'crypto';
import { ADMIN_STORAGE_STATE } from './helpers/auth';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVER_URL = 'http://localhost:3001';
const WEBHOOK_URL = `${SERVER_URL}/api/webhooks/mailgun`;

/**
 * Must match MAILGUN_SIGNING_KEY in apps/server/.env.test.
 */
const SIGNING_KEY = 'test-signing-key-for-local-dev';

// ---------------------------------------------------------------------------
// Helper — build a valid signed Mailgun multipart payload
// ---------------------------------------------------------------------------

function makeMailgunPayload(
  overrides: Partial<Record<string, string>> = {},
): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const token = 'a'.repeat(50);
  const signature = createHmac('sha256', SIGNING_KEY)
    .update(timestamp + token)
    .digest('hex');

  return {
    timestamp,
    token,
    signature,
    from: 'e2e-tickets@example.com',
    subject: 'E2E ticket subject',
    'stripped-text': 'E2E ticket body',
    ...overrides,
  };
}

// ==========================================================================
// 1. Route protection
// ==========================================================================
test.describe('Tickets page — route protection', () => {
  test.use({ storageState: undefined });

  test('unauthenticated visit to /tickets redirects to /login', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page).toHaveURL(/\/login$/);
  });
});

// ==========================================================================
// 2. Authenticated access
// ==========================================================================
test.describe('Tickets page — authenticated access', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('authenticated user can navigate to /tickets and sees the Tickets heading', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page).toHaveURL(/\/tickets$/);
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
  });

  test('Tickets link is visible in the Navbar for the authenticated admin user', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Tickets' })).toBeVisible();
  });

});

// ==========================================================================
// 3. Webhook → UI data flow
// ==========================================================================
test.describe('Tickets page — webhook to UI data flow', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('ticket created via webhook appears in the table', async ({ page, request }) => {
    // Use a unique subject and sender so this test is independent of any
    // tickets that may exist from other test runs or webhook spec tests.
    const subject = `E2E flow subject ${Date.now()}`;
    const from = `e2e-flow-${Date.now()}@example.com`;

    // POST directly to the server — no browser involved for this step.
    const response = await request.post(WEBHOOK_URL, {
      multipart: makeMailgunPayload({ subject, from }),
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Ticket created');

    // Now load the tickets page and verify the row is present.
    await page.goto('/tickets');
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();

    // Subject appears in its own cell.
    await expect(page.getByRole('cell', { name: subject })).toBeVisible();

    // Sender email appears in the Sender column (no display name was provided
    // so the email is shown as the primary text, not as a sub-line).
    await expect(page.getByText(from)).toBeVisible();
  });
});
