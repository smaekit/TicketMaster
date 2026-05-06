import { Router } from 'express'
import { z } from 'zod'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { ticketQuerySchema, ticketUpdateSchema, createReplySchema, Role } from '@ticketmaster/shared'
import { parseQuery, parseBody } from '../lib/validate'

const router = Router()

router.use(requireAuth)

// GET /api/tickets
router.get('/', async (req, res) => {
  const params = parseQuery(ticketQuerySchema, req.query, res)
  if (!params) return

  const where = {
    ...(params.status && { status: params.status }),
    ...(params.category && { category: params.category }),
    ...(params.search && {
      OR: [
        { subject: { contains: params.search, mode: 'insensitive' as const } },
        { senderEmail: { contains: params.search, mode: 'insensitive' as const } },
        { senderName: { contains: params.search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [total, data] = await prisma.$transaction([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        senderEmail: true,
        senderName: true,
        subject: true,
        status: true,
        category: true,
        createdAt: true,
      },
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ])

  res.json({ data, total })
})

// GET /api/tickets/agents — list active agents for assignment (must be before /:id)
router.get('/agents', async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null, role: Role.AGENT },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  res.json(agents)
})

// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      replies: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!ticket) return void res.status(404).json({ message: 'Ticket not found' })
  res.json(ticket)
})

// PATCH /api/tickets/:id
router.patch('/:id', async (req, res) => {
  const data = parseBody(ticketUpdateSchema, req.body, res)
  if (!data) return

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!ticket) return void res.status(404).json({ message: 'Ticket not found' })

  if (data.assignedToId !== undefined && data.assignedToId !== null) {
    const agent = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { role: true, deletedAt: true },
    })
    if (!agent || agent.deletedAt || agent.role !== Role.AGENT) {
      return void res.status(400).json({ message: 'Invalid agent' })
    }
  }

  const updateData = {
    ...(data.status !== undefined && { status: data.status }),
    ...(data.category !== undefined && { category: data.category }),
    ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
  }

  const updated = await prisma.ticket.update({
    where: { id: req.params.id },
    data: updateData,
    include: { assignedTo: { select: { id: true, name: true } } },
  })
  res.json(updated)
})

// POST /api/tickets/:id/replies
router.post('/:id/replies', async (req, res) => {
  const data = parseBody(createReplySchema, req.body, res)
  if (!data) return

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!ticket) return void res.status(404).json({ message: 'Ticket not found' })

  const reply = await prisma.ticketReply.create({
    data: {
      body: data.body,
      source: 'AGENT',
      ticketId: req.params.id,
      authorId: res.locals.session!.user.id,
    },
    include: { author: { select: { id: true, name: true } } },
  })
  res.status(201).json(reply)
})

// POST /api/tickets/:id/polish-reply
router.post('/:id/polish-reply', async (req, res) => {
  const data = parseBody(z.object({ body: z.string().min(1).max(1000) }), req.body, res)
  if (!data) return

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, select: { id: true, senderName: true } })
  if (!ticket) return void res.status(404).json({ message: 'Ticket not found' })

  const agentName = res.locals.session!.user.name
  const customerFirstName = ticket.senderName?.split(' ')[0] ?? 'there'

  const { text } = await generateText({
    model: openai('gpt-5-nano'),
    system: `You are ${agentName}, a professional customer support agent. Polish the following draft reply to make it clear, concise, and helpful. Address the customer by their first name (${customerFirstName}). Sign off with your name. Return only the improved reply text with no preamble.`,
    prompt: data.body,
  })

  res.json({ polishedReply: text })
})

// POST /api/tickets/:id/summarize
router.post('/:id/summarize', async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      replies: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!ticket) return void res.status(404).json({ message: 'Ticket not found' })

  const lines = [
    `Subject: ${ticket.subject}`,
    `From: ${ticket.senderName ? `${ticket.senderName} <${ticket.senderEmail}>` : ticket.senderEmail}`,
    '',
    'Original message:',
    ticket.body,
  ]

  if (ticket.replies.length > 0) {
    lines.push('', 'Replies:')
    for (const reply of ticket.replies) {
      const author = reply.source === 'AGENT'
        ? (reply.author?.name ?? 'Agent')
        : (reply.senderName ?? reply.senderEmail ?? 'Customer')
      lines.push(`${author}: ${reply.body}`)
    }
  }

  const { text: summary } = await generateText({
    model: openai('gpt-5-nano'),
    system: 'You are a support assistant. Summarize the following customer support ticket and conversation in 2–3 sentences. Focus on the core issue and the current status of the conversation.',
    prompt: lines.join('\n'),
  })

  await prisma.ticket.update({ where: { id: req.params.id }, data: { aiSummary: summary } })

  res.json({ aiSummary: summary })
})

export default router
