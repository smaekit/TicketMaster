import type { Request, Response, NextFunction } from 'express'

declare module 'express-session' {
  interface SessionData {
    userId: string
    role: 'ADMIN' | 'AGENT'
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.role !== 'ADMIN') {
    res.status(403).json({ message: 'Forbidden' })
    return
  }
  next()
}
