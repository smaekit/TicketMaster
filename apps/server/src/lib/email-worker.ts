import boss from './boss'
import { sendReplyEmail } from './email'

const QUEUE = 'send-email'

type EmailJobData = {
  to: string
  subject: string
  replyBody: string
  idempotencyKey: string
}

export async function sendEmailJob(data: EmailJobData): Promise<void> {
  await boss.send(QUEUE, data, { retryLimit: 3, retryDelay: 60 })
}

export async function startEmailWorker(): Promise<void> {
  await boss.createQueue(QUEUE)
  await boss.work<EmailJobData>(QUEUE, async ([job]) => {
    const { to, subject, replyBody, idempotencyKey } = job.data
    await sendReplyEmail({ to, subject, replyBody, idempotencyKey })
  })
}
