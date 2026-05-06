# TicketMaster — Project Instructions

## Documentation

Always use **Context7 MCP** (`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`) to fetch up-to-date documentation before working with any library or framework used in this project. Do this even for well-known packages — training data may be outdated.

Key libraries to always fetch docs for:
- `Bun` — runtime, package manager, workspaces
- `Express` — routing, middleware, error handling
- `Prisma` — schema, migrations, client queries
- `React` — hooks, component patterns
- `React Router` — routing, loaders, navigation
- `Tailwind CSS` — utility classes, configuration
- `Vite` — config, plugins, proxy
- `express-session` — session setup, store config
- `@anthropic-ai/sdk` — Claude API client
- `connect-pg-simple` — PostgreSQL session store
- `shadcn/ui` — component installation, theming
- `@tanstack/react-query` — query/mutation patterns, cache invalidation
- `axios` — HTTP client configuration
- `vitest` — test configuration, mocking, assertions
- `@testing-library/react` — render, queries, async utilities
- `zod` — schema definition, safeParse, error messages

## Project Structure

Bun workspace monorepo:

```
TicketMaster/
├── apps/
│   ├── server/          # Express 5 + TypeScript + Prisma
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── app.ts           # CORS, session, routes wired up
│   │   │   ├── routes/          # auth, users, tickets, webhooks
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts      # requireAuth, requireAdmin
│   │   │   └── lib/
│   │   │       ├── prisma.ts    # singleton PrismaClient
│   │   │       ├── validate.ts  # parseBody() helper — Zod schema validation for route handlers
│   │   │       ├── seed.ts      # admin seed
│   │   │       └── create-agent.ts  # one-off agent user creation script
│   │   └── prisma/
│   │       └── schema.prisma
│   └── client/          # React 19 + Vite + Tailwind + React Router 7 + shadcn/ui
│       ├── components.json      # shadcn config (zinc theme, cssVariables)
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── index.css        # Tailwind + shadcn CSS variable theme
│           ├── components/
│           │   ├── ui/          # shadcn generated components
│           │   ├── ProtectedRoute.tsx  # redirects unauthenticated to /login
│           │   ├── AdminRoute.tsx      # redirects non-admins to /dashboard
│           │   └── Navbar.tsx
│           ├── lib/
│           │   ├── utils.ts     # cn() helper (clsx + tailwind-merge)
│           │   ├── api.ts       # shared axios instance (baseURL: /api, withCredentials)
│           │   └── authClient.ts
│           └── pages/
│               ├── LoginPage.tsx
│               └── UsersPage.tsx
├── packages/
│   └── shared/          # Shared Zod schemas used by both server and client
│       └── index.ts
├── playwright.config.ts # E2E test config (globalSetup, webServer)
├── tsconfig.json        # root TS config covering tests/ and playwright.config.ts
├── tests/
│   ├── global.setup.ts  # migrate reset + seed test DB before every run
│   ├── global.teardown.ts
│   └── e2e/             # test files go here
├── docker-compose.yml   # postgres dev (5433) + postgres_test (5434), server, client
├── .env.example
└── package.json         # workspace root
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL via Docker |
| ORM | Prisma |
| Auth | Better Auth (Prisma adapter, email/password) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router 7, shadcn/ui, TanStack Query, Axios |
| AI | Claude API (`@anthropic-ai/sdk`) |
| Email inbound | Mailgun webhook |
| Email outbound | SendGrid |
| Deployment | Docker + Docker Compose |

## Dev Commands

```bash
# bun is at ~/.bun/bin/bun — add to PATH first:
export PATH="$HOME/.bun/bin:$PATH"

bun install              # install all workspace deps
bun dev:server           # Express on http://localhost:3000
bun dev:client           # Vite on http://localhost:5173
bun db:migrate           # run Prisma migrations
bun db:seed              # seed admin user
bun db:studio            # open Prisma Studio
```

## Environment

Copy `.env.example` to `apps/server/.env` and fill in values:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — min 32 chars random string
- `BETTER_AUTH_URL` — server base URL (e.g. `http://localhost:3000`)
- `CLIENT_URL` — client base URL (e.g. `http://localhost:5173`)
- `ANTHROPIC_API_KEY` — Claude API key
- `MAILGUN_API_KEY` / `MAILGUN_SIGNING_KEY` / `MAILGUN_DOMAIN`
- `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL`

