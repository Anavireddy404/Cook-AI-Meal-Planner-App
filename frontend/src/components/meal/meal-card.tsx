import type { ReactNode } from 'react'
import { Leaf } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { NutritionDialog } from '@/components/meal/nutrition-dialog'
import type { MealSource } from '@/lib/api'
import { cn } from '@/lib/utils'

interface MealCardProps {
  mealId?: number
  name: string
  image?: string
  diets?: string[]
  source?: MealSource
  footer?: ReactNode
  className?: string
}

export function MealCard({ mealId, name, image, diets = [], source, footer, className }: MealCardProps) {
  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft',
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            width={480}
            height={300}
            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-primary/60">
            <Leaf className="size-9" aria-hidden="true" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" aria-hidden="true" />
        {(source === 'spoonacular' || source === 'themealdb') && (
          <Badge className="absolute left-3 top-3 bg-card/92 text-card-foreground shadow-sm backdrop-blur-sm hover:bg-card/92">
            {source === 'themealdb' ? 'TheMealDB' : 'Spoonacular'}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-base leading-snug text-card-foreground">{name}</h3>

        {diets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {diets.slice(0, 3).map((diet) => (
              <Badge key={diet} variant="secondary" className="capitalize">
                {diet}
              </Badge>
            ))}
          </div>
        )}

        {mealId && <NutritionDialog mealId={mealId} name={name} diets={diets} source={source} />}

        {footer && <div className="mt-auto pt-1">{footer}</div>}
      </div>
    </article>
  )
}
