import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { Role } from '@ticketmaster/shared'
import { authClient } from '../lib/authClient'

function useTheme() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return { isDark, toggle }
}

function NavItem({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation()
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Link
      to={to}
      className={`text-sm font-medium px-1 py-0 flex items-center h-full border-b-2 transition-colors ${
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  )
}

function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" className={className} fill="currentColor">
      <path d="M7 1.5 L12.5 7 L7 12.5 L1.5 7 Z" />
    </svg>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const { isDark, toggle } = useTheme()

  const handleSignOut = async () => {
    await authClient.signOut()
    navigate('/login', { replace: true })
  }

  const initials = session?.user.name
    ? session.user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm dark:shadow-[0_1px_0_hsl(189_100%_50%_/_0.1)]">
      <div className="max-w-5xl mx-auto px-6 flex items-stretch h-14 gap-6">
        <Link
          to="/"
          className="flex items-center gap-2 flex-shrink-0"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 dark:shadow-[0_0_12px_hsl(189_100%_50%_/_0.4)]">
            <DiamondIcon className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground tracking-tight">TicketMaster</span>
        </Link>

        {session && (
          <div className="flex items-stretch flex-1 gap-5">
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/tickets" label="Tickets" />
            {session.user.role === Role.ADMIN && (
              <NavItem to="/users" label="Users" />
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={toggle}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark
                  ? <Sun className="h-4 w-4" />
                  : <Moon className="h-4 w-4" />
                }
              </button>

              <div className="w-px h-5 bg-border mx-1" />

              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold select-none dark:ring-1 dark:ring-primary/30">
                {initials}
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {session.user.name}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
