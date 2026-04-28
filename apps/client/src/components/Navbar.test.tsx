import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { Role } from '@ticketmaster/shared'
import Navbar from './Navbar'

vi.mock('../lib/authClient', () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn(),
  },
}))

import { authClient } from '../lib/authClient'

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Navbar — unauthenticated', () => {
  beforeEach(() => {
    vi.mocked(authClient.useSession).mockReturnValue({ data: null } as any)
  })

  it('renders the TicketMaster brand link', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'TicketMaster' })).toBeInTheDocument()
  })

  it('does not render nav links when there is no session', () => {
    renderNavbar()
    expect(screen.queryByRole('link', { name: 'Tickets' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })
})

describe('Navbar — authenticated as AGENT', () => {
  beforeEach(() => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { name: 'Bob Agent', role: Role.AGENT } },
    } as any)
  })

  it('renders the Tickets link', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Tickets' })).toBeInTheDocument()
  })

  it('Tickets link points to /tickets', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Tickets' })).toHaveAttribute('href', '/tickets')
  })

  it('does not render the Users link for an AGENT', () => {
    renderNavbar()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('renders the signed-in user name', () => {
    renderNavbar()
    expect(screen.getByText('Bob Agent')).toBeInTheDocument()
  })
})

describe('Navbar — authenticated as ADMIN', () => {
  beforeEach(() => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { name: 'Alice Admin', role: Role.ADMIN } },
    } as any)
  })

  it('renders both the Tickets and Users links', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Tickets' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
  })

  it('Users link points to /users', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users')
  })
})
