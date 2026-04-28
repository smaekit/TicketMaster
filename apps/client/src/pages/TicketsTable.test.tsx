import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import TicketsTable from './TicketsTable'

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn() },
}))

import api from '@/lib/api'

const mockTickets = [
  {
    id: '1',
    senderEmail: 'alice@example.com',
    senderName: 'Alice Smith',
    subject: 'Login broken',
    status: 'OPEN',
    category: 'TECHNICAL_QUESTION',
    createdAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: '2',
    senderEmail: 'bob@example.com',
    senderName: null,
    subject: 'Refund request',
    status: 'RESOLVED',
    category: 'REFUND_REQUEST',
    createdAt: '2026-03-20T08:00:00.000Z',
  },
  {
    id: '3',
    senderEmail: 'carol@example.com',
    senderName: 'Carol Jones',
    subject: 'General inquiry',
    status: 'CLOSED',
    category: 'GENERAL_QUESTION',
    createdAt: '2026-02-10T14:00:00.000Z',
  },
]

function renderTable() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TicketsTable />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TicketsTable — loading state', () => {
  it('shows skeleton rows while loading', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    renderTable()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})

describe('TicketsTable — error state', () => {
  it('shows an error message when the request fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
    renderTable()
    expect(await screen.findByText('Failed to load tickets.')).toBeInTheDocument()
  })
})

describe('TicketsTable — empty state', () => {
  it('shows an empty state message when there are no tickets', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    renderTable()
    expect(await screen.findByText('No tickets yet.')).toBeInTheDocument()
  })
})

describe('TicketsTable — populated', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: mockTickets })
  })

  it('renders all five column headers', async () => {
    renderTable()
    await screen.findByText('Login broken')
    expect(screen.getByRole('columnheader', { name: 'Subject' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Sender' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Received' })).toBeInTheDocument()
  })

  it('renders one row per ticket', async () => {
    renderTable()
    await screen.findByText('Login broken')
    // 1 header + 3 data rows
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('renders the subject in each row', async () => {
    renderTable()
    expect(await screen.findByText('Login broken')).toBeInTheDocument()
    expect(screen.getByText('Refund request')).toBeInTheDocument()
    expect(screen.getByText('General inquiry')).toBeInTheDocument()
  })

  it('shows sender name and email when a name is present', async () => {
    renderTable()
    await screen.findByText('Login broken')
    const aliceRow = screen.getByText('Alice Smith').closest('tr')!
    expect(within(aliceRow).getByText('Alice Smith')).toBeInTheDocument()
    expect(within(aliceRow).getByText('alice@example.com')).toBeInTheDocument()
  })

  it('shows only the email when senderName is null', async () => {
    renderTable()
    await screen.findByText('Refund request')
    const bobRow = screen.getByText('Refund request').closest('tr')!
    expect(within(bobRow).getByText('bob@example.com')).toBeInTheDocument()
    expect(within(bobRow).queryByText('null')).not.toBeInTheDocument()
  })

  it('renders the OPEN status badge', async () => {
    renderTable()
    await screen.findByText('Login broken')
    const openRow = screen.getByText('Login broken').closest('tr')!
    expect(within(openRow).getByText('Open')).toBeInTheDocument()
  })

  it('renders the RESOLVED status badge', async () => {
    renderTable()
    await screen.findByText('Refund request')
    const resolvedRow = screen.getByText('Refund request').closest('tr')!
    expect(within(resolvedRow).getByText('Resolved')).toBeInTheDocument()
  })

  it('renders the CLOSED status badge', async () => {
    renderTable()
    await screen.findByText('General inquiry')
    const closedRow = screen.getByText('General inquiry').closest('tr')!
    expect(within(closedRow).getByText('Closed')).toBeInTheDocument()
  })

  it('formats category labels correctly', async () => {
    renderTable()
    await screen.findByText('Login broken')
    expect(screen.getByText('Technical Question')).toBeInTheDocument()
    expect(screen.getByText('Refund Request')).toBeInTheDocument()
    expect(screen.getByText('General Question')).toBeInTheDocument()
  })

  it('formats the received date', async () => {
    renderTable()
    await screen.findByText('Login broken')
    const expected = new Date('2026-04-01T10:00:00.000Z').toLocaleString()
    expect(screen.getByText(expected)).toBeInTheDocument()
  })
})
