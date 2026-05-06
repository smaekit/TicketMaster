import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { ticketCategorySchema, type TicketCategory } from '@ticketmaster/shared'
import { Ticket } from '../../generated/prisma/client'
import { prisma } from './prisma'
import boss from './boss'

const QUEUE = 'classify-ticket'

type ClassifyJobData = Pick<Ticket, 'id' | 'subject' | 'body'>

export async function sendClassifyJob(ticket: Ticket): Promise<void> {
  await boss.send(QUEUE, { id: ticket.id, subject: ticket.subject, body: ticket.body })
}

export async function startClassifyWorker(): Promise<void> {
  await boss.createQueue(QUEUE)
  await boss.work<ClassifyJobData>(QUEUE, async ([job]) => {
    const { id, subject, body } = job.data

    const { text } = await generateText({
      model: openai('gpt-5-nano'),
      system: `You are a customer support ticket classifier. Respond with exactly one of these labels and nothing else:

GENERAL_QUESTION
TECHNICAL_QUESTION
REFUND_REQUEST
UNCATEGORIZED

- GENERAL_QUESTION: questions clearly about the product or service — account management, pricing, "how do I use X", feature explanations, or pre-sales questions. The ticket must be obviously related to the product.
- TECHNICAL_QUESTION: bugs, errors, crashes, API problems, integration issues, or a specific feature not working as expected.
- REFUND_REQUEST: requests for a refund, cancellation, chargeback, billing dispute, or money back.
- UNCATEGORIZED: off-topic messages, unrelated questions, nonsense or gibberish, or anything not clearly about the product or service.

When in doubt, prefer UNCATEGORIZED over GENERAL_QUESTION.
No punctuation, no explanation — only the label.`,
      prompt: `Subject: ${subject}\n\nBody: ${body}`,
    })

    const parsed = ticketCategorySchema.safeParse(text.trim())
    const category: TicketCategory = parsed.success ? parsed.data : 'UNCATEGORIZED'

    await prisma.ticket.update({
      where: { id },
      data: { category },
    })
  })
}
