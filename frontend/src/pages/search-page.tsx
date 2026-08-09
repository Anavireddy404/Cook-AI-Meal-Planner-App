import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, LoaderCircle, Search, SearchX, SlidersHorizontal, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { api, type RecipeSearchResult } from '@/lib/api'
import { MEAL_TYPE_LABELS, type MealType } from '@/lib/meal-types'
import type { DAY_NAMES } from '@/lib/week'
import { MealCard } from '@/components/meal/meal-card'
import { AddToMealPlanDialog } from '@/components/meal/add-to-meal-plan-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const CURRENT_WEEK = 1
const QUICK_SEARCHES = ['High-protein dinner', 'Vegetarian bowls', 'Quick pasta', 'Fresh salads']

interface ResultsGridProps {
  results: RecipeSearchResult[]
  onAdd: (result: RecipeSearchResult, day: (typeof DAY_NAMES)[number], mealType: MealType) => void
}

function ResultsGrid({ results, onAdd }: ResultsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {results.map((result, index) => (
        <div key={`${result.source}:${result.id}`} className="page-enter" style={{ animationDelay: `${index * 35}ms` }}>
          <MealCard
            mealId={result.id}
            name={result.title}
            image={result.image}
            source={result.source}
            footer={<AddToMealPlanDialog onSelect={(day, mealType) => onAdd(result, day, mealType)} />}
          />
        </div>
      ))}
    </div>
  )
}

export function SearchPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RecipeSearchResult[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mealplanId, setMealplanId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    api
      .getMealPlans(user._id)
      .then((plans) => setMealplanId(plans.find((plan) => plan.week === CURRENT_WEEK)?._id))
      .catch(() => {})
  }, [user])

  async function runSearch(term: string) {
    if (!user || !term.trim()) return
    setIsSearching(true)
    setError(null)
    try {
      const data = await api.searchMeals(user._id, term.trim())
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults(null)
    } finally {
      setIsSearching(false)
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    void runSearch(query)
  }

  function handleQuickSearch(term: string) {
    setQuery(term)
    void runSearch(term)
  }

  async function handleAdd(
    result: RecipeSearchResult,
    day: (typeof DAY_NAMES)[number],
    mealType: MealType,
  ) {
    if (!user) return
    try {
      const plan = await api.addMeal({
        userId: user._id,
        week: CURRENT_WEEK,
        mealplanId,
        meal: {
          mealId: result.id,
          name: result.title,
          image: result.image,
          diets: [],
          day,
          mealType,
          source: result.source,
        },
      })
      setMealplanId(plan._id)
      toast.success(`Added “${result.title}” to ${day} ${MEAL_TYPE_LABELS[mealType].toLowerCase()}`)
    } catch {
      toast.error('Could not add that meal — please try again.')
    }
  }

  return (
    <div className="page-enter flex flex-col gap-7 sm:gap-9">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-secondary/75 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-primary/8 blur-2xl" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="eyebrow flex items-center gap-2 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
            Discover something good
          </p>
          <h1 className="mt-3 text-balance text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl">What are you craving?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Search real recipes, then choose the day and meal time for each favorite.
          </p>

          <form onSubmit={handleSearch} className="mt-7 grid gap-2 rounded-2xl bg-card p-2 shadow-soft sm:grid-cols-[minmax(0,1fr)_auto]" role="search">
            <label htmlFor="meal-search" className="sr-only">Search recipes</label>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="meal-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try chicken tacos or veggie stir fry"
                className="border-transparent bg-transparent pl-12 shadow-none hover:border-transparent focus-visible:border-primary/20"
                autoComplete="off"
              />
            </div>
            <Button type="submit" size="lg" className="min-w-32" disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Searching
                </>
              ) : (
                <>
                  Search
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Quick searches">
            <span className="text-xs font-medium text-muted-foreground">Try:</span>
            {QUICK_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleQuickSearch(term)}
                disabled={isSearching}
                className="min-h-10 rounded-full border border-primary/12 bg-card px-3.5 text-xs font-semibold text-secondary-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {user && user.preferences.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
          <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium text-foreground">Filtering for your profile</span>
          {user.preferences.slice(0, 3).map((preference) => (
            <Badge key={preference} variant="secondary" className="capitalize">
              {preference}
            </Badge>
          ))}
          {user.preferences.length > 3 && <Badge variant="outline">+{user.preferences.length - 3}</Badge>}
          <Link to="/preferences" className="ml-auto min-h-10 content-center rounded-lg px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">
            Edit filters
          </Link>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive">
          {error}. Check your connection and try again.
        </div>
      )}

      {isSearching && (
        <section aria-label="Searching for recipes" aria-busy="true">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-8 w-44 rounded-lg" />
            <Skeleton className="h-5 w-20 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-[340px] rounded-2xl" />
            ))}
          </div>
        </section>
      )}

      {results !== null && results.length === 0 && !isSearching && (
        <div className="flex flex-col items-center rounded-[1.5rem] border border-dashed border-primary/25 bg-card px-5 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <SearchX className="size-7" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl">No recipes matched</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Try a broader search term, or adjust the filters in your food profile.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/preferences">Review food profile</Link>
          </Button>
        </div>
      )}

      {results && results.length > 0 && !isSearching && (
        <section aria-labelledby="search-results-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-primary">Fresh ideas</p>
              <h2 id="search-results-title" className="mt-1.5 text-2xl sm:text-3xl">Recipe results</h2>
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">{results.length} found</p>
          </div>
          <ResultsGrid results={results} onAdd={handleAdd} />
        </section>
      )}
    </div>
  )
}
