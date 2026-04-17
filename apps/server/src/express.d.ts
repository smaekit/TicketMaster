import type { auth } from './lib/auth'

type BetterAuthSession = typeof auth.$Infer.Session

declare global {
  namespace Express {
    interface Locals {
      session?: BetterAuthSession
    }
  }
}
