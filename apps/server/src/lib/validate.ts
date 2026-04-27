import type { Response } from 'express'
import type { ZodSchema } from 'zod'

export function parseBody<T>(schema: ZodSchema<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body)
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0].message })
    return null
  }
  return result.data
}
