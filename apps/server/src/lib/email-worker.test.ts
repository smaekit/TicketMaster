import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockBoss = {
  send: vi.fn(),
  createQueue: vi.fn(),
  work: vi.fn(),
}

vi.mock('./boss', () => ({ default: mockBoss }))
vi.mock('./email', () => ({ sendReplyEmail: vi.fn() }))

const { sendEmailJob, startEmailWorker } = await import('./email-worker')
const { sendReplyEmail } = await import('./email')

const JOB_DATA = {
  to: 'customer@example.com',
  subject: 'My ticket',
  replyBody: 'Here is your answer.',
  idempotencyKey: 'reply/abc123',
}

describe('sendEmailJob', () => {
  beforeEach(() => vi.clearAllMocks())

  it('enqueues a job on the send-email queue', async () => {
    mockBoss.send.mockResolvedValue('job_1')

    await sendEmailJob(JOB_DATA)

    expect(mockBoss.send).toHaveBeenCalledWith('send-email', JOB_DATA, {
      retryLimit: 3,
      retryDelay: 60,
    })
  })
})

describe('startEmailWorker', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates the queue and registers a worker', async () => {
    mockBoss.createQueue.mockResolvedValue(undefined)
    mockBoss.work.mockResolvedValue(undefined)

    await startEmailWorker()

    expect(mockBoss.createQueue).toHaveBeenCalledWith('send-email')
    expect(mockBoss.work).toHaveBeenCalledWith('send-email', expect.any(Function))
  })

  it('worker handler calls sendReplyEmail with job data', async () => {
    mockBoss.createQueue.mockResolvedValue(undefined)
    let capturedHandler: Function
    mockBoss.work.mockImplementation((_queue: string, handler: Function) => {
      capturedHandler = handler
    })

    await startEmailWorker()

    vi.mocked(sendReplyEmail).mockResolvedValue(undefined)
    await capturedHandler!([{ data: JOB_DATA }])

    expect(sendReplyEmail).toHaveBeenCalledWith({
      to: JOB_DATA.to,
      subject: JOB_DATA.subject,
      replyBody: JOB_DATA.replyBody,
      idempotencyKey: JOB_DATA.idempotencyKey,
    })
  })
})
