import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck2, ChefHat, Leaf, Plus, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { api, type DailyNutritionSummary, type Meal, type MealPlan, type WeeklyNutritionSummary } from '@/lib/api'
import { getCurrentWeekDays, type WeekDay } from '@/lib/week'
import { DayColumn } from '@/components/meal/day-column'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const CURRENT_WEEK = 1
const WEEKLY_GOAL = 14

interface WeekGridProps {
  weekDays: WeekDay[]
  mealsByDay: Record<string, Meal[]>
  onRemove: (meal: Meal) => void
  nutritionByDay: Record<string, DailyNutritionSummary>
  nutritionTargets?: WeeklyNutritionSummary['targets']
  isNutritionLoading: boolean
  nutritionError: string | null
  onNutritionRetry: () => void
}

function WeekGrid({
  weekDays,
  mealsByDay,
  onRemove,
  nutritionByDay,
  nutritionTargets,
  isNutritionLoading,
  nutritionError,
  onNutritionRetry,
}: WeekGridProps) {
  const [expandedDay, setExpandedDay] = useState<WeekDay['dayName'] | null>(null)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {weekDays.map(({ dayName, dateLabel, isToday }, index) => (
        <div key={dayName} className="page-enter h-full" style={{ animationDelay: `${index * 45}ms` }}>
          <DayColumn
            dayName={dayName}
            dateLabel={dateLabel}
            isToday={isToday}
            meals={mealsByDay[dayName]}
            onRemove={onRemove}
            nutritionSummary={nutritionByDay[dayName]}
            nutritionTargets={nutritionTargets}
            isNutritionLoading={isNutritionLoading}
            nutritionError={nutritionError}
            onNutritionRetry={onNutritionRetry}
            isMobileExpanded={expandedDay === dayName}
            onMobileToggle={() => setExpandedDay((current) => (current === dayName ? null : dayName))}
          />
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [nutritionSummary, setNutritionSummary] = useState<WeeklyNutritionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNutritionLoading, setIsNutritionLoading] = useState(true)
  const [nutritionError, setNutritionError] = useState<string | null>(null)
  const weekDays = useMemo(() => getCurrentWeekDays(), [])

  const refreshNutritionSummary = useCallback(async () => {
    if (!user) return
    setIsNutritionLoading(true)
    setNutritionError(null)
    try {
      setNutritionSummary(await api.getNutritionSummary(user._id, CURRENT_WEEK))
    } catch (error) {
      setNutritionError(error instanceof Error ? error.message : 'Could not calculate daily nutrition')
    } finally {
      setIsNutritionLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    setIsLoading(true)
    api
      .getMealPlans(user._id)
      .then((plans) => setMealPlan(plans.find((plan) => plan.week === CURRENT_WEEK) ?? null))
      .finally(() => setIsLoading(false))
  }, [user])

  useEffect(() => {
    void refreshNutritionSummary()
  }, [refreshNutritionSummary])

  const mealsByDay = useMemo(() => {
    const grouped: Record<string, Meal[]> = {}
    for (const day of weekDays) grouped[day.dayName] = []
    for (const meal of mealPlan?.meals ?? []) {
      const day = meal.day && grouped[meal.day] ? meal.day : weekDays[0].dayName
      grouped[day].push(meal)
    }
    return grouped
  }, [mealPlan, weekDays])

  const nutritionByDay = useMemo(
    () => Object.fromEntries((nutritionSummary?.days ?? []).map((day) => [day.day, day])),
    [nutritionSummary],
  )

  async function handleRemove(meal: Meal) {
    if (!mealPlan) return
    const previous = mealPlan
    setMealPlan({
      ...mealPlan,
      meals: mealPlan.meals.filter((savedMeal) =>
        meal.entryId ? savedMeal.entryId !== meal.entryId : savedMeal.mealId !== meal.mealId,
      ),
    })
    try {
      const updatedPlan = await api.removeMeal(mealPlan._id, meal)
      setMealPlan(updatedPlan)
      await refreshNutritionSummary()
    } catch {
      setMealPlan(previous)
      toast.error('Could not remove that meal — please try again.')
    }
  }

  const totalMeals = mealPlan?.meals.length ?? 0
  const activeDays = Object.values(mealsByDay).filter((meals) => meals.length > 0).length
  const progress = Math.min(100, Math.round((totalMeals / WEEKLY_GOAL) * 100))
  const dateRange = `${weekDays[0].dateLabel} – ${weekDays[weekDays.length - 1].dateLabel}`

  return (
    <div className="page-enter flex flex-col gap-7 sm:gap-9">
      <section className="surface-grid relative overflow-hidden rounded-[1.75rem] bg-primary px-6 py-7 text-primary-foreground shadow-soft sm:px-9 sm:py-9 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-8 lg:px-11 lg:py-10">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-[#6ee7b7]/12 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 max-w-2xl">
          <p className="eyebrow text-white/65">Your next seven days · {dateRange}</p>
          <h1 className="mt-3 max-w-xl text-balance text-4xl leading-[1.06] tracking-[-0.05em] sm:text-5xl lg:text-[3.4rem]">
            Make this week feel easy.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/72 sm:text-base">
            Plan a little now, then spend less time deciding what to eat when the week gets busy.
          </p>
          <Button asChild size="lg" className="mt-7 bg-white text-primary shadow-lg hover:bg-white/90 hover:text-primary">
            <Link to="/search">
              <Plus className="size-4" />
              Add a meal
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="relative z-10 mt-8 rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-sm lg:mt-0">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="eyebrow text-white/60">Weekly rhythm</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading ? '—' : `${totalMeals} meals`}</p>
              <p className="mt-1 text-xs text-white/62">A flexible goal of {WEEKLY_GOAL}</p>
            </div>
            <div
              className="relative flex size-24 shrink-0 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#ffffff ${progress}%, rgb(255 255 255 / 0.16) ${progress}% 100%)` }}
              role="img"
              aria-label={`${progress}% of the weekly meal goal planned`}
            >
              <div className="flex size-[74px] flex-col items-center justify-center rounded-full bg-[#116c4c]">
                <span className="text-2xl font-semibold">{progress}%</span>
                <span className="text-[0.62rem] text-white/60">planned</span>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label={`${activeDays} of 7 days have meals planned`}>
            {weekDays.map((day) => {
              const hasMeals = mealsByDay[day.dayName]?.length > 0
              return (
                <div key={day.dayName} className="text-center">
                  <span className={`mx-auto block h-1.5 rounded-full ${hasMeals ? 'bg-white' : 'bg-white/18'}`} />
                  <span className="mt-1.5 block text-[0.6rem] font-medium text-white/55">{day.dayName.slice(0, 1)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="week-overview-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-primary">At a glance</p>
            <h2 id="week-overview-title" className="mt-1.5 text-2xl sm:text-3xl">Your weekly plan</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalMeals > 0 ? `${activeDays} active day${activeDays === 1 ? '' : 's'} this week` : 'A fresh week, ready when you are'}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: CalendarCheck2, value: isLoading ? '—' : totalMeals, label: 'Meals planned' },
            { icon: Leaf, value: isLoading ? '—' : activeDays, label: 'Days covered' },
            { icon: SlidersHorizontal, value: user?.preferences.length ?? 0, label: 'Diet filters' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xl font-semibold leading-none tabular-nums">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {totalMeals === 0 && (
              <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-dashed border-primary/25 bg-secondary/35 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-card">
                    <ChefHat className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base">Your week is a blank plate</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Choose a day and meal time below, or discover a recipe first.</p>
                  </div>
                </div>
                <Button asChild className="shrink-0">
                  <Link to="/search">Discover meals</Link>
                </Button>
              </div>
            )}
            <WeekGrid
              weekDays={weekDays}
              mealsByDay={mealsByDay}
              onRemove={handleRemove}
              nutritionByDay={nutritionByDay}
              nutritionTargets={nutritionSummary?.targets}
              isNutritionLoading={isNutritionLoading}
              nutritionError={nutritionError}
              onNutritionRetry={refreshNutritionSummary}
            />
          </>
        )}
      </section>
    </div>
  )
}