## User Management

Users cannot self-register. Two scripts exist under `apps/server/src/lib/`:

- **`seed.ts`** (`bun db:seed`) — creates/ensures the admin user via `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` env vars
- **`create-agent.ts`** — creates a new agent user; run with:
  ```bash
  cd apps/server && AGENT_EMAIL=x@y.com AGENT_PASSWORD=pass AGENT_NAME="Name" bun --env-file=.env src/lib/create-agent.ts
  ```
  Role defaults to `AGENT` — no extra step needed.

## Authentication (Better Auth)

Auth is handled by **Better Auth** — not express-session. Update the tech stack mental model accordingly.

**Server:**
- Auth instance: `apps/server/src/lib/auth.ts` — configured with Prisma adapter, email/password only, sign-up disabled (admin-invite flow)
- Mounted at: `app.all('/api/auth/*splat', toNodeHandler(auth))` in `app.ts`
- Env vars required: `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`, `CLIENT_URL`

**Middleware (`apps/server/src/middleware/auth.ts`):**
- `requireAuth` — validates session via `auth.api.getSession()`, attaches `res.locals.session` (includes `user.role` from Prisma)
- `requireAdmin` — calls `requireAuth` then checks `role === 'ADMIN'`
- Session type is augmented on `res.locals` — access as `res.locals.session.user.role`

**Client:**
- Auth client: `apps/client/src/lib/authClient.ts` — `createAuthClient()` with `inferAdditionalFields<typeof auth>()` plugin from `better-auth/client/plugins`
- Sign in: `authClient.signIn.email({ email, password })`
- Session hook: `authClient.useSession()` → `{ data: session, isPending }`
- `session.user.role` is fully typed — `inferAdditionalFields` syncs additional fields from the server auth instance
- All auth requests go to `/api/auth/*` — proxied by Vite to port 3000

**Important constraints:**
- Sign-up via `/sign-up/email` is disabled — users must be created via the `create-agent.ts` script or `seed.ts`
- CSRF check is disabled in non-production environments

## Conventions

- All API routes are under `/api` — new routes go in `apps/server/src/routes/`
- Use `requireAuth` / `requireAdmin` middleware from `src/middleware/auth.ts` to protect routes
- Frontend fetches use `/api/...` paths — Vite proxies them to `localhost:3000` in dev
- Prisma client is a singleton in `src/lib/prisma.ts` — always import from there
- Session user data is typed in `src/middleware/auth.ts` via `express-session` module augmentation
- Use **Zod** (`zod`) for request body validation in server routes via the `parseBody` helper in `src/lib/validate.ts` — never call `safeParse` directly in a route handler:
  ```ts
  import { parseBody } from '../lib/validate'

  const data = parseBody(mySchema, req.body, res)
  if (!data) return  // response already sent as 400

  // data is fully typed here
  ```

## Role enum (`packages/shared`)

The `Role` const object and type live in `packages/shared/index.ts` and must be used everywhere a role value is referenced — never use the raw strings `'ADMIN'` or `'AGENT'`.

```ts
import { Role } from '@ticketmaster/shared'

user.role === Role.ADMIN   // comparison
user.role === Role.AGENT   // comparison
role: Role                 // type annotation
```

`Role` is a `const` object (not a TypeScript `enum`) so the values are plain strings at runtime and tree-shakeable. `type Role` is the union `'ADMIN' | 'AGENT'` inferred from the object.

## Shared Schemas (`packages/shared`)

Any Zod schema used for validation on **both** the server and client must live in `packages/shared/index.ts` and be imported from `@ticketmaster/shared` in both apps. Never duplicate a schema.

**Adding a new shared schema:**

