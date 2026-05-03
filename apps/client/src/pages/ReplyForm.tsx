import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'

type Props = { ticketId: string }

export function ReplyForm({ ticketId }: Props) {
  const [body, setBody] = useState('')
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(`/tickets/${ticketId}/replies`, { body }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      setBody('')
    },
  })

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Write a reply…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
      />
      <div className="flex justify-end">
        <Button size="sm" disabled={isPending || body.trim() === ''} onClick={() => mutate()}>
          {isPending ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </div>
  )
}
