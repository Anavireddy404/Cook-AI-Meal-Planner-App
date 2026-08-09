import { useState } from 'react'
import { Activity, Flame, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { api, type MealSource, type NutritionEstimate } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface NutritionDialogProps {
  mealId: number
  name: string
  diets?: string[]
  source?: MealSource
  image?: string
  compact?: boolean
}

const MACROS = [
  { key: 'proteinGrams', label: 'Protein', unit: 'g' },
  { key: 'carbsGrams', label: 'Carbs', unit: 'g' },
  { key: 'fatGrams', label: 'Fat', unit: 'g' },
  { key: 'fiberGrams', label: 'Fiber', unit: 'g' },
] satisfies Array<{ key: keyof NutritionEstimate; label: string; unit: string }>

function NutritionLoading() {
  return (
    <div className="space-y-4" aria-label="Estimating nutrition" aria-busy="true">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-xl" />
    </div>
  )
}

function NutritionDetails({ estimate }: { estimate: NutritionEstimate }) {
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="absolute -right-8 -top-10 size-28 rounded-full bg-white/10 blur-xl" aria-hidden="true" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">Per serving</p>
            <p className="mt-1.5 text-sm text-white/78">{estimate.servingDescription}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="flex items-center justify-end gap-1 text-white/70">
              <Flame className="size-4" aria-hidden="true" />
              <span className="text-xs font-medium">Calories</span>
            </span>
            <p className="mt-1 text-3xl font-semibold leading-none tabular-nums">{estimate.calories}</p>
          </div>
        </div>
      </section>

      <section aria-label="Macronutrient estimates" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MACROS.map(({ key, label, unit }) => (
          <div key={key} className="rounded-xl border border-border bg-background p-3 text-center">
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {estimate[key] as number}
              <span className="ml-0.5 text-xs font-medium text-muted-foreground">{unit}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-secondary/65 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Sugar</p>
          <p className="mt-0.5 font-semibold tabular-nums">{estimate.sugarGrams}g</p>
        </div>
        <div className="rounded-xl bg-secondary/65 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Sodium</p>
          <p className="mt-0.5 font-semibold tabular-nums">{estimate.sodiumMg}mg</p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/12 bg-secondary/40 p-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Nutrition snapshot</p>
          <Badge variant="outline" className="ml-auto capitalize">{estimate.confidence} confidence</Badge>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{estimate.summary}</p>
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
        AI estimate only. Ingredients, preparation, and portion size can change these values. Not medical advice.
      </p>
    </div>
  )
}

export function NutritionDialog({ mealId, name, diets = [], source, image, compact = false }: NutritionDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [estimate, setEstimate] = useState<NutritionEstimate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function loadEstimate() {
    if (isLoading) return
    if (!user) {
      setError('Sign in to view a nutrition estimate.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.getMealNutrition(user._id, { mealId, name, diets, source })
      setEstimate(result)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not estimate nutrition')
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen && !estimate && !isLoading) void loadEstimate()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {compact ? (
          <button
            type="button"
            className="flex min-h-14 w-full items-center gap-2 rounded-lg p-1.5 pr-12 text-left transition-colors hover:bg-secondary/55 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View nutrition estimate for ${name}`}
          >
            {image ? (
              <img
                src={image}
                alt=""
                loading="lazy"
                width={44}
                height={44}
                className="size-11 shrink-0 rounded-md bg-muted object-cover"
              />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <Activity className="size-4" aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[0.7rem] font-semibold leading-snug text-card-foreground">{name}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[0.62rem] font-medium text-primary">
                <Activity className="size-3" aria-hidden="true" />
                View nutrition
              </span>
            </span>
          </button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-full">
            <Activity className="size-3.5" aria-hidden="true" />
            Nutrition estimate
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto gap-5 rounded-[1.5rem] p-5 sm:max-w-lg sm:p-6">
        <DialogHeader className="pr-8">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <Activity className="size-4" aria-hidden="true" />
            </span>
            <Badge variant="secondary">AI estimate</Badge>
          </div>
          <DialogTitle className="text-xl font-semibold leading-tight tracking-tight">{name}</DialogTitle>
          <DialogDescription>Estimated nutrition for one typical serving.</DialogDescription>
        </DialogHeader>

        <div aria-live="polite">
          {isLoading && <NutritionLoading />}
          {!isLoading && estimate && <NutritionDetails estimate={estimate} />}
          {!isLoading && error && (
            <div role="alert" className="flex flex-col items-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <TriangleAlert className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">Nutrition estimate unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void loadEstimate()}>
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Try again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
