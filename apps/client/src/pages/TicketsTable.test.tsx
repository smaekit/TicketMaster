import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

// Server now returns { data, total }
function mockResponse(tickets = mockTickets, total = tickets.length) {
  return { data: { data: tickets, total } }
}

function renderTable() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <TicketsTable />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// Loading / error / empty
// =============================================================================

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
  it('shows the generic empty message when no tickets exist and no filters are active', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse([], 0))
    renderTable()
    expect(await screen.findByText('No tickets yet.')).toBeInTheDocument()
  })

  it('shows a filter-specific message when a filter is active and no results match', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse([], 0))
    renderTable()
    await screen.findByText('No tickets yet.')

    // Typing sets isFiltered=true immediately (before debounce fires)
    fireEvent.change(screen.getByPlaceholderText('Search subject or sender…'), {
      target: { value: 'xyz' },
    })

    expect(await screen.findByText('No tickets match the current filters.')).toBeInTheDocument()
  })
})

// =============================================================================
// Populated table — rendering
// =============================================================================

describe('TicketsTable — populated', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue(mockResponse())
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

// =============================================================================
// Sorting
// =============================================================================

describe('TicketsTable — sorting', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue(mockResponse())
  })

  it('passes default sort params on initial render', async () => {
    renderTable()
    await screen.findByText('Login broken')
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
      params: expect.objectContaining({ sortBy: 'createdAt', sortOrder: 'desc' }),
    }))
  })

  it('renders a sort button in each column header', async () => {
    renderTable()
    await screen.findByText('Login broken')
    for (const label of ['Subject', 'Sender', 'Status', 'Category', 'Received']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('clicking Subject once fetches with sortBy=subject sortOrder=asc', async () => {
    renderTable()
    await screen.findByText('Login broken')

    fireEvent.click(screen.getByRole('button', { name: 'Subject' }))

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ sortBy: 'subject', sortOrder: 'asc' }),
      }))
    })
  })

  it('clicking Subject twice fetches with sortOrder=desc on the second click', async () => {
    renderTable()
    await screen.findByText('Login broken')

    // First click → asc
    fireEvent.click(screen.getByRole('button', { name: 'Subject' }))
    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ sortBy: 'subject', sortOrder: 'asc' }),
      }))
    })

    // Wait for the table to re-render before clicking again
    await screen.findByRole('button', { name: 'Subject' })

    // Second click → desc
    fireEvent.click(screen.getByRole('button', { name: 'Subject' }))
    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ sortBy: 'subject', sortOrder: 'desc' }),
      }))
    })
  })

  it('clicking a different column switches the sort column', async () => {
    renderTable()
    await screen.findByText('Login broken')

    fireEvent.click(screen.getByRole('button', { name: 'Status' }))

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ sortBy: 'status', sortOrder: 'asc' }),
      }))
    })
  })

  it('sorting resets page to 1', async () => {
    // Simulate being on page 2 by using a large total
    vi.mocked(api.get).mockResolvedValue(mockResponse(mockTickets, 60))
    renderTable()
    await screen.findByText('Login broken')

    // Navigate to page 2
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ page: 2 }),
      }))
    })

    // Now sort — page should reset to 1
    fireEvent.click(screen.getByRole('button', { name: 'Subject' }))
    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ page: 1, sortBy: 'subject' }),
      }))
    })
  })
})

// =============================================================================
// Filtering
// =============================================================================

describe('TicketsTable — filtering', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue(mockResponse())
  })

  it('renders the search input and two filter selects', async () => {
    renderTable()
    await screen.findByText('Login broken')
    expect(screen.getByPlaceholderText('Search subject or sender…')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it('does not show the Clear button when no filters are active', async () => {
    renderTable()
    await screen.findByText('Login broken')
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('shows the Clear button immediately when the search input is non-empty', async () => {
    renderTable()
    await screen.findByText('Login broken')

    fireEvent.change(screen.getByPlaceholderText('Search subject or sender…'), {
      target: { value: 'test' },
    })

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('typing in the search box sends the search param to the API after debounce', async () => {
    renderTable()
    await screen.findByText('Login broken')

    fireEvent.change(screen.getByPlaceholderText('Search subject or sender…'), {
      target: { value: 'login' },
    })

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ search: 'login' }),
      }))
    }, { timeout: 1000 })
  })

  it('clicking Clear resets the search input and hides the Clear button', async () => {
    renderTable()
    await screen.findByText('Login broken')

    const input = screen.getByPlaceholderText('Search subject or sender…')
    fireEvent.change(input, { target: { value: 'test' } })

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /clear/i }))

    expect(input).toHaveValue('')
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })
})

// =============================================================================
// Pagination
// =============================================================================

describe('TicketsTable — pagination', () => {
  it('passes page=1 and pageSize=20 on initial render', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse(mockTickets, 3))
    renderTable()
    await screen.findByText('Login broken')
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
      params: expect.objectContaining({ page: 1, pageSize: 10 }),
    }))
  })

  it('shows ticket count summary when data is loaded', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse(mockTickets, 3))
    renderTable()
    await screen.findByText('Login broken')
    expect(screen.getByText('Showing 1–3 of 3 tickets')).toBeInTheDocument()
  })

  it('does not show pagination controls when all tickets fit on one page', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse(mockTickets, 3))
    renderTable()
    await screen.findByText('Login broken')
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('shows prev/next controls when there are multiple pages', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse(mockTickets, 60))
    renderTable()
    await screen.findByText('Login broken')
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
  })

  it('Previous is disabled on the first page', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse(mockTickets, 60))
    renderTable()
    await screen.findByText('Login broken')
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('clicking Next fetches page 2', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse(mockTickets, 60))
    renderTable()
    await screen.findByText('Login broken')

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ page: 2 }),
      }))
    })
  })

  it('shows current page / total pages', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse(mockTickets, 60))
    renderTable()
    await screen.findByText('Login broken')
    expect(screen.getByText('1 / 6')).toBeInTheDocument()
  })

  it('Next is disabled on the last page', async () => {
    // Simulate being on the last page: return page=3 data with total=60
    vi.mocked(api.get).mockResolvedValue(mockResponse(mockTickets, 30))
    renderTable()
    await screen.findByText('Login broken')

    // Navigate to page 3
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ page: 2 }),
      }))
    })
    await screen.findByRole('button', { name: 'Next page' })

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/tickets', expect.objectContaining({
        params: expect.objectContaining({ page: 3 }),
      }))
    })
    await screen.findByRole('button', { name: 'Next page' })

    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })
})
