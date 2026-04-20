---
name: E2E test infrastructure decisions
description: How Playwright is wired up in TicketMaster — config, storageState strategy, DB reset, ports
type: project
---

Playwright is already installed (`@playwright/test ^1.51.0` in root devDependencies).

**Config file:** `playwright.config.ts` at repo root.
- `testDir: ./tests/e2e`
- `baseURL: http://localhost:5174` (test client port, NOT 5173)
- `webServer` starts `dev:server:test` on port 3001 and `dev:client:test` on port 5174
- `globalSetup: tests/global.setup.ts` — resets DB, seeds admin, saves storageState
- `globalTeardown: tests/global.teardown.ts` — currently a no-op

**Why separate test ports:** The test env runs server on 3001 (not 3000) and client on 5174 (not 5173) so dev and test can coexist. The client vite config must proxy `/api` to port 3001 in test mode.

**Test environment:** `apps/server/.env.test` — DB on port 5434 (separate Docker postgres), `SEED_ADMIN_EMAIL=admin@test.local`, `SEED_ADMIN_PASSWORD=Test1234!`.

**StorageState strategy:** `global.setup.ts` does a real headless Chromium login and writes `tests/e2e/.auth/admin.json`. Tests that need an authenticated context use `test.use({ storageState: ADMIN_STORAGE_STATE })`. Tests that need an unauthenticated context use `test.use({ storageState: undefined })`. This is the preferred pattern over `beforeAll` logins.

**How to apply:** When adding new test files, always declare auth intent at the top of each `describe` block with `test.use({ storageState: ... })` rather than logging in inside `beforeEach`.
