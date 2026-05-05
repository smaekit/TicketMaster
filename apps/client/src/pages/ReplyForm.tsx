import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'

type Props = { ticketId: string }

export function ReplyForm({ ticketId }: Props) {
  const [body, setBody] = useState('')
  const [polishing, setPolishing] = useState(false)
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(`/tickets/${ticketId}/replies`, { body }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      setBody('')
    },
  })

  const handlePolish = async () => {
    setPolishing(true)
    try {
      const { data } = await api.post(`/tickets/${ticketId}/polish-reply`, { body })
      setBody(data.polishedReply)
    } finally {
      setPolishing(false)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Write a reply…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={polishing || isPending || body.trim() === ''}
          onClick={handlePolish}
        >
          {polishing ? 'Polishing…' : 'Polish'}
        </Button>
        <Button size="sm" disabled={isPending || polishing || body.trim() === ''} onClick={() => mutate()}>
          {isPending ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </div>
  )
}
