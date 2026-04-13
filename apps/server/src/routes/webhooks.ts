import { Router } from 'express'

const router = Router()

// POST /api/webhooks/mailgun
router.post('/mailgun', async (_req, res) => {
  res.status(501).json({ message: 'Not implemented' })
})

export default router
