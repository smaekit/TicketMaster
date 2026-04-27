---
name: API-only test patterns (webhook tests)
description: Patterns for writing pure API tests with Playwright's request fixture — no browser, direct server calls, multipart/form-data
type: project
---

Pure API tests (no browser) use the `request` fixture from `@playwright/test` directly. Because `baseURL` points to the client (`http://localhost:5174`), API-only tests must use full server URLs: `http://localhost:3001/api/...`.

For multipart/form-data, pass a plain `Record<string, string>` to `request.post({ multipart: { ... } })`. Playwright serialises it as `multipart/form-data` automatically — no need to construct `FormData` manually.

**Why:** The Mailgun webhook (`POST /api/webhooks/mailgun`) uses multer, which requires multipart/form-data. JSON bodies are not accepted.

**How to apply:** Any time a route uses multer (or any multipart parser), build payloads as `{ multipart: { field: 'value', ... } }` in Playwright. Omit a field by deleting the key from the object before passing — do not send `undefined` as a value.

For HMAC signature generation in tests, import `createHmac` from Node's built-in `'crypto'` module directly — do not import from any server app package.

The `MAILGUN_SIGNING_KEY` env var in `apps/server/.env.test` must be set to `test-signing-key-for-local-dev` for webhook tests to pass (was empty by default).

**Stale-timestamp tests** must compute the HMAC using the stale timestamp + token — the server verifies age before signature, so the request needs a valid signature over the stale data to reach the timestamp check. Actually: the server checks timestamp first (line 57 of webhooks.ts), then signature (line 62), so a stale-timestamp test only needs a structurally valid payload — the HMAC still needs to be correct for the request to reach the timestamp rejection. Verified: timestamp check runs BEFORE signature check.

**Duplicate-suppression tests** that depend on prior state within the same `test` block are acceptable because both requests are inside a single `test()` call — order is guaranteed. Tests in separate `test()` calls should use unique senders to stay independent.
