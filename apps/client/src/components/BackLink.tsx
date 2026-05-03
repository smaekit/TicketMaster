import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

type Props = {
  to: string
  label: string
}

export function BackLink({ to, label }: Props) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  )
}
