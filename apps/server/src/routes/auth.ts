import { Router } from 'express'

const router = Router()

// POST /api/auth/login
router.post('/login', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

// POST /api/auth/logout
router.post('/logout', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

// GET /api/auth/me
router.get('/me', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

export default router
