import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { Role } from '@ticketmaster/shared'
import api from '@/lib/api'
import { DeleteUserButton } from './DeleteUserButton'
import type { User } from './UsersTable'

vi.mock('@/lib/api', () => ({ default: { delete: vi.fn() } }))

const agentUser: User = {
  id: 'user-1',
  name: 'Bob Agent',
  email: 'bob@example.com',
  role: Role.AGENT,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const adminUser: User = {
  id: 'user-2',
  name: 'Alice Admin',
  email: 'alice@example.com',
  role: Role.ADMIN,
  createdAt: '2024-01-01T00:00:00.000Z',
}

function renderButton(user: User) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <DeleteUserButton user={user} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DeleteUserButton — admin user', () => {
  it('renders a disabled button', () => {
    renderButton(adminUser)
    expect(screen.getByRole('button', { name: 'Admin users cannot be deleted' })).toBeDisabled()
  })

  it('does not open a dialog when the disabled button is in the DOM', () => {
    renderButton(adminUser)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('DeleteUserButton — agent user', () => {
  it('renders an enabled delete button', () => {
    renderButton(agentUser)
    expect(screen.getByRole('button', { name: 'Delete Bob Agent' })).not.toBeDisabled()
  })

  it('shows confirmation dialog with the user name when clicked', async () => {
    const user = userEvent.setup()
    renderButton(agentUser)

    await user.click(screen.getByRole('button', { name: 'Delete Bob Agent' }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Delete Bob Agent?')).toBeInTheDocument()
  })

  it('closes dialog and does not call api.delete when Cancel is clicked', async () => {
    const user = userEvent.setup()
    renderButton(agentUser)

    await user.click(screen.getByRole('button', { name: 'Delete Bob Agent' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('calls api.delete with the correct URL when Delete is confirmed', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { message: 'User deleted' } })
    const user = userEvent.setup()
    renderButton(agentUser)

    await user.click(screen.getByRole('button', { name: 'Delete Bob Agent' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/users/user-1'))
  })

  it('closes dialog after confirming deletion', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { message: 'User deleted' } })
    const user = userEvent.setup()
    renderButton(agentUser)

    await user.click(screen.getByRole('button', { name: 'Delete Bob Agent' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
