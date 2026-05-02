import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { ticketQuerySchema, ticketUpdateSchema, Role } from '@ticketmaster/shared'
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
    include: { assignedTo: { select: { id: true, name: true } } },
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

export default router
