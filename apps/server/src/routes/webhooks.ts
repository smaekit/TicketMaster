import { Router } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { parseBody } from '../lib/validate'

const router = Router()
const upload = multer()

const mailgunPayloadSchema = z.object({
  timestamp: z.string(),
  token: z.string(),
  signature: z.string(),
  from: z.string(),
  subject: z.string().optional(),
  'stripped-text': z.string().optional(),
  'body-plain': z.string().optional(),
})

function verifySignature(signingKey: string, timestamp: string, token: string, signature: string): boolean {
  const computed = createHmac('sha256', signingKey)
    .update(timestamp + token)
    .digest('hex')
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  } catch {
    return false
  }
}

function parseSender(from: string): { email: string; name?: string } {
  // Matches RFC 5322 "Display Name <email@example.com>" — capture groups: 1=name, 2=email
  const RFC5322_FROM = /^(?:"?(.+?)"?\s+)?<(.+?)>$/
  const match = from.match(RFC5322_FROM)
  if (match) {
    return { name: match[1]?.trim() || undefined, email: match[2] }
  }
  return { email: from.trim() }
}

// POST /api/webhooks/mailgun
router.post('/mailgun', upload.none(), async (req, res) => {
  const signingKey = process.env.MAILGUN_SIGNING_KEY
  if (!signingKey) {
    res.status(500).json({ message: 'Mailgun signing key not configured' })
    return
  }

  const data = parseBody(mailgunPayloadSchema, req.body, res)
  if (!data) return

  const { timestamp, token, signature, from, subject } = data
  const body = data['stripped-text'] ?? data['body-plain'] ?? ''

  // Reject replays older than 5 minutes
  if (parseInt(timestamp, 10) < Math.floor(Date.now() / 1000) - 300) {
    res.status(400).json({ message: 'Webhook timestamp too old' })
    return
  }

  if (!verifySignature(signingKey, timestamp, token, signature)) {
    res.status(401).json({ message: 'Invalid signature' })
    return
  }

  const { email: senderEmail, name: senderName } = parseSender(from)
  const normalizedSubject = subject?.trim() || '(No subject)'

  const existing = await prisma.ticket.findFirst({
    where: { senderEmail, subject: normalizedSubject, status: 'OPEN' },
    select: { id: true },
  })

  if (existing) {
    res.status(200).json({ message: 'Duplicate ticket ignored' })
    return
  }

  await prisma.ticket.create({
    data: {
      senderEmail,
      senderName,
      subject: normalizedSubject,
      body,
    },
  })

  res.status(200).json({ message: 'Ticket created' })
})

export default router
