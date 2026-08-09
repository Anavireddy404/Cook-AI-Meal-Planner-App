import { useEffect, useState } from 'react'
import { Check, Leaf, LoaderCircle, Save, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { DIET_OPTIONS } from '@/lib/diets'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const DIET_DESCRIPTIONS: Record<string, string> = {
  'Gluten Free': 'Avoids wheat and gluten-containing grains',
  Ketogenic: 'Very low carb, higher fat meals',
  Vegetarian: 'Plant-forward meals without meat',
  'Lacto Vegetarian': 'Vegetarian meals including dairy',
  Vegan: 'Fully plant-based ingredients',
  Pescetarian: 'Vegetarian meals plus seafood',
  Paleo: 'Whole foods inspired by ancestral diets',
  Primal: 'Paleo-style with flexible dairy options',
  Whole30: 'Whole foods without added sugar or grains',
}

export function PreferencesPage() {
  const { user, refreshUser } = useAuth()
  const [preferences, setPreferences] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) setPreferences(user.preferences)
  }, [user])

  function toggleDiet(diet: string) {
    setPreferences((current) => (current.includes(diet) ? current.filter((item) => item !== diet) : [...current, diet]))
  }

  async function handleSave() {
    if (!user) return
    setIsSaving(true)
    try {
      await api.updatePreferences(user._id, preferences)
      await refreshUser()
      toast.success('Food profile saved')
    } catch {
      toast.error('Could not save preferences — please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty = user
    ? JSON.stringify([...preferences].sort()) !== JSON.stringify([...user.preferences].sort())
    : false

  return (
    <div className="page-enter">
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-2 text-primary">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Food profile
        </p>
        <h1 className="mt-3 text-balance text-4xl leading-tight tracking-[-0.045em] sm:text-5xl">Recipes that feel more like you.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Choose the eating styles that fit. We use them to make every recipe search more relevant.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[1.5rem] border border-border bg-card p-4 shadow-card sm:p-6" aria-labelledby="diet-options-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
            <div>
              <h2 id="diet-options-title" className="text-xl">Dietary preferences</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select all that apply. You can change these anytime.</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground" aria-live="polite">
              {preferences.length} selected
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {DIET_OPTIONS.map((diet) => {
              const selected = preferences.includes(diet)
              return (
                <button
                  key={diet}
                  type="button"
                  onClick={() => toggleDiet(diet)}
                  aria-pressed={selected}
                  className={cn(
                    'group flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary/40 bg-secondary text-secondary-foreground shadow-sm'
                      : 'border-border bg-background/50 text-foreground hover:border-primary/25 hover:bg-secondary/35',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground',
                    )}
                  >
                    {selected ? <Check className="size-4" aria-hidden="true" /> : <Leaf className="size-4" aria-hidden="true" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{diet}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{DIET_DESCRIPTIONS[diet]}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-8">
          <div className="rounded-[1.5rem] bg-primary p-6 text-primary-foreground shadow-soft">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl">Your profile, your control</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              These choices only shape recipe results. They never lock you into a rigid plan.
            </p>
            <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-4 text-xs font-medium text-white/72">
              <Search className="size-4" aria-hidden="true" />
              Applied automatically to search
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-card">
            <Button onClick={handleSave} disabled={!isDirty || isSaving} size="lg" className="w-full">
              {isSaving ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Saving profile
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save food profile
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground" aria-live="polite">
              {isDirty ? 'You have unsaved changes' : 'Everything is up to date'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
