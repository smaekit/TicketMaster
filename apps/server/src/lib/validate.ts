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

export function parseQuery<T>(schema: ZodSchema<T>, query: unknown, res: Response): T | null {
  const result = schema.safeParse(query)
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0].message })
    return null
  }
  return result.data
}
