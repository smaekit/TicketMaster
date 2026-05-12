import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Column,
} from '@tanstack/react-table'
import { ArrowUp, ArrowDown, ArrowUpDown, X, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { type TicketStatus, type TicketCategory } from '@ticketmaster/shared'

type Ticket = {
  id: string
  senderEmail: string
  senderName: string | null
  subject: string
  status: TicketStatus
  category: TicketCategory
  createdAt: string
}

type TicketsResponse = {
  data: Ticket[]
  total: number
}

const PAGE_SIZE = 10

const STATUS_DOT: Record<TicketStatus, string> = {
  NEW: 'bg-amber-400',
  PROCESSING: 'bg-orange-400',
  OPEN: 'bg-sky-400',
  RESOLVED: 'bg-emerald-500',
  CLOSED: 'bg-gray-400',
}

const STATUS_PILL: Record<TicketStatus, string> = {
  NEW: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  PROCESSING: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
  OPEN: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  CLOSED: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200',
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL_QUESTION: 'General Question',
  TECHNICAL_QUESTION: 'Technical Question',
  REFUND_REQUEST: 'Refund Request',
  UNCATEGORIZED: 'Uncategorized',
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
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
    cell: ({ row }) => (
      <Link to={`/tickets/${row.original.id}`} className="font-medium hover:underline">
        {row.original.subject}
      </Link>
    ),
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
  const [page, setPage] = useState(1)

  // Debounce search input; also reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const sortBy = sorting[0]?.id ?? 'createdAt'
  const sortOrder = (sorting[0]?.desc ?? true) ? 'desc' : 'asc'
  const status = statusFilter !== 'all' ? statusFilter : undefined
  const category = categoryFilter !== 'all' ? categoryFilter : undefined
  const isFiltered = statusFilter !== 'all' || categoryFilter !== 'all' || searchInput !== ''

  function handleSortingChange(updater: SortingState | ((prev: SortingState) => SortingState)) {
    setPage(1)
    setSorting(updater)
  }

  function handleStatusChange(val: string) {
    setPage(1)
    setStatusFilter(val)
  }

  function handleCategoryChange(val: string) {
    setPage(1)
    setCategoryFilter(val)
  }

  function clearFilters() {
    setPage(1)
    setStatusFilter('all')
    setCategoryFilter('all')
    setSearchInput('')
    setSearch('')
  }

  const { data: response, isPending, isError } = useQuery({
    queryKey: ['tickets', sortBy, sortOrder, status, category, search, page],
    queryFn: () =>
      api
        .get<TicketsResponse>('/tickets', {
          params: {
            sortBy,
            sortOrder,
            page,
            pageSize: PAGE_SIZE,
            ...(status && { status }),
            ...(category && { category }),
            ...(search && { search }),
          },
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const tickets = response?.data ?? []
  const total = response?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  const table = useReactTable({
    data: tickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: { sorting },
    onSortingChange: handleSortingChange,
  })

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          placeholder="Search subject or sender…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={handleStatusChange}>
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
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
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

      {/* Table / states */}
      {isPending && !response ? (
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

      {/* Pagination bar */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            Showing {from}–{to} of {total} tickets
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
