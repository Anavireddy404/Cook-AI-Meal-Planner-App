import { Link } from 'react-router-dom'
import { ChevronDown, Coffee, MoonStar, Plus, SunMedium, X } from 'lucide-react'
import type { DailyNutritionSummary, Meal, WeeklyNutritionSummary } from '@/lib/api'
import { MEAL_TYPE_LABELS, type MealType } from '@/lib/meal-types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { NutritionDialog } from '@/components/meal/nutrition-dialog'
import { DailyNutritionDialog } from '@/components/meal/daily-nutrition-dialog'

const MEAL_SECTIONS = [
  { type: 'breakfast', icon: Coffee },
  { type: 'lunch', icon: SunMedium },
  { type: 'dinner', icon: MoonStar },
] satisfies Array<{ type: MealType; icon: typeof Coffee }>

interface DayColumnProps {
  dayName: string
  dateLabel: string
  meals: Meal[]
  onRemove: (meal: Meal) => void
  isToday?: boolean
  isMobileExpanded?: boolean
  onMobileToggle?: () => void
  nutritionSummary?: DailyNutritionSummary
  nutritionTargets?: WeeklyNutritionSummary['targets']
  isNutritionLoading?: boolean
  nutritionError?: string | null
  onNutritionRetry?: () => void
}

export function DayColumn({
  dayName,
  dateLabel,
  meals,
  onRemove,
  isToday,
  isMobileExpanded = false,
  onMobileToggle,
  nutritionSummary,
  nutritionTargets,
  isNutritionLoading,
  nutritionError,
  onNutritionRetry,
}: DayColumnProps) {
  const mobileContentId = `${dayName.toLowerCase()}-meal-sections`
  const mealCountLabel = meals.length === 1 ? '1 meal planned' : `${meals.length} meals planned`

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl border bg-card p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft',
        isToday ? 'border-primary/40 ring-2 ring-primary/8' : 'border-border',
      )}
    >
      <div className={cn('flex items-center gap-2 rounded-xl sm:hidden', isMobileExpanded && 'border-b border-border/80 pb-3')}>
        <button
          type="button"
          onClick={onMobileToggle}
          aria-expanded={isMobileExpanded}
          aria-controls={mobileContentId}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-left outline-none transition-colors hover:bg-secondary/45 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">{dayName}</span>
              {isToday && <Badge className="min-h-5 px-2 py-0.5 text-[0.6rem]">Today</Badge>}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {dateLabel} · {mealCountLabel}
            </span>
          </span>
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-transform duration-200 motion-reduce:transition-none',
              isMobileExpanded && 'rotate-180 bg-primary text-primary-foreground',
            )}
            aria-hidden="true"
          >
            <ChevronDown className="size-4" />
          </span>
        </button>
        <DailyNutritionDialog
          dayName={dayName}
          summary={nutritionSummary}
          targets={nutritionTargets}
          isLoading={isNutritionLoading}
          error={nutritionError}
          onRetry={onNutritionRetry}
        />
      </div>

      <div className="hidden items-start justify-between gap-2 border-b border-border/80 pb-3 sm:flex">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">{dayName}</h3>
            {isToday && <Badge className="min-h-5 px-2 py-0.5 text-[0.6rem]">Today</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{dateLabel}</p>
        </div>
        <DailyNutritionDialog
          dayName={dayName}
          summary={nutritionSummary}
          targets={nutritionTargets}
          isLoading={isNutritionLoading}
          error={nutritionError}
          onRetry={onNutritionRetry}
        />
      </div>

      <div
        id={mobileContentId}
        className={cn(
          'mt-3 flex-1 flex-col gap-3 sm:flex',
          isMobileExpanded ? 'page-enter flex' : 'hidden',
        )}
      >
        {MEAL_SECTIONS.map(({ type, icon: Icon }) => {
          const sectionMeals = meals.filter((meal) => (meal.mealType ?? 'dinner') === type)
          const label = MEAL_TYPE_LABELS[type]
          const headingId = `${dayName.toLowerCase()}-${type}`

          return (
            <section key={type} aria-labelledby={headingId} className="rounded-xl border border-border/80 bg-background/55 p-2">
              <div className="flex min-h-8 items-center justify-between gap-2 px-1">
                <h4 id={headingId} className="flex items-center gap-2 text-xs font-semibold tracking-normal text-foreground">
                  <Icon className="size-3.5 text-primary" aria-hidden="true" />
                  {label}
                </h4>
                {sectionMeals.length > 0 && (
                  <span className="text-[0.65rem] font-semibold tabular-nums text-muted-foreground">{sectionMeals.length}</span>
                )}
              </div>

              <div className="mt-1.5 flex flex-col gap-2">
                {sectionMeals.length === 0 ? (
                  <Link
                    to="/search"
                    aria-label={`Add ${label.toLowerCase()} to ${dayName}`}
                    className="group flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-card/65 px-2 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:bg-secondary/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add {label.toLowerCase()}
                  </Link>
                ) : (
                  sectionMeals.map((meal, index) => (
                    <div
                      key={meal.entryId ?? `${meal.mealId}-${type}-${index}`}
                      className="group relative overflow-hidden rounded-lg border border-border bg-card"
                    >
                      <div>
                        <NutritionDialog
                          mealId={meal.mealId}
                          name={meal.name}
                          diets={meal.diets}
                          source={meal.source}
                          image={meal.image}
                          compact
                        />
                        <button
                          type="button"
                          onClick={() => onRemove(meal)}
                          aria-label={`Remove ${meal.name} from ${dayName} ${label.toLowerCase()}`}
                          className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring sm:opacity-70 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </article>
  )
}