1. Define the schema and export its inferred type in `packages/shared/index.ts`:
   ```ts
   export const mySchema = z.object({ ... })
   export type MyInput = z.infer<typeof mySchema>
   ```

2. Import in the server route:
   ```ts
   import { mySchema } from '@ticketmaster/shared'
   ```

3. Import in the client page/component:
   ```ts
   import { mySchema, type MyInput } from '@ticketmaster/shared'
   ```

**Rules:**
- Always include `.trim()` on string fields that should be sanitized (name, password, etc.) — the shared schema is the canonical source for both client validation and server sanitization
- `zod` is a peer dependency of `@ticketmaster/shared` — both apps supply it, no need to add it to the shared package's dependencies
- No framework-specific code in `packages/shared` — pure Zod only

## Data Fetching (Client)

- Use **TanStack Query** (`@tanstack/react-query`) for all server state — no `useEffect`+`useState` for fetches
- Use **Axios** via the shared instance at `apps/client/src/lib/api.ts` — never use `fetch` directly
  - Instance has `baseURL: '/api'` and `withCredentials: true` pre-configured
  - Axios throws on non-2xx automatically — no manual `res.ok` checks needed
- `QueryClientProvider` is set up in `main.tsx` — all pages have access

## Component Testing

Tests live alongside their component: `src/pages/Foo.tsx` → `src/pages/Foo.test.tsx`.

**Stack:** Vitest + React Testing Library + jsdom + `@testing-library/jest-dom`

**Commands** (run from `apps/client/`):
```bash
bun run test       # run all tests once  ← use this, NOT "bun test"
bun run test:watch # watch mode
bun run test:ui    # interactive browser UI (best for writing new tests)
```

> **Important:** Always use `bun run test`, never `bun test`. `bun test` invokes Bun's native test runner, which doesn't load the Vitest config and fails with "`describe` is not defined".

**Patterns:**
- Wrap components under test in `QueryClientProvider` with `retry: false` to prevent retries in tests
- Mock `@/lib/api` with `vi.mock('@/lib/api', () => ({ default: { get: vi.fn() } }))` — never hit the real network
- Use `vi.mocked(api.get).mockResolvedValue({ data: ... })` for success and `.mockRejectedValue(...)` for errors
- Use `findBy*` queries (async) when waiting for data to load; `getBy*` for things already in the DOM
- Use `waitFor` when asserting that something disappears or a count stabilises
- Call `vi.clearAllMocks()` in `beforeEach`
- Test setup file: `src/test/setup.ts` (imports `@testing-library/jest-dom`)

## E2E Testing

**Default to component tests.** E2E tests are slow and require a running stack — only write them when the behaviour cannot be verified at the component level.

**Write an e2e test only when ALL of the following are true:**
- It crosses multiple real system boundaries (browser + server + DB)
- Mocking would hide the exact integration being verified
- No component test can cover the same confidence

**Good e2e candidates:**
- Route protection (unauthenticated redirect) — ProtectedRoute depends on a real session
- Full-stack data flows — e.g. webhook creates DB record → API serves it → React renders it
- Auth flows — login, logout, session persistence

**Do NOT write e2e tests for:**
- Rendering (headings, labels, column headers) — component test
- Loading / error / empty states — component test
- UI logic (badge colours, date formatting, conditional links) — component test
- Navigation (`<Link href="...">`) — component test with `MemoryRouter` + `toHaveAttribute('href', ...)`

Use the **`playwright-e2e-writer`** agent when e2e tests are genuinely needed. Tests go in `tests/e2e/`. The agent knows the full test setup (ports, credentials, file structure, auth patterns).

## UI Components (shadcn/ui)

- Add components with: `bunx shadcn@latest add <component>` (run from `apps/client/`)
- Import from `@/components/ui/<component>`
- Use `cn()` from `@/lib/utils` for conditional class merging
- Use semantic color tokens (`bg-background`, `text-foreground`, `text-destructive`, etc.) — never hard-code colors
- Default theme: zinc, CSS variables, `darkMode: ['class']`
