import { join } from 'path'
import { readFileSync } from 'fs'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { Ticket } from '../../generated/prisma/client'
import { prisma } from './prisma'
import boss from './boss'
import { sendEmailJob } from './email-worker'

const QUEUE = 'auto-resolve-ticket'
const CANNOT_RESOLVE = 'CANNOT_RESOLVE'

const KB = readFileSync(join(__dirname, '..', '..', '..', '..', 'knowledge-base.md'), 'utf-8')

type AutoResolveJobData = Pick<Ticket, 'id' | 'subject' | 'body' | 'senderName' | 'senderEmail'>

export async function sendAutoResolveJob(ticket: Ticket): Promise<void> {
  await boss.send(QUEUE, {
    id: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
    senderName: ticket.senderName,
    senderEmail: ticket.senderEmail,
  })
}

export async function startAutoResolveWorker(): Promise<void> {
  await boss.createQueue(QUEUE)
  await boss.work<AutoResolveJobData>(QUEUE, async ([job]) => {
    const { id, subject, body, senderName, senderEmail } = job.data

    await prisma.ticket.update({ where: { id }, data: { status: 'PROCESSING' } })

    const firstName = senderName?.split(' ')[0] ?? 'there'

    let text: string
    try {
      ;({ text } = await generateText({
        model: openai('gpt-5-nano'),
        system: `You are a support agent for Code with Mosh. Use ONLY the knowledge base below to resolve customer tickets.

ESCALATION — respond ${CANNOT_RESOLVE} if any of these apply:
- Customer threatens legal action or mentions a lawsuit
- Customer requests a refund and the purchase may be outside the 30-day window
- Customer disputes a charge or mentions a chargeback
- Issue involves account security (unauthorized access, hacked account)

If the knowledge base does not contain enough information to fully answer the question, respond with exactly: ${CANNOT_RESOLVE}

If you can resolve it, write a reply following these rules exactly:
- Open with: "Hi ${firstName},"
- Write in a warm, professional, and customer-friendly tone — empathetic, clear, and concise
- Use short paragraphs; use a numbered list when giving step-by-step instructions
- Close with a brief offer to help further if needed
- End with:

Best regards,
Support

Do not mention that you are an AI. Return only the reply text with no preamble.

Knowledge Base:
${KB}`,
        prompt: `Subject: ${subject}\n\nMessage:\n${body}`,
      }))
    } catch {
      await prisma.ticket.update({ where: { id }, data: { status: 'OPEN' } })
      return
    }

    if (text.trim() === CANNOT_RESOLVE) {
      await prisma.ticket.update({ where: { id }, data: { status: 'OPEN' } })
      return
    }

    await prisma.$transaction([
      prisma.ticketReply.create({
        data: { ticketId: id, body: text.trim(), source: 'AI' },
      }),
      prisma.ticket.update({
        where: { id },
        data: { status: 'RESOLVED', autoResolved: true },
      }),
    ])

    await sendEmailJob({
      to: senderEmail,
      subject,
      replyBody: text.trim(),
      idempotencyKey: `auto-resolve/${id}`,
    })
  })
}
