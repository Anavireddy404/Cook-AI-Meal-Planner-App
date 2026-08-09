import type { ReactNode } from 'react'
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { CalendarDays, Search, SlidersHorizontal, Sprout } from 'lucide-react'
import { BrandMark } from '@/components/layout/brand-mark'

const BENEFITS = [
  { icon: Search, label: 'Find recipes that fit your diet' },
  { icon: CalendarDays, label: 'See your whole week at a glance' },
  { icon: SlidersHorizontal, label: 'Keep your food preferences in sync' },
]

gsap.registerPlugin(useGSAP)

export function AuthLayout({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-auth-reveal]', {
        opacity: 0,
        y: 14,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power3.out',
      })
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef} className="min-h-dvh bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="surface-grid relative min-h-[330px] overflow-hidden bg-primary px-6 py-7 text-primary-foreground sm:min-h-[390px] sm:px-10 sm:py-10 lg:flex lg:min-h-dvh lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-24 size-80 rounded-full bg-[#6ee7b7]/15 blur-3xl" aria-hidden="true" />

        <div data-auth-reveal>
          <BrandMark inverse />
        </div>

        <div className="relative mt-14 max-w-xl lg:my-auto" data-auth-reveal>
          <div className="mb-5 hidden size-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20 sm:flex">
            <Sprout className="size-6" aria-hidden="true" />
          </div>
          <p className="eyebrow text-white/65">Healthy weeks start here</p>
          <h1 className="mt-3 max-w-lg text-balance text-4xl font-semibold leading-[1.06] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            Eat well without overthinking it.
          </h1>
          <p className="mt-5 hidden max-w-md text-base leading-relaxed text-white/74 sm:block sm:text-lg">
            Turn recipe ideas into a calm, flexible weekly plan built around the way you actually eat.
          </p>
        </div>

        <div className="mt-9 hidden max-w-xl grid-cols-3 gap-3 lg:grid" data-auth-reveal>
          {BENEFITS.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-sm">
              <Icon className="size-5 text-white/85" aria-hidden="true" />
              <p className="mt-3 text-xs font-medium leading-relaxed text-white/72">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative flex items-center justify-center px-4 pb-10 sm:px-8 lg:px-12 lg:py-12">
        <div className="-mt-10 w-full max-w-[460px] rounded-[1.75rem] border border-border bg-card p-6 shadow-soft sm:p-9 lg:mt-0" data-auth-reveal>
          {children}
        </div>
      </section>
    </div>
  )
}
