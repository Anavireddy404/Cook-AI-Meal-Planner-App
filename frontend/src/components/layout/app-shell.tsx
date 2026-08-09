import { Link, Outlet, NavLink } from 'react-router-dom'
import { Bot, CalendarDays, ChevronDown, CircleUserRound, Crown, LogOut, Search, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { BrandMark } from '@/components/layout/brand-mark'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NAV_ITEMS = [
  { to: '/', label: 'Weekly plan', mobileLabel: 'Plan', icon: CalendarDays, end: true },
  { to: '/search', label: 'Discover meals', mobileLabel: 'Discover', icon: Search, end: false },
  { to: '/planner', label: 'Milo assistant', mobileLabel: 'Milo', icon: Bot, end: false },
  { to: '/preferences', label: 'Food preferences', mobileLabel: 'Food profile', icon: SlidersHorizontal, end: false },
]

function formatJoinedDate(value: string | null | undefined) {
  if (!value) return 'Member'
  return `Joined ${new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(value))}`
}

function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth()
  const initials = user?.username.slice(0, 2).toUpperCase() ?? '??'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Open account menu for ${user?.username ?? 'user'}`}
          className={
            compact
              ? 'flex size-11 items-center justify-center rounded-2xl border border-border bg-card shadow-card transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'
              : 'flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left shadow-card transition-all duration-200 hover:border-primary/25 hover:shadow-soft focus-visible:ring-2 focus-visible:ring-ring'
          }
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-secondary text-xs font-bold text-secondary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{user?.username}</span>
                <span className="block text-xs text-muted-foreground">{user?.hasPlusAccess ? 'Planner Plus' : 'Free plan'}</span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl p-1.5">
        <DropdownMenuLabel className="px-2 py-2">
          <span className="block truncate text-sm font-semibold">{user?.username}</span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{formatJoinedDate(user?.joinedAt)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-10 rounded-lg px-2.5">
          <Link to="/profile"><CircleUserRound className="size-4" />Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-10 rounded-lg px-2.5">
          <Link to="/subscription"><Crown className="size-4" />{user?.hasPlusAccess ? 'Manage Planner Plus' : 'Explore Planner Plus'}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout} className="min-h-10 rounded-lg px-2.5">
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell() {
  const { user } = useAuth()

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-card px-5 py-6 lg:flex lg:flex-col">
        <BrandMark className="px-2" />

        <div className="mt-10 px-2">
          <p className="eyebrow text-muted-foreground">Your kitchen</p>
        </div>
        <nav className="mt-3 flex flex-col gap-1.5" aria-label="Primary navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                `relative flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex size-8 items-center justify-center rounded-xl ${
                      isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-transparent'
                    }`}
                  >
                    <Icon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
                  </span>
                  {label}
                  {isActive && <span className="ml-auto size-1.5 rounded-full bg-primary" aria-hidden="true" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          <Link to={user?.miloPreviewAvailable ? '/planner' : '/subscription'} className="mb-4 block rounded-2xl bg-secondary/70 p-4 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center gap-2 text-xs font-semibold text-secondary-foreground">{user?.miloPreviewAvailable ? <Bot className="size-4 text-primary" /> : <Crown className="size-4 text-primary" />}{user?.miloPreviewAvailable ? 'Milo is ready to test' : 'Planner Plus is coming soon'}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{user?.miloPreviewAvailable ? 'Chat, review, regenerate, and approve.' : 'We are building custom meals and AI planning.'}</p>
          </Link>
          <AccountMenu />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:hidden">
          <BrandMark compact />
          <AccountMenu compact />
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1480px] px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-[1.4rem] border border-border bg-card/95 p-1.5 shadow-[0_18px_50px_-14px_rgb(15_82_61_/_0.35)] backdrop-blur-xl lg:hidden"
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map(({ to, mobileLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={mobileLabel}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1rem] text-[0.7rem] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
              {mobileLabel}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
