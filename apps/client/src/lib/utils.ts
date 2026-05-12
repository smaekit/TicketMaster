import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import DOMPurify from 'dompurify'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeEmailHtml(html: string): string {
  const clean = DOMPurify.sanitize(html)
  const doc = new DOMParser().parseFromString(clean, 'text/html')
  doc.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    el.style.removeProperty('color')
    el.style.removeProperty('background-color')
    el.style.removeProperty('background')
  })
  return doc.body.innerHTML
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const message = (err as any).response?.data?.message
    if (message) return message
  }
  return fallback
}
