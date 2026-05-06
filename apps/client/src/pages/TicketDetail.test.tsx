import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { TicketDetail } from './TicketDetail'
import { type Ticket } from './TicketDetailPage'

vi.mock('@/lib/api', () => ({ default: { post: vi.fn() } }))

function renderDetail(ticket: Ticket) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TicketDetail ticket={ticket} />
    </QueryClientProvider>
  )
}

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

// =============================================================================
// Subject and header
// =============================================================================

describe('TicketDetail — subject and header', () => {
  it('renders the subject as a heading', () => {
    renderDetail(baseTicket)
    expect(screen.getByRole('heading', { name: 'Login broken' })).toBeInTheDocument()
  })

  it('renders the status badge text for OPEN', () => {
    renderDetail(baseTicket)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('applies the correct style for OPEN status', () => {
    renderDetail(baseTicket)
    expect(screen.getByText('Open').className).toContain('bg-blue-100')
  })

  it('applies the correct style for RESOLVED status', () => {
    renderDetail({ ...baseTicket, status: 'RESOLVED' })
    expect(screen.getByText('Resolved').className).toContain('bg-green-100')
  })

  it('applies the correct style for CLOSED status', () => {
    renderDetail({ ...baseTicket, status: 'CLOSED' })
    expect(screen.getByText('Closed').className).toContain('bg-gray-100')
  })

  it('renders the category label', () => {
    renderDetail(baseTicket)
    expect(screen.getByText('Technical Question')).toBeInTheDocument()
  })
})

// =============================================================================
// Sender info
// =============================================================================

describe('TicketDetail — sender info', () => {
  it('renders both sender name and email when both are present', () => {
    renderDetail(baseTicket)
    expect(screen.getByText(/Test User/)).toBeInTheDocument()
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument()
  })

  it('renders only the email when senderName is null', () => {
    renderDetail({ ...baseTicket, senderName: null })
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.queryByText(/Test User/)).not.toBeInTheDocument()
  })
})

// =============================================================================
// Message body
// =============================================================================

describe('TicketDetail — message', () => {
  it('renders the message body', () => {
    renderDetail(baseTicket)
    expect(screen.getByText('I cannot log in to my account.')).toBeInTheDocument()
  })
})

// =============================================================================
// AI sections
// =============================================================================

describe('TicketDetail — AI sections', () => {
  it('does not render the AI Summary section when aiSummary is null', () => {
    renderDetail(baseTicket)
    expect(screen.queryByText('AI Summary')).not.toBeInTheDocument()
  })

  it('renders the AI Summary section and its content when aiSummary is set', () => {
    renderDetail({ ...baseTicket, aiSummary: 'User cannot log in.' })
    expect(screen.getByText('AI Summary')).toBeInTheDocument()
    expect(screen.getByText('User cannot log in.')).toBeInTheDocument()
  })

  it('does not render the AI Reply section when aiReply is null', () => {
    renderDetail(baseTicket)
    expect(screen.queryByText('AI Reply')).not.toBeInTheDocument()
  })

  it('renders the AI Reply section and its content when aiReply is set', () => {
    renderDetail({ ...baseTicket, aiReply: 'Please try resetting your password.' })
    expect(screen.getByText('AI Reply')).toBeInTheDocument()
    expect(screen.getByText('Please try resetting your password.')).toBeInTheDocument()
  })

  it('renders both AI sections independently when both are set', () => {
    renderDetail({ ...baseTicket, aiSummary: 'Summary text.', aiReply: 'Reply text.' })
    expect(screen.getByText('AI Summary')).toBeInTheDocument()
    expect(screen.getByText('AI Reply')).toBeInTheDocument()
  })
})

// =============================================================================
// Summarize button
// =============================================================================

describe('TicketDetail — summarize button', () => {
  it('renders Summarize when no summary exists', () => {
    renderDetail(baseTicket)
    expect(screen.getByRole('button', { name: /Summarize/ })).toBeInTheDocument()
  })

  it('renders Re-summarize when a summary already exists', () => {
    renderDetail({ ...baseTicket, aiSummary: 'Existing summary.' })
    expect(screen.getByRole('button', { name: /Re-summarize/ })).toBeInTheDocument()
  })
})
