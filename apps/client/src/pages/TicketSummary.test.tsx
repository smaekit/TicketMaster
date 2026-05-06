import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { TicketSummary } from './TicketSummary'
import { type Ticket } from './TicketDetailPage'

vi.mock('@/lib/api', () => ({ default: { post: vi.fn() } }))

import api from '@/lib/api'

const baseTicket: Ticket = {
  id: 'ticket-1',
  senderEmail: 'user@example.com',
  senderName: 'Test User',
  subject: 'Login broken',
  body: 'I cannot log in to my account.',
  status: 'OPEN',
  category: 'TECHNICAL_QUESTION',
  aiSummary: null,
  aiReply: null,
  assignedTo: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  replies: [],
}

function renderSummary(ticket: Ticket) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TicketSummary ticket={ticket} />
    </QueryClientProvider>
  )
}

beforeEach(() => vi.clearAllMocks())

// =============================================================================
// Rendering
// =============================================================================

describe('TicketSummary — rendering', () => {
  it('renders "Summarize" button when no summary exists', () => {
    renderSummary(baseTicket)
    expect(screen.getByRole('button', { name: /Summarize/ })).toBeInTheDocument()
  })

  it('renders "Re-summarize" button when a summary already exists', () => {
    renderSummary({ ...baseTicket, aiSummary: 'Existing summary.' })
    expect(screen.getByRole('button', { name: /Re-summarize/ })).toBeInTheDocument()
  })

  it('does not render the AI Summary section when aiSummary is null', () => {
    renderSummary(baseTicket)
    expect(screen.queryByText('AI Summary')).not.toBeInTheDocument()
  })

  it('renders the AI Summary section with its content when aiSummary is set', () => {
    renderSummary({ ...baseTicket, aiSummary: 'The user cannot log in.' })
    expect(screen.getByText('AI Summary')).toBeInTheDocument()
    expect(screen.getByText('The user cannot log in.')).toBeInTheDocument()
  })
})

// =============================================================================
// Summarize action
// =============================================================================

describe('TicketSummary — summarize action', () => {
  it('calls api.post with the correct endpoint on click', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { aiSummary: 'Summary.' } })
    const user = userEvent.setup()
    renderSummary(baseTicket)

    await user.click(screen.getByRole('button', { name: /Summarize/ }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/ticket-1/summarize')
    })
  })

  it('shows "Summarizing…" and disables the button while the request is in flight', async () => {
    vi.mocked(api.post).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderSummary(baseTicket)

    await user.click(screen.getByRole('button', { name: /Summarize/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Summarizing…' })).toBeDisabled()
    })
  })

  it('re-enables the button after a successful request', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { aiSummary: 'Done.' } })
    const user = userEvent.setup()
    renderSummary(baseTicket)

    await user.click(screen.getByRole('button', { name: /Summarize/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Summarize/ })).toBeEnabled()
    })
  })
})
