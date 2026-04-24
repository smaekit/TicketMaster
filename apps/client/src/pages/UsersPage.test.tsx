import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import UsersPage from './UsersPage'

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn() },
}))

import api from '@/lib/api'

const mockUsers = [
  { id: '1', name: 'Alice Admin', email: 'alice@example.com', role: 'ADMIN' as const, createdAt: '2024-01-15T00:00:00.000Z' },
  { id: '2', name: 'Bob Agent', email: 'bob@example.com', role: 'AGENT' as const, createdAt: '2024-03-20T00:00:00.000Z' },
]

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <UsersPage />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UsersPage', () => {
  it('shows skeleton rows while loading', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    renderPage()
    // Skeleton renders 5 placeholder rows inside a table body
    const rows = screen.getAllByRole('row')
    // 1 header row + 5 skeleton rows
    expect(rows).toHaveLength(6)
    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument()
  })

  it('renders the user table after loading', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockUsers })
    renderPage()

    expect(await screen.findByText('Alice Admin')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('renders all four column headers', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockUsers })
    renderPage()

    await screen.findByText('Alice Admin')
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Joined' })).toBeInTheDocument()
  })

  it('renders one row per user', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockUsers })
    renderPage()

    await screen.findByText('Alice Admin')
    // 1 header row + 2 data rows
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('renders the ADMIN role badge with correct text', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockUsers })
    renderPage()

    await screen.findByText('Alice Admin')
    const adminRow = screen.getByText('Alice Admin').closest('tr')!
    expect(within(adminRow).getByText('ADMIN')).toBeInTheDocument()
  })

  it('renders the AGENT role badge with correct text', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockUsers })
    renderPage()

    await screen.findByText('Bob Agent')
    const agentRow = screen.getByText('Bob Agent').closest('tr')!
    expect(within(agentRow).getByText('AGENT')).toBeInTheDocument()
  })

  it('formats the joined date', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockUsers })
    renderPage()

    await screen.findByText('Alice Admin')
    const expected = new Date('2024-01-15T00:00:00.000Z').toLocaleDateString()
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    vi.mocked(api.get).mockRejectedValue({ message: 'Request failed with status code 500' })
    renderPage()

    expect(await screen.findByText(/request failed/i)).toBeInTheDocument()
  })

  it('renders an empty table body when the user list is empty', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    renderPage()

    // Wait for skeleton to clear and data table to settle with only the header row
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(1))
  })
})
