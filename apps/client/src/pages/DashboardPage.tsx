import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api'
import { authClient } from '@/lib/authClient'

type DailyCount = { date: string; count: number }

type TicketStats = {
  totalTickets: number
  openTickets: number
  aiResolvedTickets: number
  aiResolvedPercentage: number
  avgResolutionMs: number | null
  dailyTickets: DailyCount[]
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 60_000) return '< 1m'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({
  title,
  value,
  sub,
  accent,
}: {
  title: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <Card className={accent ? 'border-l-4 border-l-primary' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-20" />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: session } = authClient.useSession()
  const { data, isLoading, isError } = useQuery<TicketStats>({
    queryKey: ['ticket-stats'],
    queryFn: () => api.get('/tickets/stats').then((r) => r.data),
  })

  const chartData = data?.dailyTickets.map((d) => ({
    date: formatChartDate(d.date),
    Tickets: d.count,
  }))

  const firstName = session?.user.name?.split(' ')[0] ?? ''

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-foreground">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your tickets.</p>
      </div>

      {isError && (
        <p className="text-destructive text-sm mb-4">Failed to load stats. Please try again.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : data ? (
          <>
            <StatCard title="Total Tickets" value={data.totalTickets.toLocaleString()} />
            <StatCard
              title="Open Tickets"
              value={data.openTickets.toLocaleString()}
              accent={data.openTickets > 0}
            />
            <StatCard title="Resolved by AI" value={data.aiResolvedTickets.toLocaleString()} />
            <StatCard
              title="AI Resolution Rate"
              value={`${data.aiResolvedPercentage.toFixed(1)}%`}
              sub="of all tickets auto-resolved"
            />
            <StatCard
              title="Avg Resolution Time"
              value={formatDuration(data.avgResolutionMs)}
              sub="resolved & closed tickets"
            />
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tickets per Day — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : chartData ? (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'Inter, sans-serif',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar dataKey="Tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
