import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import api from '@/lib/api'
import { CreateUserModal } from './CreateUserModal'

vi.mock('@/lib/api', () => ({ default: { post: vi.fn() } }))

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CreateUserModal />
    </QueryClientProvider>
  )
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Create User' }))
}

function submitButton() {
  return within(screen.getByRole('dialog')).getByRole('button', { name: /create user/i })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CreateUserModal — form fields', () => {
  it('renders all three fields when dialog is open', async () => {
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })
})

describe('CreateUserModal — validation', () => {
  it('shows all field errors when submitting empty form', async () => {
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.click(submitButton())

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('shows name error when name is shorter than 3 characters', async () => {
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.type(screen.getByLabelText('Name'), 'ab')
    await user.click(submitButton())

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
  })

  it('shows email error for an invalid email address', async () => {
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(submitButton())

    expect(await screen.findByText('Invalid email address')).toBeInTheDocument()
  })

  it('shows password error when password is shorter than 8 characters', async () => {
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(submitButton())

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('does not call api.post when validation fails', async () => {
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.click(submitButton())

    await screen.findByText('Name must be at least 3 characters')
    expect(api.post).not.toHaveBeenCalled()
  })
})

describe('CreateUserModal — submission', () => {
  it('calls api.post with the entered form data', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'User created' } })
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.type(screen.getByLabelText('Name'), 'Alice Smith')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(submitButton())

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users', {
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'securepassword',
      })
    })
  })

  it('closes the dialog on successful submission', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'User created' } })
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.type(screen.getByLabelText('Name'), 'Alice Smith')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(submitButton())

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('clears the form after successful submission and reopening', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'User created' } })
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.type(screen.getByLabelText('Name'), 'Alice Smith')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(submitButton())

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await openDialog(user)
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('shows the server error message when the request fails', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { data: { message: 'Email already in use' } } })
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.type(screen.getByLabelText('Name'), 'Alice Smith')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(submitButton())

    expect(await screen.findByText('Email already in use')).toBeInTheDocument()
  })

  it('shows a generic error when the server returns no message', async () => {
    vi.mocked(api.post).mockRejectedValue({})
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.type(screen.getByLabelText('Name'), 'Alice Smith')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(submitButton())

    expect(await screen.findByText('Failed to create user')).toBeInTheDocument()
  })

  it('disables the submit button and shows loading text while submitting', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderModal()
    await openDialog(user)

    await user.type(screen.getByLabelText('Name'), 'Alice Smith')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(submitButton())

    await waitFor(() => {
      const btn = within(screen.getByRole('dialog')).getByRole('button', { name: 'Creating…' })
      expect(btn).toBeDisabled()
    })
  })
})
