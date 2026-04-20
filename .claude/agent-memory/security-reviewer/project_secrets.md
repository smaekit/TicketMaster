---
name: Secrets and credential risks
description: Known credential and secrets hygiene issues found in first security review
type: project
---

- `apps/server/.env` is correctly gitignored (`.gitignore` includes `.env`)
- `.env.example` (checked into repo) contains weak placeholder values: `BETTER_AUTH_SECRET=change-me-in-production`, `SEED_ADMIN_PASSWORD=change-me-in-production`, and a real default `DATABASE_URL` — these are acceptable as examples but must never be used in production
- `DATABASE_URL` in `.env.example` includes credentials in the connection string — standard for Postgres but worth noting
- No hardcoded secrets observed in application source code (auth.ts, app.ts, middleware, routes)

**Why:** Documented as institutional knowledge so future reviewers know `.env` is gitignored and can focus on other vectors.

**How to apply:** If `.gitignore` is ever modified, verify `.env` remains excluded.
