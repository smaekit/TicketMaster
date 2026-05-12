import TicketsTable from './TicketsTable'

export default function TicketsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and respond to customer requests</p>
      </div>
      <TicketsTable />
    </div>
  )
}
