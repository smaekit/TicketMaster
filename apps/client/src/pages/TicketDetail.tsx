import DOMPurify from 'dompurify'
import { type TicketStatus, type TicketCategory } from '@ticketmaster/shared'
import { type Ticket } from './TicketDetailPage'
import { TicketSummary } from './TicketSummary'

const STATUS_DOT: Record<TicketStatus, string> = {
  NEW: 'bg-amber-400',
  PROCESSING: 'bg-orange-400',
  OPEN: 'bg-sky-400',
  RESOLVED: 'bg-emerald-500',
  CLOSED: 'bg-gray-400',
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  NEW: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  PROCESSING: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
  OPEN: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  CLOSED: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: 'New',
  PROCESSING: 'Processing',
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL_QUESTION: 'General Question',
  TECHNICAL_QUESTION: 'Technical Question',
  REFUND_REQUEST: 'Refund Request',
  UNCATEGORIZED: 'Uncategorized',
}

function sanitizeEmailHtml(html: string): string {
  const clean = DOMPurify.sanitize(html)
  const doc = new DOMParser().parseFromString(clean, 'text/html')
  doc.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    el.style.removeProperty('color')
    el.style.removeProperty('background-color')
    el.style.removeProperty('background')
  })
  return doc.body.innerHTML
}

export function TicketDetail({ ticket }: { ticket: Ticket }) {
  const { senderEmail, senderName, subject, body, status, category, aiReply, createdAt, updatedAt } = ticket

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[category]}</span>
        </div>
        <h1 className="text-2xl font-bold">{subject}</h1>
      </div>

      <div className="text-sm text-muted-foreground space-y-0.5">
        <p>From: <span className="text-foreground">{senderName ? `${senderName} <${senderEmail}>` : senderEmail}</span></p>
        <p>Received: <span className="text-foreground">{new Date(createdAt).toLocaleString()}</span></p>
        <p>Updated: <span className="text-foreground">{new Date(updatedAt).toLocaleString()}</span></p>
      </div>

      <div className="rounded-md border bg-card p-4">
        <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
        <div
          className="text-sm text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(body) }}
        />
      </div>

      <TicketSummary ticket={ticket} />

      {aiReply && (
        <div className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">AI Reply</p>
          <p className="text-sm whitespace-pre-wrap">{aiReply}</p>
        </div>
      )}
    </>
  )
}
