## Implementation Plan

---

### Phase 1 — Project Foundation

Set up the skeleton for both frontend and backend before writing any feature code.

**Backend**
- Initialize Node.js + Express + TypeScript project
- Configure ESLint, Prettier, tsconfig
- Set up PostgreSQL + Prisma
- Docker Compose with app + PostgreSQL containers

**Frontend**
- Initialize React + TypeScript

**Deliverable:** Both apps run locally via Docker Compose. Admin seed exists in the database.

---

### Phase 2 — Authentication

Implement login/logout with database sessions before building any protected features.

- `POST /auth/login` — validate credentials, create session
- `POST /auth/logout` — destroy session
- Session middleware (express-session + PostgreSQL session store)
- Protected route middleware (checks session + role)
- Login page (frontend)
- Redirect unauthenticated users to login

**Deliverable:** Admin can log in and access a protected dashboard shell. Agents blocked from admin-only routes.

---

### Phase 3 — User Management

Admin-only. Must come before agents can use the system.

- `GET /users` — list all agents
- `POST /users` — create agent account
- `PATCH /users/:id` — update agent details
- `DELETE /users/:id` — deactivate agent
- User management page (frontend) — visible to Admin only

**Deliverable:** Admin can create and manage agent accounts.

---

### Phase 4 — Email Ingestion & Ticket Creation

Wire up Mailgun inbound webhook to create tickets from student emails.

- `POST /webhooks/mailgun` — receive inbound email payload
- Parse sender, subject, and body from webhook
- Create ticket in database with status `Open`
- Validate webhook signature (security)
- Expose ticket data via:
  - `GET /tickets` — list with filtering by status and category
  - `GET /tickets/:id` — ticket detail

**Frontend**
- Ticket list page — filterable by status and category
- Ticket detail page — shows sender, subject, body, status, category

**Deliverable:** Emails sent to the support inbox appear as tickets in the system.

---

### Phase 5 — AI Classification & Knowledge Base

Introduce Claude API for ticket classification and knowledge base matching.

- Integrate Claude API client
- On ticket creation, call Claude to classify into: `General Question`, `Technical Question`, or `Refund Request`
- Save category to ticket
- Build knowledge base schema (`kb_articles` table — title, content, category)
- Admin UI to create, edit, and delete KB articles
- On ticket creation, query KB for a relevant article match using Claude

**Deliverable:** Tickets are automatically categorized. Matched tickets are flagged for auto-response. Unmatched tickets stay open for agents.

---

### Phase 6 — Auto-Response & Outbound Email

Send AI-generated replies via SendGrid when a KB match is found.

- Integrate SendGrid client
- When KB match found: Claude generates a personalized response using the KB article + ticket context
- Send response email to student via SendGrid
- Mark ticket status as `Resolved`
- When no KB match: ticket remains `Open` and is surfaced to agents

**Deliverable:** Tickets with KB matches are automatically answered and resolved without agent involvement.

---

### Phase 7 — Agent Workflow

Give agents the tools to handle tickets that AI could not resolve.

- Agent can view all `Open` unresolved tickets
- Ticket detail shows:
  - AI-generated summary of the ticket
  - AI-suggested reply (editable before sending)
- Agent can edit and send reply via SendGrid
- Agent can update ticket status to `Resolved` or `Closed`
- Agent can manually change ticket category

**Frontend updates**
- Summary and suggested reply displayed in ticket detail
- Reply editor with send button
- Status controls

**Deliverable:** Agents can efficiently handle escalated tickets with AI assistance.

---

### Phase 8 — Dashboard

Overview page for Admins and Agents.

- Total tickets by status (Open / Resolved / Closed)
- Tickets by category
- Recent ticket activity
- Unresolved ticket count (requires agent attention)

**Deliverable:** Admins and agents have a at-a-glance view of the support queue.

---

### Phase 9 — Deployment

Prepare for production.

- Production Docker Compose / Dockerfiles
- Environment variable management (.env.example, secrets)
- Database migrations in CI
- Deploy to chosen cloud provider (Railway / Fly.io / AWS)
- Configure Mailgun inbound route to point to production webhook URL
- Configure SendGrid sending domain

**Deliverable:** System running in production, receiving real emails.

---

## Phase Summary

| Phase | Focus | Depends On |
|-------|-------|------------|
| 1 | Project foundation & Docker | — |
| 2 | Authentication & sessions | 1 |
| 3 | User management | 2 |
| 4 | Email ingestion & ticket CRUD | 2 |
| 5 | AI classification & knowledge base | 4 |
| 6 | Auto-response & SendGrid | 5 |
| 7 | Agent workflow & AI assist | 5, 6 |
| 8 | Dashboard | 4, 5 |
| 9 | Deployment | All |
