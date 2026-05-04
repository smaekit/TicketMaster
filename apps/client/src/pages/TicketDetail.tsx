import DOMPurify from 'dompurify'
import { type TicketStatus, type TicketCategory } from '@ticketmaster/shared'
import { type Ticket } from './TicketDetailPage'

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
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

export function TicketDetail({ ticket }: { ticket: Ticket }) {
  const { senderEmail, senderName, subject, body, status, category, aiSummary, aiReply, createdAt } = ticket
  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[category]}</span>
        </div>
        <h1 className="text-2xl font-bold">{subject}</h1>
      </div>

      <div className="text-sm text-muted-foreground space-y-0.5">
        <p>From: <span className="text-foreground">{senderName ? `${senderName} <${senderEmail}>` : senderEmail}</span></p>
        <p>Received: <span className="text-foreground">{new Date(createdAt).toLocaleString()}</span></p>
      </div>

      <div className="rounded-md border bg-card p-4">
        <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
        <div
          className="text-sm"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }}
        />
      </div>

      {aiSummary && (
        <div className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">AI Summary</p>
          <p className="text-sm whitespace-pre-wrap">{aiSummary}</p>
        </div>
      )}

      {aiReply && (
        <div className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">AI Reply</p>
          <p className="text-sm whitespace-pre-wrap">{aiReply}</p>
        </div>
      )}
    </>
  )
}
