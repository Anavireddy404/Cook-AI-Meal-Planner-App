import { Activity, Candy, Flame, Gauge, Leaf, LoaderCircle, RefreshCw, TriangleAlert, Wheat } from 'lucide-react'
import type { DailyNutritionSummary, WeeklyNutritionSummary } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DailyNutritionDialogProps {
  dayName: string
  summary?: DailyNutritionSummary
  targets?: WeeklyNutritionSummary['targets']
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const STATUS_LABELS = {
  empty: 'No meals yet',
  building: 'Still building',
  on_track: 'Near reference',
  over_reference: 'Above reference',
} satisfies Record<DailyNutritionSummary['status'], string>

function MetricCard({
  icon: Icon,
  label,
  value,
  target,
  unit,
  upperLimit = false,
}: {
  icon: typeof Activity
  label: string
  value: number
  target?: number
  unit: string
  upperLimit?: boolean
}) {
  const progress = target ? Math.round((value / target) * 100) : null
  const barWidth = progress === null ? 0 : Math.min(100, progress)
  const exceedsLimit = upperLimit && progress !== null && progress > 100

  return (
    <div className="rounded-2xl border border-border bg-background p-3.5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 text-primary" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
        {value.toLocaleString()}
        <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>
      </p>
      {target !== undefined && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className={cn('h-full rounded-full bg-primary transition-[width]', exceedsLimit && 'bg-destructive')}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
            {upperLimit ? `Reference limit ${target.toLocaleString()} ${unit}` : `of ${target.toLocaleString()} ${unit} reference`}
          </p>
        </>
      )}
    </div>
  )
}

function SummaryLoading() {
  return (
    <div className="space-y-3" aria-label="Calculating daily nutrition" aria-busy="true">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function DailyNutritionDialog({
  dayName,
  summary,
  targets,
  isLoading = false,
  error,
  onRetry,
}: DailyNutritionDialogProps) {
  const rawProgress = summary?.calorieProgressPercent ?? 0
  const ringProgress = Math.min(100, Math.max(0, rawProgress))
  const isOver = summary?.status === 'over_reference'
  const ringColor = error ? 'var(--destructive)' : isOver ? '#d97706' : 'var(--primary)'
  const emptyRing = 'var(--muted)'

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative flex size-14 shrink-0 items-center justify-center rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
          style={{ background: `conic-gradient(${ringColor} ${ringProgress}%, ${emptyRing} ${ringProgress}% 100%)` }}
          aria-label={`Open ${dayName} nutrition summary${summary ? `, ${summary.totals.calories} of ${targets?.calories ?? 0} calories` : ''}`}
        >
          <span className="flex size-[46px] flex-col items-center justify-center rounded-full bg-card text-card-foreground shadow-sm ring-1 ring-border">
            {isLoading ? (
              <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
            ) : error ? (
              <TriangleAlert className="size-4 text-destructive" aria-hidden="true" />
            ) : (
              <>
                <span className="text-[0.7rem] font-bold leading-none tabular-nums">{summary?.totals.calories ?? 0}</span>
                <span className="mt-0.5 text-[0.5rem] font-semibold uppercase tracking-wide text-muted-foreground">kcal</span>
              </>
            )}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto gap-5 rounded-[1.5rem] p-5 sm:max-w-lg sm:p-6">
        <DialogHeader className="pr-8">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <Gauge className="size-4" aria-hidden="true" />
            </span>
            <Badge variant="secondary">{dayName}</Badge>
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">Daily Nutrition Summary</DialogTitle>
          <DialogDescription>Totals for every meal currently planned for {dayName}.</DialogDescription>
        </DialogHeader>

        {isLoading && <SummaryLoading />}

        {!isLoading && error && (
          <div role="alert" className="flex flex-col items-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <TriangleAlert className="size-6 text-destructive" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-foreground">Summary unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            {onRetry && (
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                <RefreshCw className="size-3.5" />
                Try again
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && summary && targets && (
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
              <div className="absolute -right-8 -top-10 size-28 rounded-full bg-white/10 blur-xl" aria-hidden="true" />
              <div className="relative flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">Calories planned</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">{summary.totals.calories.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-white/70">of {targets.calories.toLocaleString()} kcal reference</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tabular-nums">{summary.calorieProgressPercent}%</p>
                  <p className="mt-1 text-xs text-white/70">{STATUS_LABELS[summary.status]}</p>
                </div>
              </div>
              <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/18">
                <div className="h-full rounded-full bg-white" style={{ width: `${ringProgress}%` }} />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2" aria-label={`${dayName} nutrient totals`}>
              <MetricCard icon={Activity} label="Protein" value={summary.totals.proteinGrams} target={targets.proteinGrams} unit="g" />
              <MetricCard icon={Wheat} label="Carbohydrates" value={summary.totals.carbsGrams} target={targets.carbsGrams} unit="g" />
              <MetricCard icon={Leaf} label="Fiber" value={summary.totals.fiberGrams} target={targets.fiberGrams} unit="g" />
              <MetricCard icon={Flame} label="Fat" value={summary.totals.fatGrams} target={targets.fatGrams} unit="g" />
              <MetricCard icon={Candy} label="Total sugar" value={summary.totals.sugarGrams} unit="g" />
              <MetricCard icon={Gauge} label="Sodium" value={summary.totals.sodiumMg} target={targets.sodiumMg} unit="mg" upperLimit />
            </section>

            <div className="rounded-xl border border-primary/12 bg-secondary/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">{summary.mealCount} meal{summary.mealCount === 1 ? '' : 's'} included</p>
              <p className="mt-1">{targets.basis}</p>
              {summary.logicEstimateCount > 0 && (
                <p className="mt-1 text-amber-700 dark:text-amber-300">
                  {summary.logicEstimateCount} meal{summary.logicEstimateCount === 1 ? ' uses' : 's use'} a temporary low-confidence estimate.
                </p>
              )}
            </div>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              Planning estimates only. Actual portions, ingredients, activity, and individual health needs can change these values. Not medical advice.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
