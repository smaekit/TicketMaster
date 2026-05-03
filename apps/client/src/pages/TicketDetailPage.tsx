import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api'
import { type TicketStatus, type TicketCategory } from '@ticketmaster/shared'
import { BackLink } from '@/components/BackLink'
import { TicketDetail } from './TicketDetail'
import { UpdateTicket } from './UpdateTicket'
import { ReplyThread, type TicketReply } from './ReplyThread'
import { ReplyForm } from './ReplyForm'

export type Ticket = {
  id: string
  senderEmail: string
  senderName: string | null
  subject: string
  body: string
  status: TicketStatus
  category: TicketCategory
  aiSummary: string | null
  aiReply: string | null
  assignedTo: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
  replies: TicketReply[]
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: ticket, isLoading, isError } = useQuery<Ticket>({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <BackLink to="/tickets" label="Back to Tickets" />
        <p className="text-destructive">Ticket not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <BackLink to="/tickets" label="Back to Tickets" />

      <div className="space-y-6">
        <TicketDetail ticket={ticket} />

        <UpdateTicket ticket={ticket} />

        <div className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Replies{ticket.replies.length > 0 && ` (${ticket.replies.length})`}
          </p>
          <ReplyThread replies={ticket.replies} />
          <div className="mt-4">
            <ReplyForm ticketId={ticket.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
