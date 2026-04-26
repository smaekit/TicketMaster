---
name: Users page CRUD selectors and test patterns
description: Confirmed selectors and patterns for testing the /users admin page CRUD operations
type: project
---

Confirmed UI structure for `tests/e2e/users.spec.ts`:

**CreateUserModal**
- Trigger: `page.getByRole('button', { name: 'Create User' })` (on the page, not inside a dialog)
- Dialog scope: `page.getByRole('dialog')`
- Fields inside dialog: `dialog.getByLabel('Name')`, `dialog.getByLabel('Email')`, `dialog.getByLabel('Password')`
- Submit inside dialog: `dialog.getByRole('button', { name: 'Create User' })`
- Dialog closes on success — wait with `await expect(dialog).not.toBeVisible()` before asserting table

**EditUserModal**
- Trigger per row: `page.getByRole('button', { name: 'Edit <user.name>' })` (aria-label pattern)
- Dialog heading: `getByRole('heading', { name: 'Edit User' })`
- Fields use IDs `edit-name`, `edit-email`, `edit-password` but labels read "Name", "Email", "Password"
- Submit: `dialog.getByRole('button', { name: 'Save Changes' })`

**DeleteUserButton**
- Admin row: disabled button with `aria-label="Admin users cannot be deleted"` — no AlertDialog
- Non-admin trigger: `page.getByRole('button', { name: 'Delete <user.name>' })`
- AlertDialog scope: `page.getByRole('alertdialog')` (NOT `getByRole('dialog')`)
- Confirm button inside alertdialog: `alertDialog.getByRole('button', { name: 'Delete' })`
- Delete is soft (sets `deletedAt`) — user disappears from table after successful deletion

**Table columns:** Name | Email | Role | Joined | (Actions — no column header)
- Row cells: `page.getByRole('cell', { name: '...' })`

**Test data isolation pattern:**
Tests that mutate data (update, delete) first create their own user via `createUserViaUI()` helper
so they do not depend on any DB state beyond the initial seed. Each test gets a unique email address.

**Why:** The `createUserViaUI` helper is defined as a local function in `users.spec.ts` (not exported
to helpers) because it is only needed in that file. Keeps the helper file clean.
