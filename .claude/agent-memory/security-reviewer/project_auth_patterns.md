---
name: Auth and authorization patterns
description: Confirmed secure and insecure patterns in TicketMaster auth/authz as of first review
type: project
---

Confirmed secure patterns:
- `requireAuth` always re-fetches role from Prisma DB — role cannot be spoofed via session token manipulation
- `requireAdmin` delegates to `requireAuth` then checks `role === 'ADMIN'` — no bypass path observed
- CORS is locked to `CLIENT_URL` env var, not wildcard
- Better Auth `role` field has `input: false` — clients cannot set it at sign-up or update
- `disabledPaths: ['/sign-up/email']` prevents public self-registration

Known risks to re-check when routes are implemented:
- All four `/api/users` routes (GET /, POST /, PATCH /:id, DELETE /:id) are currently stubs with NO auth middleware — must add `requireAdmin` before implementation
- `/api/tickets` routes (GET /, GET /:id, PATCH /:id) are stubs with NO auth middleware — must add `requireAuth` (or `requireAdmin` for PATCH) before implementation
- `/api/webhooks/mailgun` stub has NO Mailgun signature verification — critical gap to fill on implementation
- `/api/health` is intentionally public (no auth) — acceptable but worth documenting
- `disableCSRFCheck` is `true` in non-production; CSRF protection is missing in dev/staging

**Why:** First full security review, 2026-04-20. Routes are stubs now, but these gaps will become exploitable the moment logic is added.

**How to apply:** On every future PR that implements any of these routes, immediately verify that appropriate middleware is present before treating the implementation as reviewable.
