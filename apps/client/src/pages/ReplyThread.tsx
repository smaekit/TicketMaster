export type TicketReply = {
  id: string
  body: string
  source: 'AGENT' | 'CUSTOMER'
  author: { id: string; name: string } | null
  senderEmail: string | null
  senderName: string | null
  createdAt: string
}

type Props = {
  replies: TicketReply[]
}

export function ReplyThread({ replies }: Props) {
  if (replies.length === 0) {
    return <p className="text-sm text-muted-foreground">No replies yet.</p>
  }

  return (
    <div className="space-y-4">
      {replies.map((reply) => {
        const isAgent = reply.source === 'AGENT'
        const displayName = isAgent
          ? (reply.author?.name ?? 'Agent')
          : (reply.senderName ? `${reply.senderName} <${reply.senderEmail}>` : reply.senderEmail)
        return (
          <div key={reply.id} className={`border-l-2 pl-3 ${isAgent ? 'border-primary' : 'border-muted-foreground'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{displayName}</span>
              {!isAgent && <span className="text-xs text-muted-foreground">(customer)</span>}
              <span className="text-xs text-muted-foreground">
                {new Date(reply.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
          </div>
        )
      })}
    </div>
  )
}
