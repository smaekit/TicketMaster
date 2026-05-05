import { Router } from 'express'
import { createUserSchema, editUserSchema } from '@ticketmaster/shared'
import { requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { auth } from '../lib/auth'
import { parseBody } from '../lib/validate'

const router = Router()

router.use(requireAdmin)

// GET /api/users
router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

// POST /api/users
router.post('/', async (req, res) => {
  const data = parseBody(createUserSchema, req.body, res)
  if (!data) return
  const { name, email, password } = data
  try {
    await auth.api.signUpEmail({ body: { name, email, password } })
    res.status(201).json({ message: 'User created' })
  } catch (err: any) {
    const message = err?.body?.message ?? err?.message ?? 'Failed to create user'
    res.status(400).json({ message })
  }
})

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  const data = parseBody(editUserSchema, req.body, res)
  if (!data) return

  const { id } = req.params
  const { name, email, password } = data

  try {
    await prisma.user.update({ where: { id }, data: { name, email } })

    if (password) {
      const ctx = await auth.$context
      const hashedPassword = await ctx.password.hash(password)
      await prisma.account.updateMany({
        where: { userId: id, providerId: 'credential' },
        data: { password: hashedPassword },
      })
    }

    res.json({ message: 'User updated' })
  } catch (err: any) {
    const message = err?.body?.message ?? err?.message ?? 'Failed to update user'
    res.status(400).json({ message })
  }
})

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true, deletedAt: true } })
    if (!user || user.deletedAt) {
      res.status(404).json({ message: 'User not found' })
      return
    }
    if (user.role === 'ADMIN') {
      res.status(403).json({ message: 'Admin users cannot be deleted' })
      return
    }
    await prisma.$transaction([
      prisma.ticket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
      prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
    ])
    res.json({ message: 'User deleted' })
  } catch (err: any) {
    const message = err?.message ?? 'Failed to delete user'
    res.status(500).json({ message })
  }
})

export default router
