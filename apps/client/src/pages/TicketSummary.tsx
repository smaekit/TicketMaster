import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { Sparkles } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Ticket } from './TicketDetailPage'

export function TicketSummary({ ticket }: { ticket: Ticket }) {
  const { id, aiSummary } = ticket

  const queryClient = useQueryClient()
  const { mutate: summarize, isPending: summarizing } = useMutation({
    mutationFn: () => api.post(`/tickets/${id}/summarize`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled={summarizing} onClick={() => summarize()}>
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          {summarizing ? 'Summarizing…' : aiSummary ? 'Re-summarize' : 'Summarize'}
        </Button>
      </div>

      {aiSummary && (
        <div className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">AI Summary</p>
          <p className="text-sm whitespace-pre-wrap">{aiSummary}</p>
        </div>
      )}
    </div>
  )
}