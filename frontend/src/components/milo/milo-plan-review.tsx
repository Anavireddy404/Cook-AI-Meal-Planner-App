import { Check, Clock3, LoaderCircle, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import type { GeneratedPlan } from '@/lib/api'
import { MEAL_TYPE_LABELS } from '@/lib/meal-types'
import { miloSlotKey } from '@/lib/milo'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface MiloPlanReviewProps {
  plan: GeneratedPlan
  selectedSlots: Set<string>
  isWorking: boolean
  isApproving: boolean
  onToggleMeal: (slot: string) => void
  onRegenerate: () => void
  onClear: () => void
  onApprove: () => void
}

export function MiloPlanReview({
  plan,
  selectedSlots,
  isWorking,
  isApproving,
  onToggleMeal,
  onRegenerate,
  onClear,
  onApprove,
}: MiloPlanReviewProps) {
  return (
    <section className="min-w-0 rounded-[1.5rem] border border-border bg-card shadow-card" aria-labelledby="milo-plan-title">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="secondary"><Sparkles className="size-3" />Draft only</Badge>
            <h2 id="milo-plan-title" className="mt-3 text-xl sm:text-2xl">{plan.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{plan.overview}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRegenerate} disabled={isWorking || isApproving}>
              <RotateCcw className={cn('size-4', isWorking && 'animate-spin')} />
              Regenerate
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onClear} disabled={isWorking || isApproving} aria-label="Clear Milo draft">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-h-[720px] space-y-3 overflow-y-auto p-3 sm:p-4">
        {plan.days.map((day) => {
          const selectedForDay = day.meals.filter((meal) => selectedSlots.has(miloSlotKey(day.day, meal.mealType))).length
          return (
            <article key={day.day} className="rounded-2xl border border-border bg-background/60 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base">{day.day}</h3>
                <span className="text-xs font-medium text-muted-foreground">{selectedForDay}/3 selected</span>
              </div>
              <div className="mt-3 grid gap-2.5">
                {day.meals.map((meal) => {
                  const slot = miloSlotKey(day.day, meal.mealType)
                  const selected = selectedSlots.has(slot)
                  return (
                    <label
                      key={slot}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                        selected ? 'border-primary/25 bg-secondary/55' : 'border-border bg-card hover:border-primary/20',
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => onToggleMeal(slot)}
                        aria-label={`Select ${meal.name} for ${day.day} ${meal.mealType}`}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{MEAL_TYPE_LABELS[meal.mealType]}</Badge>
                          <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                            <Clock3 className="size-3" />About {meal.estimatedCalories} cal
                          </span>
                        </span>
                        <span className="mt-1.5 block text-sm font-semibold text-foreground">{meal.name}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{meal.description}</span>
                        <span className="mt-2 block text-[0.68rem] leading-relaxed text-muted-foreground">{meal.ingredients.join(' · ')}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>

      <div className="border-t border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{selectedSlots.size} of 21 meals selected</p>
            <p className="text-xs text-muted-foreground">Nothing is added until you confirm.</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" disabled={selectedSlots.size === 0 || isWorking || isApproving}>
                <Check className="size-4" />Review approval
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add {selectedSlots.size} meals to your plan?</DialogTitle>
                <DialogDescription>
                  Milo will add only the selected meals. This is the step that changes your real weekly plan.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                You can cancel, close this window, or change the selected meals before approving.
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="button" onClick={onApprove} disabled={isApproving}>
                  {isApproving ? <><LoaderCircle className="size-4 animate-spin" />Adding meals</> : <><Check className="size-4" />Yes, add meals</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  )
}
