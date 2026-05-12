import { sanitizeEmailHtml } from '@/lib/utils'

export type TicketReply = {
  id: string
  body: string
  source: 'AGENT' | 'CUSTOMER' | 'AI'
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
        const isCustomer = reply.source === 'CUSTOMER'
        const displayName = isCustomer
          ? (reply.senderName ? `${reply.senderName} <${reply.senderEmail}>` : reply.senderEmail)
          : reply.source === 'AI'
            ? 'Support'
            : (reply.author?.name ?? 'Agent')
        const borderColor = isCustomer ? 'border-muted-foreground' : 'border-primary'
        return (
          <div key={reply.id} className={`border-l-2 pl-3 ${borderColor}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{displayName}</span>
              {isCustomer && <span className="text-xs text-muted-foreground">(customer)</span>}
              <span className="text-xs text-muted-foreground">
                {new Date(reply.createdAt).toLocaleString()}
              </span>
            </div>
            {isCustomer ? (
              <div className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(reply.body) }} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
