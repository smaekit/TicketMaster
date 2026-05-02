import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import TicketDetailPage from './TicketDetailPage'

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}))

import api from '@/lib/api'

const mockAgents = [
  { id: 'agent-1', name: 'Alice Agent' },
  { id: 'agent-2', name: 'Bob Agent' },
]

const mockTicket = {
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
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <MemoryRouter initialEntries={['/tickets/ticket-1']}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  )
}

function mockHappyPath(ticketOverrides: Record<string, unknown> = {}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/tickets/ticket-1')
      return Promise.resolve({ data: { ...mockTicket, ...ticketOverrides } })
    if (url === '/tickets/agents')
      return Promise.resolve({ data: mockAgents })
    return Promise.reject(new Error(`Unexpected GET ${url}`))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom doesn't implement scrollIntoView; Radix UI Select calls it when opening
  Element.prototype.scrollIntoView = vi.fn()
})

// =============================================================================
// Loading state
// =============================================================================

describe('TicketDetailPage — loading', () => {
  it('renders skeletons while data is pending', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Error state
// =============================================================================

describe('TicketDetailPage — error state', () => {
  it('shows "Ticket not found" when the ticket fetch rejects', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/tickets/ticket-1') return Promise.reject(new Error('Not found'))
      return Promise.resolve({ data: [] })
    })
    renderPage()
    expect(await screen.findByText('Ticket not found.')).toBeInTheDocument()
  })

  it('renders the back link in the error state', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/tickets/ticket-1') return Promise.reject(new Error('Not found'))
      return Promise.resolve({ data: [] })
    })
    renderPage()
    await screen.findByText('Ticket not found.')
    expect(screen.getByRole('link', { name: /back to tickets/i })).toHaveAttribute('href', '/tickets')
  })
})

// =============================================================================
// Ticket display
// =============================================================================

describe('TicketDetailPage — ticket display', () => {
  beforeEach(() => mockHappyPath())

  it('renders the subject as a heading', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Login broken' })).toBeInTheDocument()
  })

  it('renders the status badge in the header', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const badge = screen.getAllByText('Open').find(el => el.className.includes('bg-blue-100'))
    expect(badge).toBeInTheDocument()
  })

  it('renders the category label in the header', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const label = screen.getAllByText('Technical Question').find(el => el.className.includes('text-muted-foreground'))
    expect(label).toBeInTheDocument()
  })

  it('renders sender name and email', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    expect(screen.getByText(/Test User/)).toBeInTheDocument()
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument()
  })

  it('renders the message body', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    expect(screen.getByText('I cannot log in to my account.')).toBeInTheDocument()
  })

  it('back link points to /tickets', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    expect(screen.getByRole('link', { name: /back to tickets/i })).toHaveAttribute('href', '/tickets')
  })
})

// =============================================================================
// Status and category
// =============================================================================

describe('TicketDetailPage — status and category', () => {
  beforeEach(() => mockHappyPath())

  it('shows current status in the status select', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const [statusSelect] = screen.getAllByRole('combobox')
    expect(statusSelect).toHaveTextContent('Open')
  })

  it('shows current category in the category select', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const [, categorySelect] = screen.getAllByRole('combobox')
    expect(categorySelect).toHaveTextContent('Technical Question')
  })

  it('shows the Save button after changing status', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const [statusSelect] = screen.getAllByRole('combobox')

    fireEvent.click(statusSelect)
    fireEvent.click(await screen.findByRole('option', { name: 'Resolved' }))

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('calls PATCH with the new status when Save is clicked', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ...mockTicket, status: 'RESOLVED' } })
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const [statusSelect] = screen.getAllByRole('combobox')

    fireEvent.click(statusSelect)
    fireEvent.click(await screen.findByRole('option', { name: 'Resolved' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith('/tickets/ticket-1', {
        status: 'RESOLVED',
        category: 'TECHNICAL_QUESTION',
        assignedToId: null,
      })
    })
  })

  it('calls PATCH with the new category when Save is clicked', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ...mockTicket, category: 'REFUND_REQUEST' } })
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const [, categorySelect] = screen.getAllByRole('combobox')

    fireEvent.click(categorySelect)
    fireEvent.click(await screen.findByRole('option', { name: 'Refund Request' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith('/tickets/ticket-1', {
        status: 'OPEN',
        category: 'REFUND_REQUEST',
        assignedToId: null,
      })
    })
  })
})

// =============================================================================
// Assignment
// =============================================================================

describe('TicketDetailPage — assignment', () => {
  it('shows "Unassigned" in the assigned-to select when assignedTo is null', async () => {
    mockHappyPath()
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const [,, agentSelect] = screen.getAllByRole('combobox')
    expect(agentSelect).toHaveTextContent('Unassigned')
  })

  it('shows the assigned agent name in the assigned-to select when assignedTo is set', async () => {
    mockHappyPath({ assignedTo: { id: 'agent-1', name: 'Alice Agent' } })
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    await waitFor(() => {
      const [,, agentSelect] = screen.getAllByRole('combobox')
      expect(agentSelect).toHaveTextContent('Alice Agent')
    })
  })

  it('does not show the Save button when no selection change has been made', async () => {
    mockHappyPath()
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('shows the Save button after selecting a different agent', async () => {
    mockHappyPath()
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const [,, agentSelect] = screen.getAllByRole('combobox')

    fireEvent.click(agentSelect)
    fireEvent.click(await screen.findByRole('option', { name: 'Alice Agent' }))

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('calls PATCH with the selected agent id when Save is clicked', async () => {
    mockHappyPath()
    vi.mocked(api.patch).mockResolvedValue({ data: { ...mockTicket, assignedTo: mockAgents[0] } })
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })
    const [,, agentSelect] = screen.getAllByRole('combobox')

    fireEvent.click(agentSelect)
    fireEvent.click(await screen.findByRole('option', { name: 'Alice Agent' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith('/tickets/ticket-1', {
        assignedToId: 'agent-1',
        status: 'OPEN',
        category: 'TECHNICAL_QUESTION',
      })
    })
  })

  it('calls PATCH with null assignedToId when switching to Unassigned', async () => {
    mockHappyPath({ assignedTo: { id: 'agent-1', name: 'Alice Agent' } })
    vi.mocked(api.patch).mockResolvedValue({ data: { ...mockTicket, assignedTo: null } })
    renderPage()
    await screen.findByRole('heading', { name: 'Login broken' })

    await waitFor(() => {
      const [,, agentSelect] = screen.getAllByRole('combobox')
      expect(agentSelect).toHaveTextContent('Alice Agent')
    })

    const [,, agentSelect] = screen.getAllByRole('combobox')
    fireEvent.click(agentSelect)
    fireEvent.click(await screen.findByRole('option', { name: 'Unassigned' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith('/tickets/ticket-1', {
        assignedToId: null,
        status: 'OPEN',
        category: 'TECHNICAL_QUESTION',
      })
    })
  })
})
