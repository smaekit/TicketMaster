# TicketMaster

An AI-powered customer support helpdesk. Inbound emails become tickets automatically, an AI agent attempts to resolve them instantly using a knowledge base, and human agents handle anything that escalates.

---

## What it does

1. A customer sends an email to your Mailgun address.
2. Mailgun POSTs a webhook — the server creates a ticket (or threads it as a reply on an existing one).
3. Two background jobs fire in parallel: one classifies the ticket (General / Technical / Refund / Uncategorized), the other attempts an AI auto-resolution using a knowledge-base document.
4. If the AI can answer, it replies by email and marks the ticket `RESOLVED`. Otherwise the ticket becomes `OPEN` for a human agent.
5. Human agents log in, triage the queue, assign tickets, write replies, and use AI tools (polish draft, summarise thread) to speed up their work.
6. Admins manage the agent roster (create, edit, soft-delete users).

---

## Tech stack

### Runtime — Bun

[Bun](https://bun.sh) replaces Node.js + npm + ts-node with a single binary. It runs TypeScript natively (no compile step in dev), installs packages 10-20× faster than npm, and manages the monorepo workspace. Everything from `bun dev:server` to `bun run test` goes through Bun.

### Monorepo — Bun Workspaces

The repo is split into three packages under one workspace root:

| Package | Purpose |
|---|---|
| `apps/server` | Express API + Prisma + background workers |
| `apps/client` | React SPA |
| `packages/shared` | Zod schemas and types used by both |

Shared code (validation schemas, enums) lives in `packages/shared` so the client and server always agree on shapes without duplicating definitions.

### Backend — Express 5 + TypeScript

Express 5 handles routing. It's intentionally minimal — no heavy framework magic, so the architecture is transparent and easy to extend. TypeScript catches shape errors between the DB layer, business logic, and HTTP layer at compile time.

Key patterns:
- All routes live under `/api` in `apps/server/src/routes/`.
- `requireAuth` / `requireAdmin` middleware guards routes by reading the Better Auth session.
- The `parseBody(schema, req.body, res)` helper (see `src/lib/validate.ts`) centralises Zod validation — a route returns early on invalid input without scattering `safeParse` calls.

### Database — PostgreSQL + Prisma

PostgreSQL is the single source of truth for tickets, users, sessions, and the pg-boss job queue.

[Prisma](https://www.prisma.io) provides type-safe queries generated from `apps/server/prisma/schema.prisma`. The generated client lives at `apps/server/generated/prisma` (not `node_modules`) so it works cleanly inside the workspace. The singleton client is in `src/lib/prisma.ts`.

Migrations are managed with `bun db:migrate` (`prisma migrate dev`). Schema changes always go through a migration file — never manual SQL against production.

### Auth — Better Auth

[Better Auth](https://better-auth.com) handles session management, password hashing, and CSRF protection. It is mounted as a catch-all at `/api/auth/*` before Express's JSON body parser, which is required because Better Auth reads raw request bodies itself.

Design decisions:
- **Self-registration is disabled** (`disabledPaths: ['/sign-up/email']`). Users are created by admins via scripts (`seed.ts`, `create-agent.ts`).
- The `role` field is an `additionalField` on the auth user — the client uses `inferAdditionalFields<typeof auth>()` to get full type inference on `session.user.role`.
- In non-production environments CSRF checks are disabled to simplify local development and test runs.

### Background jobs — pg-boss

[pg-boss](https://github.com/timgit/pg-boss) is a job queue backed by PostgreSQL (the `pgboss` schema in the same database). Jobs survive server restarts, are retried on failure, and can be inspected with plain SQL.

Three queues run on startup:

| Queue | Worker file | What it does |
|---|---|---|
| `classify-ticket` | `src/lib/classify.ts` | Calls the AI to label the ticket category |
| `auto-resolve-ticket` | `src/lib/auto-resolve.ts` | Attempts a full AI resolution using the knowledge base |
| `send-email` | `src/lib/email-worker.ts` | Sends outbound email via Resend (retries 3×) |

Pattern: the HTTP handler enqueues a job (`boss.send()`), which is a fast DB insert, then returns a response immediately. The worker runs asynchronously and never blocks the request.

### AI — Vercel AI SDK + OpenAI

AI features use the [Vercel AI SDK](https://sdk.vercel.ai) (`ai` package) with an OpenAI adapter. The model is `gpt-5-nano` — fast and cheap for classification and short-form generation.

Three AI features:
1. **Auto-resolve** — reads `knowledge-base.md` at startup and writes a full reply if it can answer; responds `CANNOT_RESOLVE` to escalate.
2. **Classify** — assigns one of four categories to every new ticket.
3. **Polish reply** — rewrites an agent's draft into polished support prose (on-demand, in the ticket detail page).
4. **Summarise** — produces a 2–3 sentence summary of the ticket thread (on-demand).

### Email inbound — Mailgun

Mailgun delivers inbound email to `POST /api/webhooks/mailgun`. The webhook signature (HMAC-SHA256) is verified in production to reject forged requests. In dev the signature check is skipped so you can send test payloads with `curl`.

The webhook handler threads replies onto existing open tickets by matching sender email + subject (stripping Re:/Fwd: prefixes).

### Email outbound — Resend

[Resend](https://resend.com) sends reply emails. The `sendReplyEmail` call is wrapped in a pg-boss job so transient failures are retried automatically. The `idempotencyKey` (e.g. `reply/<replyId>`) prevents duplicate sends on retry.

### Frontend — React 19 + Vite + React Router 7

The SPA is built with Vite and served as static files from Express in production (the client build output is copied to `apps/server/public`). In dev, Vite runs on port 5173 and proxies `/api` requests to Express on port 3000.

Routing is handled by React Router 7 with two guard components:
- `ProtectedRoute` — redirects unauthenticated users to `/login`.
- `AdminRoute` — redirects non-admins away from `/users`.

### Data fetching — TanStack Query + Axios

All server state is managed by [TanStack Query](https://tanstack.com/query). It handles loading/error/stale states, cache invalidation, and background refetches.

Requests go through a shared Axios instance (`src/lib/api.ts`) configured with `baseURL: '/api'` and `withCredentials: true`. Axios throws on non-2xx, so no manual `res.ok` checks are needed.

### UI — shadcn/ui + Tailwind CSS

[shadcn/ui](https://ui.shadcn.com) components are copied into `src/components/ui/` and owned by the project — they are plain React + Tailwind, not a black-box dependency. The theme is zinc with CSS variables, supporting `dark` class toggling.

Semantic color tokens (`bg-background`, `text-foreground`, `text-destructive`) are used throughout so the light/dark theme works without per-component overrides.

### Validation — Zod

[Zod](https://zod.dev) schemas are the single source of truth for data shapes. Schemas shared between client and server live in `packages/shared/index.ts` and are imported from `@ticketmaster/shared` in both apps. Client-only schemas live alongside their components.

### Error monitoring — Sentry

Sentry is initialised in `src/instrument.ts` (imported before everything else in `index.ts`) and the Express error handler is wired via `Sentry.setupExpressErrorHandler(app)`. Disabled in test environments.

---

## Project structure

```
TicketMaster/
├── apps/
│   ├── server/
│   │   ├── src/
│   │   │   ├── index.ts           # entry — starts pg-boss workers, listens
│   │   │   ├── app.ts             # Express app — CORS, auth, routes, static files
│   │   │   ├── instrument.ts      # Sentry init (must be first import)
│   │   │   ├── routes/
│   │   │   │   ├── index.ts       # mounts sub-routers
│   │   │   │   ├── tickets.ts     # CRUD + AI endpoints
│   │   │   │   ├── users.ts       # admin user management
│   │   │   │   └── webhooks.ts    # Mailgun inbound
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts        # requireAuth, requireAdmin
│   │   │   └── lib/
│   │   │       ├── auth.ts        # Better Auth instance
│   │   │       ├── boss.ts        # pg-boss singleton
│   │   │       ├── classify.ts    # classify-ticket queue + worker
│   │   │       ├── auto-resolve.ts # auto-resolve-ticket queue + worker
│   │   │       ├── email.ts       # Resend client
│   │   │       ├── email-worker.ts # send-email queue + worker
│   │   │       ├── prisma.ts      # PrismaClient singleton
│   │   │       ├── validate.ts    # parseBody / parseQuery helpers
│   │   │       ├── seed.ts        # creates/ensures admin user
│   │   │       └── create-agent.ts # one-off agent creation script
│   │   └── prisma/
│   │       └── schema.prisma
│   └── client/
│       └── src/
│           ├── App.tsx            # route tree
│           ├── main.tsx           # React root, QueryClientProvider
│           ├── index.css          # Tailwind + shadcn CSS variable theme
│           ├── components/
│           │   ├── ui/            # shadcn generated components
│           │   ├── ProtectedRoute.tsx
│           │   ├── AdminRoute.tsx
│           │   └── Navbar.tsx
│           ├── lib/
│           │   ├── api.ts         # Axios instance
│           │   ├── authClient.ts  # Better Auth client
│           │   └── utils.ts       # cn() helper
│           └── pages/             # one file per route + co-located tests
├── packages/
│   └── shared/
│       └── index.ts               # Zod schemas, Role enum, shared types
├── tests/
│   ├── global.setup.ts            # migrate reset + seed before e2e run
│   ├── global.teardown.ts
│   └── e2e/                       # Playwright specs
├── knowledge-base.md              # AI auto-resolve knowledge base
├── docker-compose.yml             # postgres (5433) + postgres_test (5434)
├── playwright.config.ts
└── package.json                   # workspace root + scripts
```

---

## Setup

### Prerequisites

- [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`)
- [Docker](https://www.docker.com) (for PostgreSQL)

### First run

```bash
# 1. Clone and install
git clone <repo-url>
cd TicketMaster
bun install

# 2. Start the databases
docker compose up -d postgres postgres_test

# 3. Configure environment
cp .env.example apps/server/.env
# Edit apps/server/.env — fill in BETTER_AUTH_SECRET (min 32 chars) at minimum

# 4. Run migrations and seed the admin user
bun db:migrate
bun db:seed

# 5. Start dev servers (two terminals)
bun dev:server   # Express on http://localhost:3000
bun dev:client   # Vite on http://localhost:5173
```

Open `http://localhost:5173` and log in with the credentials from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

### Environment variables

Copy `.env.example` to `apps/server/.env`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | yes | Random string, min 32 chars |
| `BETTER_AUTH_URL` | yes | Server base URL (`http://localhost:3000` in dev) |
| `CLIENT_URL` | yes | Client base URL (`http://localhost:5173` in dev) |
| `SEED_ADMIN_EMAIL` | yes | Email for the seeded admin account |
| `SEED_ADMIN_PASSWORD` | yes | Password for the seeded admin account |
| `OPENAI_API_KEY` | AI features | Required for classify, auto-resolve, polish, summarise |
| `MAILGUN_API_KEY` | email inbound | Mailgun credentials |
| `MAILGUN_SIGNING_KEY` | email inbound | HMAC signing key for webhook verification |
| `MAILGUN_DOMAIN` | email inbound | Your Mailgun sending domain |
| `RESEND_API_KEY` | email outbound | Resend API key |
| `RESEND_FROM_EMAIL` | email outbound | From address for outbound replies |
| `SENTRY_DSN` | optional | Sentry error reporting (server) |
| `VITE_SENTRY_DSN` | optional | Sentry error reporting (client) |

---

## Adding users

Users cannot self-register. Two scripts handle user creation:

```bash
# Ensure the admin account exists (idempotent)
bun db:seed

# Create an agent
cd apps/server
AGENT_EMAIL=alice@example.com AGENT_PASSWORD=secret123 AGENT_NAME="Alice" \
  bun --env-file=.env src/lib/create-agent.ts
```

---

## Development workflow

### Making a change

1. Edit code — Bun and Vite both hot-reload, so changes are reflected immediately.
2. If you change `schema.prisma`, run `bun db:migrate` to create a migration and regenerate the client.
3. If you add a shared schema, put it in `packages/shared/index.ts` and import from `@ticketmaster/shared` in both apps.

### Running tests

**Component tests** (Vitest + React Testing Library — fast, no server needed):

```bash
cd apps/client
bun run test          # run once
bun run test:watch    # watch mode
bun run test:ui       # interactive browser UI
```

**End-to-end tests** (Playwright — requires Docker databases running):

```bash
# From repo root — global setup resets the test DB automatically
bun run test:e2e
bun run test:e2e:ui   # interactive Playwright UI
```

The e2e suite uses a separate test database (`helpdesk_test`, port 5434) and runs the server on port 3001 and the client on port 5174 so they never collide with the dev stack.

### Simulating an inbound email

With the dev server running, POST to the webhook directly:

```bash
curl -X POST http://localhost:3000/api/webhooks/mailgun \
  -F "from=Jane Doe <jane@example.com>" \
  -F "subject=My order is missing" \
  -F "body-plain=Hi, I placed order #1234 three days ago and have not received it." \
  -F "timestamp=1234567890" \
  -F "token=dummy" \
  -F "signature=dummy"
```

Signature verification is skipped in development (`NODE_ENV !== 'production'`).

### Inspecting background jobs

```sql
SELECT id, name, data, state, createdon, completedon
FROM pgboss.job
ORDER BY createdon DESC
LIMIT 20;
```

### Updating the knowledge base

Edit `knowledge-base.md` at the repo root and restart the server. The auto-resolve worker reads the file once at startup.

---

## Code to PR — the full loop

1. **Branch** — `git checkout -b feat/my-feature`
2. **Build** — make your changes; Bun reloads automatically
3. **Test** — `bun run test` (component) and `bun run test:e2e` (if the change crosses browser + server + DB)
4. **Commit** — `git add <files> && git commit -m "feat: describe the change"`
5. **Push** — `git push -u origin feat/my-feature`
6. **PR** — ask Claude Code to open a pull request: type `/review` for an automated review of the branch, or ask Claude to `create a PR` — it will run `gh pr create` with a generated title and summary.

Claude Code is configured via `.github/workflows/` to run on PRs. It will review code, suggest improvements, and can apply fixes directly to the branch if you ask it to in a PR comment.

---

## Deployment

The project ships as two Docker images built from the `docker-compose.yml` in the repo root.

For production (e.g. Railway):
- Set all required environment variables in the platform's secret store.
- The server image serves the compiled client from `apps/server/public` — only one service needs to be exposed.
- `DATABASE_URL` should point to your managed PostgreSQL instance.
- pg-boss creates its schema automatically on first `boss.start()`.
