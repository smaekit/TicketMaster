import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Column,
} from '@tanstack/react-table'
import { ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import api from '@/lib/api'

type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED'
type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST' | 'UNCATEGORIZED'

type Ticket = {
  id: string
  senderEmail: string
  senderName: string | null
  subject: string
  status: TicketStatus
  category: TicketCategory
  createdAt: string
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL_QUESTION: 'General Question',
  TECHNICAL_QUESTION: 'Technical Question',
  REFUND_REQUEST: 'Refund Request',
  UNCATEGORIZED: 'Uncategorized',
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

function SortableHeader({ column, label }: { column: Column<Ticket>; label: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  )
}

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: 'subject',
    header: ({ column }) => <SortableHeader column={column} label="Subject" />,
    cell: ({ row }) => <span className="font-medium">{row.original.subject}</span>,
  },
  {
    accessorKey: 'senderEmail',
    header: ({ column }) => <SortableHeader column={column} label="Sender" />,
    cell: ({ row }) => (
      <div>
        <div className="text-sm">{row.original.senderName ?? row.original.senderEmail}</div>
        {row.original.senderName && (
          <div className="text-xs text-muted-foreground">{row.original.senderEmail}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <SortableHeader column={column} label="Status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <SortableHeader column={column} label="Category" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {CATEGORY_LABELS[row.original.category]}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column} label="Received" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleString()}
      </span>
    ),
  },
]

export default function TicketsTable() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const sortBy = sorting[0]?.id ?? 'createdAt'
  const sortOrder = (sorting[0]?.desc ?? true) ? 'desc' : 'asc'
  const status = statusFilter !== 'all' ? statusFilter : undefined
  const category = categoryFilter !== 'all' ? categoryFilter : undefined

  const isFiltered = statusFilter !== 'all' || categoryFilter !== 'all' || searchInput !== ''

  function clearFilters() {
    setStatusFilter('all')
    setCategoryFilter('all')
    setSearchInput('')
    setSearch('')
  }

  const { data: tickets, isPending, isError } = useQuery({
    queryKey: ['tickets', sortBy, sortOrder, status, category, search],
    queryFn: () =>
      api
        .get<Ticket[]>('/tickets', {
          params: {
            sortBy,
            sortOrder,
            ...(status && { status }),
            ...(category && { category }),
            ...(search && { search }),
          },
        })
        .then((r) => r.data),
  })

  const table = useReactTable({
    data: tickets ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
  })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          placeholder="Search subject or sender…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-38">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="GENERAL_QUESTION">General Question</SelectItem>
            <SelectItem value="TECHNICAL_QUESTION">Technical Question</SelectItem>
            <SelectItem value="REFUND_REQUEST">Refund Request</SelectItem>
            <SelectItem value="UNCATEGORIZED">Uncategorized</SelectItem>
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load tickets.</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isFiltered ? 'No tickets match the current filters.' : 'No tickets yet.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
