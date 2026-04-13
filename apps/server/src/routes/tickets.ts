import { Router } from 'express'

const router = Router()

// GET /api/tickets
router.get('/', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
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
