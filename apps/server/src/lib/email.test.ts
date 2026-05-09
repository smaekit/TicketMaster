import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mockSend } }
  }),
}))

// Import after mocking so the module picks up the mock
const { sendReplyEmail } = await import('./email')

const BASE_OPTS = {
  to: 'customer@example.com',
  subject: 'My ticket',
  replyBody: 'Here is your answer.',
  idempotencyKey: 'reply/abc123',
}

describe('sendReplyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_FROM_EMAIL = 'support@example.com'
  })

  it('calls Resend with the correct payload', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_1' }, error: null })

    await sendReplyEmail(BASE_OPTS)

    expect(mockSend).toHaveBeenCalledWith(
      {
        from: 'support@example.com',
        to: 'customer@example.com',
        subject: 'Re: My ticket',
        text: 'Here is your answer.',
      },
      { idempotencyKey: 'reply/abc123' },
    )
  })

  it('falls back to onboarding@resend.dev when RESEND_FROM_EMAIL is unset', async () => {
    delete process.env.RESEND_FROM_EMAIL
    mockSend.mockResolvedValue({ data: { id: 'email_2' }, error: null })

    await sendReplyEmail(BASE_OPTS)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'onboarding@resend.dev' }),
      expect.any(Object),
    )
  })

  it('throws when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'rate limited' } })

    await expect(sendReplyEmail(BASE_OPTS)).rejects.toThrow('Resend error: rate limited')
  })
})
