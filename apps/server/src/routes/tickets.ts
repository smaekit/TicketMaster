import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

router.use(requireAuth)

// GET /api/tickets
router.get('/', async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    select: {
      id: true,
      senderEmail: true,
      senderName: true,
      subject: true,
      status: true,
      category: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
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
