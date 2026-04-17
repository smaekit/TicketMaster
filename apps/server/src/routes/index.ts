import { Router } from 'express'
import userRoutes from './users'
import ticketRoutes from './tickets'
import webhookRoutes from './webhooks'

export const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.use('/users', userRoutes)
router.use('/tickets', ticketRoutes)
router.use('/webhooks', webhookRoutes)
