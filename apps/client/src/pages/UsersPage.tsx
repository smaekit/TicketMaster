import { CreateUserModal } from './CreateUserModal'
import { UsersTable } from './UsersTable'

export default function UsersPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team members</p>
        </div>
        <CreateUserModal />
      </div>
      <UsersTable />
    </div>
  )
}
