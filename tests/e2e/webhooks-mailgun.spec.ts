/**
 * webhooks-mailgun.spec.ts — End-to-end API tests for POST /api/webhooks/mailgun
 *
 * Coverage:
 *  1. Happy path         — valid signature + new sender+subject → 200 "Ticket created"
 *  2. Missing field      — omit `token` → 400 validation error
 *  3. Invalid signature  — wrong HMAC → 401
 *  4. Stale timestamp    — timestamp older than 5 minutes → 400
 *  5. Duplicate          — same sender+subject twice → first 200 "Ticket created",
 *                          second 200 "Duplicate ticket ignored"
 *  6. From header parse  — RFC 5322 "Name <email>" format is accepted
 *  7. Missing subject    — omit subject → ticket created with "(No subject)"
 *  8. Body preference    — both stripped-text and body-plain present → stripped-text wins
 *
 * These are pure API tests — no browser is opened. All requests go directly to
 * the test server at http://localhost:3001 using Playwright's `request` fixture.
 *
 * The test DB is reset before every Playwright run by global.setup.ts, so tests
 * start with a clean slate. Tests within this file share that state; the order
 * of the duplicate-suppression test (test 5) relies on test 1 having already
 * created a ticket with the same sender+subject. All other tests use distinct
 * sender addresses to remain fully independent.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import { createHmac } from 'crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVER_URL = 'http://localhost:3001';
const WEBHOOK_URL = `${SERVER_URL}/api/webhooks/mailgun`;

/**
 * The signing key set in apps/server/.env.test. The server reads this value
 * from process.env.MAILGUN_SIGNING_KEY at request time.
 */
const SIGNING_KEY = 'test-signing-key-for-local-dev';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a valid Mailgun multipart payload with a fresh timestamp and a correct
 * HMAC-SHA256 signature.  Pass `overrides` to replace or omit individual fields
 * (e.g. pass { token: undefined } to omit a required field, or
 * { signature: 'bad' } to send a wrong signature).
 */
function makeMailgunPayload(
  overrides: Partial<Record<string, string | undefined>> = {},
): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const token = 'a'.repeat(50);
  const signature = createHmac('sha256', SIGNING_KEY)
    .update(timestamp + token)
    .digest('hex');

  const base: Record<string, string> = {
    timestamp,
    token,
    signature,
    from: 'sender@example.com',
    subject: 'Test subject',
    'stripped-text': 'Hello from stripped text',
    'body-plain': 'Hello from body plain',
  };

  // Apply overrides — undefined values delete the key so it is not sent.
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete base[key];
    } else {
      base[key] = value;
    }
  }

  return base;
}

/**
 * Post a multipart/form-data payload to the Mailgun webhook endpoint using
 * Playwright's request fixture. Returns the raw APIResponse so each test can
 * assert on status and body independently.
 */
async function postWebhook(
  request: APIRequestContext,
  fields: Record<string, string>,
) {
  // Build the multipart object expected by Playwright's request.post.
  // Each value must be a string (no files here, so no buffer/mimeType needed).
  const multipart: Record<string, string> = { ...fields };

  return request.post(WEBHOOK_URL, { multipart });
}

// ==========================================================================
// 1. Happy path
// ==========================================================================
test.describe('Mailgun webhook — happy path', () => {
  test('returns 200 "Ticket created" for a valid new email', async ({ request }) => {
    const payload = makeMailgunPayload({
      from: 'happypath@example.com',
      subject: 'Happy path subject',
    });

    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Ticket created');
  });
});

// ==========================================================================
// 2. Missing required field
// ==========================================================================
test.describe('Mailgun webhook — missing required field', () => {
  test('returns 400 when `token` is omitted', async ({ request }) => {
    // Remove token — Zod will reject the payload with a 400.
    const payload = makeMailgunPayload({ token: undefined });

    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(400);
  });
});

