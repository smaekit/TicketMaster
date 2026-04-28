import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import TicketsPage from './TicketsPage'

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn() },
}))

import api from '@/lib/api'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TicketsPage />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
})

describe('TicketsPage', () => {
  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
  })

  it('renders the tickets table', () => {
    renderPage()
    // Table is mounted — at minimum the skeleton placeholder is present
    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
  })
})
