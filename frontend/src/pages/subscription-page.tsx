import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bot, Check, Crown, LoaderCircle, Salad, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const FREE_FEATURES = ['Search healthy recipes', 'Weekly breakfast, lunch, and dinner', 'Saved food preferences']
const PLUS_FEATURES = ['Everything in Free', 'AI-built seven-day meal plans', 'Review and approve each meal', 'Create and save your own meals']

export function SubscriptionPage() {
  const { user, refreshUser } = useAuth()
  const [searchParams] = useSearchParams()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const checkoutResult = searchParams.get('checkout')
  const userId = user?._id

  useEffect(() => {
    if (checkoutResult === 'success' && userId) {
      toast.success('Payment received — activating Planner Plus')
      let canceled = false
      let timer: number | undefined
      let attempts = 0

      async function pollForActivation() {
        attempts += 1
        try {
          const status = await api.getSubscriptionStatus(userId!)
          if (status.hasPlusAccess) {
            await refreshUser()
            if (!canceled) toast.success('Planner Plus is active')
            return
          }
        } catch {
          // A later attempt can recover from a brief webhook or network delay.
        }
        if (!canceled && attempts < 6) timer = window.setTimeout(() => void pollForActivation(), 1500)
      }

      timer = window.setTimeout(() => void pollForActivation(), 800)
      return () => {
        canceled = true
        if (timer) window.clearTimeout(timer)
      }
    }
    if (checkoutResult === 'canceled') toast.message('Checkout canceled. Your plan was not changed.')
  }, [checkoutResult, refreshUser, userId])

  if (!user) return null

  async function openBilling() {
    setIsRedirecting(true)
    try {
      const result = user!.hasPlusAccess
        ? await api.createSubscriptionPortal(user!._id)
        : await api.createSubscriptionCheckout(user!._id)
      window.location.assign(result.url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open secure billing')
      setIsRedirecting(false)
    }
  }

  return (
    <div className="page-enter">
      <header className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="mx-auto"><Sparkles className="size-3" />{user.plannerPlusAvailable ? 'Planner Plus' : 'In development'}</Badge>
        <h1 className="mt-4 text-balance text-4xl leading-tight tracking-[-0.045em] sm:text-5xl">{user.plannerPlusAvailable ? 'Plan less. Eat well all week.' : 'Something smarter is cooking.'}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{user.plannerPlusAvailable ? 'Keep the flexible free planner, or unlock a personal AI planning partner and custom meals.' : 'We are working on Planner Plus with customizable meals and an AI-powered weekly planner. Subscriptions are not open yet.'}</p>
      </header>

      <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-2">
        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card sm:p-8" aria-labelledby="free-plan-title">
          <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-muted-foreground">Everyday planning</p><h2 id="free-plan-title" className="mt-2 text-2xl">Free</h2></div>{!user.hasPlusAccess && <Badge variant="outline">Current plan</Badge>}</div>
          <p className="mt-2 text-sm text-muted-foreground">The essentials for building a balanced week.</p>
          <ul className="mt-7 space-y-3">{FREE_FEATURES.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm"><span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-secondary text-primary"><Check className="size-3" /></span>{feature}</li>)}</ul>
          <Button asChild variant="outline" className="mt-8 w-full"><Link to="/">Go to weekly plan</Link></Button>
        </section>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/25 bg-primary p-6 text-primary-foreground shadow-soft sm:p-8" aria-labelledby="plus-plan-title">
          <div className="absolute -right-16 -top-16 size-52 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-white/65">Personal planning</p><h2 id="plus-plan-title" className="mt-2 flex items-center gap-2 text-2xl"><Crown className="size-5" />Planner Plus</h2></div>{user.hasPlusAccess ? <Badge className="bg-white text-primary">Active</Badge> : !user.plannerPlusAvailable && <Badge className="bg-white text-primary">Coming soon</Badge>}</div>
            <p className="mt-2 text-sm text-white/70">{user.plannerPlusAvailable ? 'Price and billing interval are shown securely in Stripe checkout.' : 'We will open subscriptions after these features are ready to use.'}</p>
            <ul className="mt-7 space-y-3">{PLUS_FEATURES.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm"><span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-white/15"><Check className="size-3" /></span>{feature}</li>)}</ul>
            <Button onClick={openBilling} disabled={isRedirecting || (!user.plannerPlusAvailable && !user.hasPlusAccess)} className="mt-8 w-full bg-white text-primary hover:bg-white/90">
              {isRedirecting ? <><LoaderCircle className="size-4 animate-spin" />Opening secure billing</> : user.hasPlusAccess ? 'Manage billing' : user.plannerPlusAvailable ? 'Upgrade with Stripe' : 'Subscriptions coming soon'}
            </Button>
            {!user.plannerPlusAvailable && !user.hasPlusAccess && <p className="mt-3 text-center text-xs text-white/70">You can keep using every free planning feature while we finish building.</p>}
          </div>
        </section>
      </div>

      <div className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-3">
        {[{ icon: Bot, title: 'Conversational', copy: 'Describe the week you want in everyday language.' }, { icon: Salad, title: 'Preference-aware', copy: 'Use your saved diets or adjust them for each plan.' }, { icon: Check, title: 'You approve', copy: 'Nothing is saved until you review and select it.' }].map(({ icon: Icon, title, copy }) => <div key={title} className="rounded-2xl border border-border bg-card p-5"><Icon className="size-5 text-primary" /><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy}</p></div>)}
      </div>
    </div>
  )
}
