import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './prisma'

const secret = process.env.BETTER_AUTH_SECRET
if (!secret) {
  throw new Error('BETTER_AUTH_SECRET must be set in environment variables')
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  user: {
    additionalFields: {
      role: { type: 'string', input: false },
    },
  },
  emailAndPassword: { enabled: true },
  disabledPaths: ['/sign-up/email'],
  trustedOrigins: [process.env.CLIENT_URL ?? 'http://localhost:5173'],
  advanced: {
    disableCSRFCheck: process.env.NODE_ENV === 'development',
  },
})
