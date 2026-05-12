import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { type Ticket } from './TicketDetailPage'

type Agent = { id: string; name: string }

const STATUS_LABELS = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
} satisfies Partial<Record<TicketStatus, string>>

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL_QUESTION: 'General Question',
  TECHNICAL_QUESTION: 'Technical Question',
  REFUND_REQUEST: 'Refund Request',
  UNCATEGORIZED: 'Uncategorized',
}

const UNASSIGNED = '__unassigned__'

export function UpdateTicket({ ticket }: { ticket: Ticket }) {
  const { id: ticketId, status, category, assignedTo } = ticket
  const queryClient = useQueryClient()

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => api.get('/tickets/agents').then((r) => r.data),
  })

  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(status)
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>(category)
  const [selectedAgentId, setSelectedAgentId] = useState<string>(assignedTo?.id ?? UNASSIGNED)

  useEffect(() => {
    setSelectedStatus(status)
    setSelectedCategory(category)
    setSelectedAgentId(assignedTo?.id ?? UNASSIGNED)
  }, [status, category, assignedTo])

  const { mutate: update, isPending } = useMutation({
    mutationFn: () =>
      api.patch(`/tickets/${ticketId}`, {
        status: selectedStatus,
        category: selectedCategory,
        assignedToId: selectedAgentId === UNASSIGNED ? null : selectedAgentId,
      }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] }),
  })

  const isDirty =
    selectedStatus !== status ||
    selectedCategory !== category ||
    selectedAgentId !== (assignedTo?.id ?? UNASSIGNED)

  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground mb-3">Details</p>
      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-24 shrink-0">Status</span>
          <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as TicketStatus)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-24 shrink-0">Category</span>
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as TicketCategory)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-24 shrink-0">Assigned to</span>
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isDirty && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" disabled={isPending} onClick={() => update()}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}
