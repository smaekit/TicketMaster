import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import api from '@/lib/api'
import { type TicketStatus, type TicketCategory } from '@ticketmaster/shared'

type Agent = { id: string; name: string }

type TicketDetail = {
  id: string
  senderEmail: string
  senderName: string | null
  subject: string
  body: string
  status: TicketStatus
  category: TicketCategory
  aiSummary: string | null
  aiReply: string | null
  assignedTo: Agent | null
  createdAt: string
  updatedAt: string
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL_QUESTION: 'General Question',
  TECHNICAL_QUESTION: 'Technical Question',
  REFUND_REQUEST: 'Refund Request',
  UNCATEGORIZED: 'Uncategorized',
}

const UNASSIGNED = '__unassigned__'

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.get('/tickets/agents').then((r) => r.data),
  })

  const [selectedAgentId, setSelectedAgentId] = useState<string>(UNASSIGNED)

  useEffect(() => {
    if (ticket) {
      setSelectedAgentId(ticket.assignedTo?.id ?? UNASSIGNED)
    }
  }, [ticket])

  const { mutate: assign, isPending } = useMutation({
    mutationFn: (assignedToId: string | null) =>
      api.patch(`/tickets/${id}`, { assignedToId }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
  })

  const isDirty = ticket
    ? selectedAgentId !== (ticket.assignedTo?.id ?? UNASSIGNED)
    : false

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
        <Link to="/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" />
          Back to Tickets
        </Link>
        <p className="text-destructive">Ticket not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <Link to="/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
              {ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}
            </span>
            <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[ticket.category]}</span>
          </div>
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        </div>

        <div className="text-sm text-muted-foreground space-y-0.5">
          <p>From: <span className="text-foreground">{ticket.senderName ? `${ticket.senderName} <${ticket.senderEmail}>` : ticket.senderEmail}</span></p>
          <p>Received: <span className="text-foreground">{new Date(ticket.createdAt).toLocaleString()}</span></p>
        </div>

        <div className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Assigned to</p>
          <div className="flex items-center gap-2">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isDirty && (
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => assign(selectedAgentId === UNASSIGNED ? null : selectedAgentId)}
              >
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
          <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
        </div>

        {ticket.aiSummary && (
          <div className="rounded-md border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">AI Summary</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.aiSummary}</p>
          </div>
        )}

        {ticket.aiReply && (
          <div className="rounded-md border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">AI Reply</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.aiReply}</p>
          </div>
        )}
      </div>
    </div>
  )
}
