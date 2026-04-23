import { useNavigate, Link } from 'react-router-dom'
import { authClient } from '../lib/authClient'

export default function Navbar() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  const handleSignOut = async () => {
    await authClient.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="font-semibold text-gray-900 hover:text-gray-600 transition-colors">TicketMaster</Link>
      {session && (
        <div className="flex items-center gap-4">
          {session.user.role === 'ADMIN' && (
            <Link to="/users" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Users
            </Link>
          )}
          <span className="text-sm text-gray-700">{session.user.name}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
