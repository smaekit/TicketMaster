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

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(params.status && { status: params.status }),
      ...(params.category && { category: params.category }),
      ...(params.search && {
        OR: [
          { subject: { contains: params.search, mode: 'insensitive' } },
          { senderEmail: { contains: params.search, mode: 'insensitive' } },
          { senderName: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    },
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
  })
  res.json(tickets)
})

// GET /api/tickets/:id
router.get('/:id', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

// PATCH /api/tickets/:id
router.patch('/:id', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

export default router
