import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import path from 'path'
import rateLimit from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth'
import { router } from './routes'

const app = express()

app.set('trust proxy', 1)

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    credentials: true,
  })
)

if (process.env.NODE_ENV !== 'test') {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use('/api/auth', authLimiter)
}
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api', router)

app.use(express.static(path.join(__dirname, '../public')))
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

Sentry.setupExpressErrorHandler(app)

app.use((_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ message: 'Internal server error' })
})

export default app
