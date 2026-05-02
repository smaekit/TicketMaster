import { z } from 'zod'

export const Role = {
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
} as const

export type Role = typeof Role[keyof typeof Role]

export const createUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const editUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.union([
    z.string().trim().min(8, 'Password must be at least 8 characters'),
    z.literal(''),
  ]).optional(),
})

export type EditUserInput = z.infer<typeof editUserSchema>

export const ticketStatusSchema = z.enum(['OPEN', 'RESOLVED', 'CLOSED'])
export type TicketStatus = z.infer<typeof ticketStatusSchema>

export const ticketCategorySchema = z.enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST', 'UNCATEGORIZED'])
export type TicketCategory = z.infer<typeof ticketCategorySchema>

export const ticketUpdateSchema = z.object({
  assignedToId: z.string().nullable().optional(),
  status: ticketStatusSchema.optional(),
  category: ticketCategorySchema.optional(),
})
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>

export const ticketQuerySchema = z.object({
  sortBy: z.enum(['subject', 'senderEmail', 'status', 'category', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: ticketStatusSchema.optional(),
  category: ticketCategorySchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type TicketQueryParams = z.infer<typeof ticketQuerySchema>
