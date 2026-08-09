import { Bot, ChevronRight, Crown, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { CustomMealForm } from '@/components/milo/custom-meal-form'
import { MiloAssistant } from '@/components/milo/milo-assistant'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function MiloComingSoon() {
  return (
    <section className="relative mt-8 overflow-hidden rounded-[1.75rem] bg-primary p-7 text-primary-foreground shadow-soft sm:p-10">
      <div className="absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="relative max-w-2xl">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15"><Bot className="size-5" /></span>
        <p className="eyebrow mt-6 text-white/65">In private testing</p>
        <h2 className="mt-2 text-3xl tracking-[-0.04em]">Meet Milo, your meal planning assistant.</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/72 sm:text-base">Milo can talk through your needs, create a complete week, and wait for your approval before adding anything to your plan.</p>
        <Button asChild className="mt-6 bg-white text-primary hover:bg-white/90"><Link to="/subscription">See what is coming<ChevronRight className="size-4" /></Link></Button>
      </div>
    </section>
  )
}

export function PlannerPage() {
  const { user } = useAuth()
  if (!user) return null

  const customMealsAvailable = user.plannerPlusAvailable && user.hasPlusAccess

  return (
    <div className="page-enter">
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-2 text-primary"><Sparkles className="size-4" />Milo assistant</p>
        <h1 className="mt-3 text-balance text-4xl leading-tight tracking-[-0.045em] sm:text-5xl">Plan your week with Milo.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Chat about what you need, review every meal, and decide what gets added.</p>
      </header>

      {!user.miloPreviewAvailable ? <MiloComingSoon /> : customMealsAvailable ? (
        <Tabs defaultValue="milo" className="mt-8">
          <TabsList className="h-12 w-full max-w-md rounded-xl bg-muted p-1">
            <TabsTrigger value="milo" className="h-10 rounded-lg px-4"><Bot className="size-4" />Milo</TabsTrigger>
            <TabsTrigger value="custom" className="h-10 rounded-lg px-4"><Plus className="size-4" />Custom meal</TabsTrigger>
          </TabsList>
          <TabsContent value="milo" className="mt-5"><MiloAssistant user={user} /></TabsContent>
          <TabsContent value="custom" className="mt-5"><CustomMealForm user={user} /></TabsContent>
        </Tabs>
      ) : (
        <div className="mt-8">
          <MiloAssistant user={user} />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/60 p-4">
            <div className="flex items-center gap-3"><Crown className="size-5 text-primary" /><div><p className="text-sm font-semibold">Custom meals are part of Planner Plus</p><p className="text-xs text-muted-foreground">Milo is open locally for testing. Custom meal access has not changed.</p></div></div>
            <Button asChild variant="outline" size="sm"><Link to="/subscription">View Planner Plus</Link></Button>
          </div>
        </div>
      )}
    </div>
  )
}
