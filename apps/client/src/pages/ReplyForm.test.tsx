import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { ReplyForm } from './ReplyForm'

vi.mock('@/lib/api', () => ({ default: { post: vi.fn() } }))

import api from '@/lib/api'

function renderForm(ticketId = 'ticket-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ReplyForm ticketId={ticketId} />
    </QueryClientProvider>
  )
}

beforeEach(() => vi.clearAllMocks())

// =============================================================================
// Rendering
// =============================================================================

describe('ReplyForm — rendering', () => {
  it('renders the textarea and send button', () => {
    renderForm()
    expect(screen.getByPlaceholderText('Write a reply…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeInTheDocument()
  })

  it('disables the button when the textarea is empty', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
  })

  it('disables the button when the textarea contains only whitespace', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByPlaceholderText('Write a reply…'), '   ')
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
  })

  it('enables the button once the textarea has content', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByPlaceholderText('Write a reply…'), 'Hello')
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeEnabled()
  })
})

// =============================================================================
// Submission
// =============================================================================

describe('ReplyForm — submission', () => {
  it('calls api.post with the correct endpoint and body', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    renderForm('ticket-42')

    await user.type(screen.getByPlaceholderText('Write a reply…'), 'Hello there')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/ticket-42/replies', { body: 'Hello there' })
    })
  })

  it('clears the textarea after a successful submission', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('Write a reply…'), 'Hello there')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write a reply…')).toHaveValue('')
    })
  })

  it('shows "Sending…" and disables the button while the request is in flight', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('Write a reply…'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()
    })
  })
})

// =============================================================================
// Polish
// =============================================================================

describe('ReplyForm — polish', () => {
  it('renders the Polish button', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Polish' })).toBeInTheDocument()
  })

  it('disables Polish when textarea is empty', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Polish' })).toBeDisabled()
  })

  it('disables Polish when textarea contains only whitespace', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByPlaceholderText('Write a reply…'), '   ')
    expect(screen.getByRole('button', { name: 'Polish' })).toBeDisabled()
  })

  it('calls api.post with the polish endpoint and current body', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { polishedReply: 'Polished.' } })
    const user = userEvent.setup()
    renderForm('ticket-42')

    await user.type(screen.getByPlaceholderText('Write a reply…'), 'rough draft')
    await user.click(screen.getByRole('button', { name: 'Polish' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/ticket-42/polish-reply', { body: 'rough draft' })
    })
  })

  it('replaces textarea content with the polished reply on success', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { polishedReply: 'Polished reply text.' } })
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('Write a reply…'), 'rough draft')
    await user.click(screen.getByRole('button', { name: 'Polish' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write a reply…')).toHaveValue('Polished reply text.')
    })
  })

  it('shows "Polishing…" and disables both buttons while the request is in flight', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('Write a reply…'), 'draft')
    await user.click(screen.getByRole('button', { name: 'Polish' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Polishing…' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
    })
  })

  it('leaves textarea unchanged and re-enables buttons when polishing fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('Write a reply…'), 'original draft')
    await user.click(screen.getByRole('button', { name: 'Polish' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Polish' })).toBeEnabled()
    })
    expect(screen.getByPlaceholderText('Write a reply…')).toHaveValue('original draft')
  })
})
