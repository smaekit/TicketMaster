import { Navigate, Outlet } from 'react-router-dom'
import { Role } from '@ticketmaster/shared'
import { authClient } from '../lib/authClient'

export default function AdminRoute() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null
  if (!session) return <Navigate to="/login" replace />
  if (session.user.role !== Role.ADMIN) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
