import { CreateUserModal } from './CreateUserModal'
import { UsersTable } from './UsersTable'

export default function UsersPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <CreateUserModal />
      </div>
      <UsersTable />
    </div>
  )
}
