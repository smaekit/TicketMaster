import { Router } from 'express'
import { requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

router.use(requireAdmin)

// GET /api/users
router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

// POST /api/users
router.post('/', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

// PATCH /api/users/:id
router.patch('/:id', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

// DELETE /api/users/:id
router.delete('/:id', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

export default router
