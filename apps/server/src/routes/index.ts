import { Router } from 'express'
import authRoutes from './auth'
import userRoutes from './users'
import ticketRoutes from './tickets'
import webhookRoutes from './webhooks'

export const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/tickets', ticketRoutes)
router.use('/webhooks', webhookRoutes)
