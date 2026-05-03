import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ReplyThread } from './ReplyThread'

const agentReply = {
  id: 'reply-1',
  body: 'We are looking into this.',
  source: 'AGENT' as const,
  author: { id: 'user-1', name: 'Alice Agent' },
  senderEmail: null,
  senderName: null,
  createdAt: '2024-01-15T11:00:00.000Z',
}

const customerReply = {
  id: 'reply-2',
  body: 'Still not working.',
  source: 'CUSTOMER' as const,
  author: null,
  senderEmail: 'user@example.com',
  senderName: 'Test User',
  createdAt: '2024-01-15T12:00:00.000Z',
}

beforeEach(() => vi.clearAllMocks())

// =============================================================================
// Empty state
// =============================================================================

describe('ReplyThread — empty state', () => {
  it('shows "No replies yet." when the replies list is empty', () => {
    render(<ReplyThread replies={[]} />)
    expect(screen.getByText('No replies yet.')).toBeInTheDocument()
  })
})

// =============================================================================
// With replies
// =============================================================================

describe('ReplyThread — with replies', () => {
  it('renders an agent reply with the author name and body', () => {
    render(<ReplyThread replies={[agentReply]} />)
    expect(screen.getByText('Alice Agent')).toBeInTheDocument()
    expect(screen.getByText('We are looking into this.')).toBeInTheDocument()
  })

  it('renders a customer reply with sender name and "(customer)" label', () => {
    render(<ReplyThread replies={[customerReply]} />)
    expect(screen.getByText(/Test User/)).toBeInTheDocument()
    expect(screen.getByText('(customer)')).toBeInTheDocument()
    expect(screen.getByText('Still not working.')).toBeInTheDocument()
  })

  it('falls back to email when a customer reply has no sender name', () => {
    render(<ReplyThread replies={[{ ...customerReply, senderName: null }]} />)
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('does not show the "(customer)" label for agent replies', () => {
    render(<ReplyThread replies={[agentReply]} />)
    expect(screen.queryByText('(customer)')).not.toBeInTheDocument()
  })

  it('does not show "No replies yet." when there are replies', () => {
    render(<ReplyThread replies={[agentReply]} />)
    expect(screen.queryByText('No replies yet.')).not.toBeInTheDocument()
  })
})
