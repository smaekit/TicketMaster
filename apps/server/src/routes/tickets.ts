import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { ticketQuerySchema } from '@ticketmaster/shared'
import { parseQuery } from '../lib/validate'

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

// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } })
  if (!ticket) return void res.status(404).json({ message: 'Ticket not found' })
  res.json(ticket)
})

// PATCH /api/tickets/:id
router.patch('/:id', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

export default router
