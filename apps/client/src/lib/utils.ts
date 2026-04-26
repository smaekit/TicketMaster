import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const message = (err as any).response?.data?.message
    if (message) return message
  }
  return fallback
}
