import { Router } from 'express'
import { createUserSchema } from '@ticketmaster/shared'
import { requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { auth } from '../lib/auth'

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
router.post('/', async (req, res) => {
  const result = createUserSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0].message })
    return
  }
  const { name, email, password } = result.data
  try {
    await auth.api.signUpEmail({ body: { name, email, password } })
    res.status(201).json({ message: 'User created' })
  } catch (err: any) {
    const message = err?.body?.message ?? err?.message ?? 'Failed to create user'
    res.status(400).json({ message })
  }
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