// ==========================================================================
// 3. Invalid signature
// ==========================================================================
test.describe('Mailgun webhook — invalid signature', () => {
  test('returns 401 when the HMAC signature is wrong', async ({ request }) => {
    const payload = makeMailgunPayload({
      from: 'badsig@example.com',
      subject: 'Bad signature subject',
      // Replace the correct signature with a hex string of the same length
      // that will not match the HMAC computed by the server.
      signature: 'f'.repeat(64),
    });

    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Invalid signature');
  });
});

// ==========================================================================
// 4. Stale timestamp
// ==========================================================================
test.describe('Mailgun webhook — stale timestamp', () => {
  test('returns 400 when the timestamp is older than 5 minutes', async ({ request }) => {
    // Six minutes ago (360 seconds).
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 360);
    const token = 'b'.repeat(50);
    const signature = createHmac('sha256', SIGNING_KEY)
      .update(staleTimestamp + token)
      .digest('hex');

    const payload: Record<string, string> = {
      timestamp: staleTimestamp,
      token,
      signature,
      from: 'stale@example.com',
      subject: 'Stale timestamp subject',
    };

    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Webhook timestamp too old');
  });
});

// ==========================================================================
// 5. Duplicate suppression
//
// NOTE: This test intentionally depends on the state written by the first
// request below. The two requests use the same sender + subject, and the
// second must see the ticket that the first created. Both requests run within
// the same test so execution order is guaranteed.
// ==========================================================================
test.describe('Mailgun webhook — duplicate suppression', () => {
  test('first delivery creates a ticket; second delivery with same sender+subject is ignored', async ({ request }) => {
    const from = 'duplicate@example.com';
    const subject = 'Duplicate suppression subject';

    // First delivery — a new ticket should be created.
    const first = await postWebhook(request, makeMailgunPayload({ from, subject }));
    expect(first.status()).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.message).toBe('Ticket created');

    // Second delivery with identical sender + subject — should be suppressed.
    const second = await postWebhook(request, makeMailgunPayload({ from, subject }));
    expect(second.status()).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.message).toBe('Duplicate ticket ignored');
  });
});

// ==========================================================================
// 6. From header parsing — RFC 5322 "Display Name <email>" format
// ==========================================================================
test.describe('Mailgun webhook — From header parsing', () => {
  test('accepts RFC 5322 "Name <email>" format and creates a ticket', async ({ request }) => {
    const payload = makeMailgunPayload({
      from: 'Alice Smith <alice@example.com>',
      subject: 'RFC 5322 from header subject',
    });

    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Ticket created');
  });
});

// ==========================================================================
// 7. Missing subject → defaults to "(No subject)"
// ==========================================================================
test.describe('Mailgun webhook — missing subject', () => {
  test('returns 200 and creates a ticket with subject "(No subject)" when subject is omitted', async ({ request }) => {
    const payload = makeMailgunPayload({
      from: 'nosubject@example.com',
      subject: undefined,
    });

    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Ticket created');
  });

  test('a second email from the same sender with no subject is treated as a duplicate', async ({ request }) => {
    // The previous test already created a ticket for nosubject@example.com with
    // subject "(No subject)". Sending another one should be suppressed.
    const payload = makeMailgunPayload({
      from: 'nosubject@example.com',
      subject: undefined,
    });

    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Duplicate ticket ignored');
  });
});

// ==========================================================================
// 8. Body preference — stripped-text takes precedence over body-plain
// ==========================================================================
test.describe('Mailgun webhook — body field preference', () => {
  test('returns 200 when both stripped-text and body-plain are provided', async ({ request }) => {
    // The server uses stripped-text when both fields are present. We verify
    // the request succeeds; the body content stored in the DB is not exposed
    // by the webhook response, so we only assert on the HTTP outcome here.
    const payload = makeMailgunPayload({
      from: 'bodypref@example.com',
      subject: 'Body preference subject',
      'stripped-text': 'This is the stripped body',
      'body-plain': 'This is the plain body',
    });

    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Ticket created');
  });
});
