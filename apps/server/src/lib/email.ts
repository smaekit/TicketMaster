import { Resend } from 'resend'

let resend: Resend | null = null

function getClient(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function sendReplyEmail(opts: {
  to: string
  subject: string
  replyBody: string
  idempotencyKey: string
}) {
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  const { error } = await getClient().emails.send(
    {
      from,
      to: opts.to,
      subject: `Re: ${opts.subject}`,
      text: opts.replyBody,
    },
    { idempotencyKey: opts.idempotencyKey },
  )

  if (error) throw new Error(`Resend error: ${error.message}`)
}
