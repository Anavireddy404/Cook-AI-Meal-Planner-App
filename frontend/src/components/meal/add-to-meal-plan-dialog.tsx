import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Coffee, MoonStar, Plus, SunMedium } from 'lucide-react'
import { DAY_NAMES } from '@/lib/week'
import { MEAL_TYPE_LABELS, MEAL_TYPES, type MealType } from '@/lib/meal-types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const MEAL_TYPE_DETAILS = {
  breakfast: { icon: Coffee, description: 'Start the day with it' },
  lunch: { icon: SunMedium, description: 'Plan it for midday' },
  dinner: { icon: MoonStar, description: 'Save it for the evening' },
} satisfies Record<MealType, { icon: typeof Coffee; description: string }>

interface AddToMealPlanDialogProps {
  onSelect: (day: (typeof DAY_NAMES)[number], mealType: MealType) => void
  disabled?: boolean
}

export function AddToMealPlanDialog({ onSelect, disabled }: AddToMealPlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'day' | 'mealType'>('day')
  const [selectedDay, setSelectedDay] = useState<(typeof DAY_NAMES)[number] | null>(null)
  const firstDayRef = useRef<HTMLButtonElement>(null)
  const firstMealTypeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      if (step === 'day') firstDayRef.current?.focus()
      else firstMealTypeRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open, step])

  function resetFlow() {
    setStep('day')
    setSelectedDay(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetFlow()
  }

  function handleDaySelect(day: (typeof DAY_NAMES)[number]) {
    setSelectedDay(day)
    setStep('mealType')
  }

  function handleMealTypeSelect(mealType: MealType) {
    if (!selectedDay) return
    onSelect(selectedDay, mealType)
    setOpen(false)
    resetFlow()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={disabled} className="w-full gap-2">
          <Plus className="size-4" aria-hidden="true" />
          Add to Meal Plan
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-5 rounded-[1.5rem] p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="pr-8">
          <div
            className="mb-1 flex gap-1.5"
            role="progressbar"
            aria-label="Add to meal plan progress"
            aria-valuemin={1}
            aria-valuemax={2}
            aria-valuenow={step === 'day' ? 1 : 2}
            aria-valuetext={`Step ${step === 'day' ? 1 : 2} of 2`}
          >
            <span className="h-1.5 flex-1 rounded-full bg-primary" />
            <span className={`h-1.5 flex-1 rounded-full ${step === 'mealType' ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {step === 'day' ? 'Choose a day' : `Choose a meal for ${selectedDay}`}
          </DialogTitle>
          <DialogDescription>
            {step === 'day'
              ? 'First, select when you want to plan this recipe.'
              : 'Now choose where it belongs in your day.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'day' ? (
          <div className="grid grid-cols-2 gap-2">
            {DAY_NAMES.map((day, index) => (
              <button
                key={day}
                ref={index === 0 ? firstDayRef : undefined}
                type="button"
                onClick={() => handleDaySelect(day)}
                className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-background px-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {day}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {MEAL_TYPES.map((mealType, index) => {
              const { icon: Icon, description } = MEAL_TYPE_DETAILS[mealType]
              return (
                <button
                  key={mealType}
                  ref={index === 0 ? firstMealTypeRef : undefined}
                  type="button"
                  onClick={() => handleMealTypeSelect(mealType)}
                  className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{MEAL_TYPE_LABELS[mealType]}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
                  </span>
                </button>
              )
            })}

            <Button variant="ghost" onClick={() => setStep('day')} className="mt-2">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to days
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
