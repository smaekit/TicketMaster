import { Router } from 'express'

const router = Router()

// GET /api/users
router.get('/', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
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
