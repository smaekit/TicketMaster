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
│   │   │       └── seed.ts      # admin seed
│   │   └── prisma/
│   │       └── schema.prisma
│   └── client/          # React 19 + Vite + Tailwind + React Router 7 + shadcn/ui
│       ├── components.json      # shadcn config (zinc theme, cssVariables)
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── index.css        # Tailwind + shadcn CSS variable theme
│           ├── components/
│           │   └── ui/          # shadcn generated components
│           ├── lib/
│           │   ├── utils.ts     # cn() helper (clsx + tailwind-merge)
│           │   └── authClient.ts
│           └── pages/
├── docker-compose.yml   # postgres (5432), server (3000), client (80)
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
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router 7, shadcn/ui |
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
- `SESSION_SECRET` — secret for express-session
- `ANTHROPIC_API_KEY` — Claude API key
- `MAILGUN_API_KEY` / `MAILGUN_SIGNING_KEY` / `MAILGUN_DOMAIN`
- `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL`

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
- Auth client: `apps/client/src/lib/authClient.ts` — `createAuthClient()` from `better-auth/react`
- Sign in: `authClient.signIn.email({ email, password })`
- Session hook: `authClient.useSession()` → `{ data: session, isPending }`
- All auth requests go to `/api/auth/*` — proxied by Vite to port 3000

**Important constraints:**
- Sign-up via `/sign-up/email` is disabled — users must be created by an admin
- CSRF check is disabled in non-production environments

## Conventions

- All API routes are under `/api` — new routes go in `apps/server/src/routes/`
- Use `requireAuth` / `requireAdmin` middleware from `src/middleware/auth.ts` to protect routes
- Frontend fetches use `/api/...` paths — Vite proxies them to `localhost:3000` in dev
- Prisma client is a singleton in `src/lib/prisma.ts` — always import from there
- Session user data is typed in `src/middleware/auth.ts` via `express-session` module augmentation

## UI Components (shadcn/ui)

- Add components with: `bunx shadcn@latest add <component>` (run from `apps/client/`)
- Import from `@/components/ui/<component>`
- Use `cn()` from `@/lib/utils` for conditional class merging
- Use semantic color tokens (`bg-background`, `text-foreground`, `text-destructive`, etc.) — never hard-code colors
- Default theme: zinc, CSS variables, `darkMode: ['class']`
