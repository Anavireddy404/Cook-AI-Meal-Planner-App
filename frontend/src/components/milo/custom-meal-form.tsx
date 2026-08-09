import { useState, type FormEvent } from 'react'
import { ChefHat, LoaderCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, type User } from '@/lib/api'
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '@/lib/meal-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface CustomMealFormProps {
  user: User
}

export function CustomMealForm({ user }: CustomMealFormProps) {
  const [name, setName] = useState('')
  const [day, setDay] = useState('Monday')
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [calories, setCalories] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function saveMeal(event: FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await api.addCustomMeal(user._id, {
        name,
        day,
        mealType,
        description,
        ingredients: ingredients.split(',').map((item) => item.trim()).filter(Boolean),
        estimatedCalories: calories ? Number(calories) : undefined,
        diets: user.preferences,
      })
      toast.success(`${name} added to ${day}`)
      setName('')
      setDescription('')
      setIngredients('')
      setCalories('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your meal')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={saveMeal} className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card sm:p-7">
        <div className="flex items-center gap-3 border-b border-border pb-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary"><ChefHat className="size-5" /></span>
          <div><h2 className="text-xl">Add your own meal</h2><p className="mt-0.5 text-xs text-muted-foreground">Save a personal recipe directly into this week.</p></div>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="custom-name">Meal name</Label><Input id="custom-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Mom’s lentil soup" className="mt-2" required /></div>
          <div><Label htmlFor="custom-day">Day</Label><Select value={day} onValueChange={setDay}><SelectTrigger id="custom-day" className="mt-2 h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{DAYS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="custom-type">Meal time</Label><Select value={mealType} onValueChange={(value) => setMealType(value as MealType)}><SelectTrigger id="custom-type" className="mt-2 h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{MEAL_TYPES.map((type) => <SelectItem key={type} value={type}>{MEAL_TYPE_LABELS[type]}</SelectItem>)}</SelectContent></Select></div>
          <div className="sm:col-span-2"><Label htmlFor="custom-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="custom-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} className="mt-2" placeholder="A quick, cozy soup with lemon and herbs." /></div>
          <div><Label htmlFor="custom-ingredients">Ingredients <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="custom-ingredients" value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="lentils, carrots, lemon" className="mt-2" /><p className="mt-1.5 text-xs text-muted-foreground">Separate ingredients with commas.</p></div>
          <div><Label htmlFor="custom-calories">Estimated calories <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="custom-calories" type="number" min="1" max="2500" value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="420" className="mt-2" /></div>
        </div>
        <Button type="submit" disabled={isSaving} className="mt-6 w-full sm:w-auto">
          {isSaving ? <><LoaderCircle className="size-4 animate-spin" />Saving meal</> : <><Plus className="size-4" />Add to meal plan</>}
        </Button>
      </form>
      <aside className="rounded-[1.5rem] bg-secondary/70 p-6">
        <ChefHat className="size-5 text-primary" />
        <h2 className="mt-4 text-lg">Your meals, your way</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Custom meals appear beside discovered and Milo-created meals in your weekly plan.</p>
      </aside>
    </div>
  )
}
