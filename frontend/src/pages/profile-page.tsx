import { Link } from 'react-router-dom'
import { Activity, CalendarDays, CircleUserRound, Crown, Ruler, Scale, Settings2, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatDate(value: string | null) {
  if (!value) return 'Account date unavailable'
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="page-enter">
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-2 text-primary"><CircleUserRound className="size-4" aria-hidden="true" />Your account</p>
        <h1 className="mt-3 text-balance text-4xl leading-tight tracking-[-0.045em] sm:text-5xl">A home for your food life.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">See your account details, food preferences, and Planner Plus access in one place.</p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-visible">
          <CardHeader className="border-b border-border pb-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-soft">{user.username.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><CardTitle className="text-2xl">{user.username}</CardTitle>{user.hasPlusAccess && <Badge><Crown className="size-3" />Plus</Badge>}</div>
                <p className="mt-1 text-sm text-muted-foreground">Your personal Cook account</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted/60 p-4"><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"><UserRound className="size-4" />Username</dt><dd className="mt-2 break-all text-sm font-semibold">{user.username}</dd></div>
              <div className="rounded-2xl bg-muted/60 p-4"><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"><CalendarDays className="size-4" />Joined</dt><dd className="mt-2 text-sm font-semibold">{formatDate(user.joinedAt)}</dd></div>
              <div className="rounded-2xl bg-muted/60 p-4 sm:col-span-2"><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"><ShieldCheck className="size-4" />Account status</dt><dd className="mt-2 text-sm font-semibold">Active username account</dd></div>
            </dl>

            <div className="mt-5 border-t border-border pt-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-primary" />Planning profile</h3>
              {user.healthProfile ? (
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border bg-background p-3 text-center"><dt className="text-xs text-muted-foreground">Age</dt><dd className="mt-1 font-semibold tabular-nums">{user.healthProfile.age}</dd></div>
                  <div className="rounded-xl border border-border bg-background p-3 text-center"><dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Scale className="size-3" />Weight</dt><dd className="mt-1 font-semibold tabular-nums">{user.healthProfile.weight.value} {user.healthProfile.weight.unit}</dd></div>
                  <div className="rounded-xl border border-border bg-background p-3 text-center"><dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Ruler className="size-3" />Height</dt><dd className="mt-1 font-semibold tabular-nums">{user.healthProfile.height.feet}′ {user.healthProfile.height.inches}″</dd></div>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">This account was created before planning profiles were added.</p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">These details stay in your account and are not medical guidance.</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className={user.hasPlusAccess ? 'border-primary/25 bg-secondary/40' : ''}>
            <CardHeader><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Crown className="size-5" /></div><CardTitle className="mt-3">{user.hasPlusAccess ? 'Planner Plus is active' : 'Free plan'}</CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-relaxed text-muted-foreground">{!user.plannerPlusAvailable ? 'We are working on custom meals and the AI planner. Planner Plus will open when they are ready.' : user.hasPlusAccess ? 'AI weekly plans and custom meals are unlocked for your account.' : 'Upgrade when you want AI-created weeks and your own custom meals.'}</p><Button asChild className="mt-5 w-full" variant={user.hasPlusAccess ? 'outline' : 'default'}><Link to="/subscription">{!user.plannerPlusAvailable ? 'See what is coming' : user.hasPlusAccess ? 'Manage subscription' : 'Explore Planner Plus'}</Link></Button></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="size-4 text-primary" />Food preferences</CardTitle></CardHeader>
            <CardContent><div className="flex flex-wrap gap-2">{user.preferences.length ? user.preferences.map((preference) => <Badge key={preference} variant="secondary">{preference}</Badge>) : <p className="text-sm text-muted-foreground">No preferences selected yet.</p>}</div><Button asChild variant="outline" className="mt-5 w-full"><Link to="/preferences">Edit food profile</Link></Button></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
