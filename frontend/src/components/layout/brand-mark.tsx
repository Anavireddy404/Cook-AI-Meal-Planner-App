import { Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandMarkProps {
  inverse?: boolean
  compact?: boolean
  className?: string
}

export function BrandMark({ inverse = false, compact = false, className }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)} aria-label="Cook meal planner">
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm',
          inverse ? 'bg-white/15 text-white ring-1 ring-white/20' : 'bg-primary text-primary-foreground',
        )}
        aria-hidden="true"
      >
        <Leaf className="size-5" strokeWidth={2.2} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn('text-xl font-bold tracking-[-0.04em]', inverse ? 'text-white' : 'text-foreground')}>
          cook<span className={inverse ? 'text-white/60' : 'text-primary'}>.</span>
        </span>
        {!compact && (
          <span className={cn('mt-1 text-[0.68rem] font-medium tracking-wide', inverse ? 'text-white/65' : 'text-muted-foreground')}>
            weekly meal planner
          </span>
        )}
      </span>
    </span>
  )
}
