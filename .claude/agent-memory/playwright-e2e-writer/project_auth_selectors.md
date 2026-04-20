---
name: Auth page selectors and component structure
description: Confirmed working selectors for LoginPage, Navbar, ProtectedRoute, AdminRoute in TicketMaster
type: project
---

**LoginPage (`apps/client/src/pages/LoginPage.tsx`):**
- Heading: `page.getByRole('heading', { name: 'Sign in' })`
- Email field: `page.getByLabel('Email')` — `<Label htmlFor="email">` + `<Input id="email">`
- Password field: `page.getByLabel('Password')` — `<Label htmlFor="password">` + `<Input id="password" type="password">`
- Submit button: `page.getByRole('button', { name: 'Sign in' })` (also matches "Signing in…" transient state with `/sign in/i`)
- Email validation error text: `'Invalid email address'` (Zod schema message)
- Password validation error text: `'Password is required'` (Zod schema message)
- API/root error: rendered as `<p class="text-sm text-destructive">` — selector: `page.locator('form p.text-destructive').last()`

**Navbar (`apps/client/src/components/Navbar.tsx`):**
- Brand: `page.getByText('TicketMaster')`
- Sign out button: `page.getByRole('button', { name: 'Sign out' })` — only visible when `session` exists
- Users link (ADMIN only): `page.getByRole('link', { name: 'Users' })`
- User name display: `page.getByText(session.user.name)` (not testid, varies by user)

**Dashboard page (`apps/client/src/App.tsx` inline `Dashboard` component):**
- Heading: `page.getByRole('heading', { name: 'Dashboard' })`

**Users page (`apps/client/src/pages/UsersPage.tsx`):**
- Heading: `page.getByRole('heading', { name: 'Users' })`

**Route guards:**
- `ProtectedRoute`: no session → `<Navigate to="/login" replace />`
- `AdminRoute`: no session → `/login`; session but role !== 'ADMIN' → `/dashboard`
- Both render `null` while `isPending` is true — tests must wait for URL or heading, not for the guard itself

**How to apply:** Use these selectors directly when writing new auth-related tests. No `data-testid` attributes were needed for the auth flow.
