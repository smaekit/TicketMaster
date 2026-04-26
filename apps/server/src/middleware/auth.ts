import type { Request, Response, NextFunction } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth'
import { prisma } from '../lib/prisma'

type Role = 'ADMIN' | 'AGENT'

declare global {
  namespace Express {
    interface Locals {
      session?: Awaited<ReturnType<typeof auth.api.getSession>> & {
        user: { role: Role }
      }
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (!user) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }
  res.locals.session = { ...session, user: { ...session.user, role: user.role } }
  next()
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    if (res.locals.session!.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' })
      return
    }
    next()
  })
}
