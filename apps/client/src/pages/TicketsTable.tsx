import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api'

type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED'
type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST' | 'UNCATEGORIZED'

type Ticket = {
  id: string
  senderEmail: string
  senderName: string | null
  subject: string
  status: TicketStatus
  category: TicketCategory
  createdAt: string
}

async function fetchTickets(): Promise<Ticket[]> {
  const { data } = await api.get<Ticket[]>('/tickets')
  return data
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

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

export default function TicketsTable() {
  const { data: tickets, isPending, isError } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  })

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load tickets.</p>
  }

  if (tickets.length === 0) {
    return <p className="text-sm text-muted-foreground">No tickets yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Sender</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Received</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="font-medium">{ticket.subject}</TableCell>
            <TableCell>
              <div className="text-sm">{ticket.senderName ?? ticket.senderEmail}</div>
              {ticket.senderName && (
                <div className="text-xs text-muted-foreground">{ticket.senderEmail}</div>
              )}
            </TableCell>
            <TableCell>
              <StatusBadge status={ticket.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {CATEGORY_LABELS[ticket.category]}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(ticket.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
