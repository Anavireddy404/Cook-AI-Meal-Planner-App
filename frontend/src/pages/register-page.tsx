import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, HeartPulse, LoaderCircle, LockKeyhole, Ruler, Scale, UserRound } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { AuthLayout } from '@/components/layout/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DIET_OPTIONS } from '@/lib/diets'
import type { WeightUnit } from '@/lib/api'
import { cn } from '@/lib/utils'

const AGE_OPTIONS = Array.from({ length: 108 }, (_, index) => index + 13)
const FEET_OPTIONS = Array.from({ length: 6 }, (_, index) => index + 3)
const INCH_OPTIONS = Array.from({ length: 12 }, (_, index) => index)

function weightOptions(unit: WeightUnit) {
  const min = unit === 'kg' ? 25 : 55
  const max = unit === 'kg' ? 350 : 772
  return Array.from({ length: max - min + 1 }, (_, index) => index + min)
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [preferences, setPreferences] = useState<string[]>([])
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [heightFeet, setHeightFeet] = useState('')
  const [heightInches, setHeightInches] = useState('')
  const [step, setStep] = useState<'credentials' | 'profile'>('credentials')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleDiet(diet: string) {
    setPreferences((current) =>
      current.includes(diet) ? current.filter((item) => item !== diet) : [...current, diet],
    )
  }

  function changeWeightUnit(nextUnit: WeightUnit) {
    if (nextUnit === weightUnit) return
    setWeight((current) => {
      if (!current) return ''
      const converted = nextUnit === 'lb'
        ? Math.round(Number(current) * 2.20462)
        : Math.round(Number(current) / 2.20462)
      const min = nextUnit === 'kg' ? 25 : 55
      const max = nextUnit === 'kg' ? 350 : 772
      return String(Math.min(max, Math.max(min, converted)))
    })
    setWeightUnit(nextUnit)
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (step === 'credentials') {
      if (username.trim().length < 3 || username.trim().length > 30) {
        setError('Choose a username between 3 and 30 characters.')
        return
      }
      if (password.length < 8) {
        setError('Use at least 8 characters for your password.')
        return
      }
      setStep('profile')
      return
    }

    if (!age || !weight || !heightFeet || !heightInches) {
      setError('Choose your age, weight, and height to continue.')
      return
    }
    setIsSubmitting(true)
    try {
      await register(username, password, preferences, {
        age: Number(age),
        weight: { value: Number(weight), unit: weightUnit },
        height: { feet: Number(heightFeet), inches: Number(heightInches) },
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <p className="eyebrow text-primary">Create your account</p>
      <h2 className="mt-2 text-3xl tracking-[-0.04em] sm:text-4xl">Start planning simply</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Create a personal login and a simple planning profile.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2" aria-label={`Registration step ${step === 'credentials' ? 1 : 2} of 2`}>
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs font-semibold text-secondary-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {step === 'profile' ? <Check className="size-3.5" aria-hidden="true" /> : '1'}
          </span>
          Account
        </div>
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold',
          step === 'profile' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground',
        )}>
          <span className={cn(
            'flex size-6 items-center justify-center rounded-full',
            step === 'profile' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground',
          )}>2</span>
          Food profile
        </div>
      </div>

      <form onSubmit={createAccount} className="mt-7 flex flex-col gap-5">
        {step === 'credentials' ? (
          <div className="page-enter grid gap-5">
            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="username"
                    autoComplete="username"
                    minLength={3}
                    maxLength={30}
                    placeholder="Choose your username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="pl-11"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'register-error username-help' : 'username-help'}
                    required
                  />
                </div>
                <p id="username-help" className="text-xs text-muted-foreground">Use 3–30 characters. You will use this to sign in.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    maxLength={72}
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-11"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'register-error password-help' : 'password-help'}
                    required
                  />
                </div>
                <p id="password-help" className="text-xs text-muted-foreground">Use at least 8 characters.</p>
              </div>
            </div>

            {error && (
              <p id="register-error" role="alert" className="rounded-xl border border-destructive/20 bg-destructive/8 px-3.5 py-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full">
              Save and continue
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="page-enter grid gap-5">
            <fieldset className="rounded-2xl border border-primary/15 bg-secondary/35 p-4">
              <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
                <HeartPulse className="size-4 text-primary" aria-hidden="true" />
                Your planning profile
              </legend>
              <div className="mt-4 grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="age">Age</Label>
                  <Select name="age" value={age} onValueChange={setAge} required>
                    <SelectTrigger id="age" className="h-12 w-full bg-card px-3">
                      <SelectValue placeholder="Select age" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {AGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>{option} years</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="weight">Weight</Label>
                  <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
                    <Select name="weight" value={weight} onValueChange={setWeight} required>
                      <SelectTrigger id="weight" className="h-12 w-full bg-card px-3">
                        <Scale className="size-4 text-primary" aria-hidden="true" />
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {weightOptions(weightUnit).map((option) => (
                          <SelectItem key={option} value={String(option)}>{option} {weightUnit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={weightUnit} onValueChange={(value) => changeWeightUnit(value as WeightUnit)}>
                      <SelectTrigger aria-label="Weight unit" className="h-12 w-full bg-card px-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label>Height</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select name="heightFeet" value={heightFeet} onValueChange={setHeightFeet} required>
                      <SelectTrigger aria-label="Height in feet" className="h-12 w-full bg-card px-3">
                        <Ruler className="size-4 text-primary" aria-hidden="true" />
                        <SelectValue placeholder="Feet" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {FEET_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>{option} ft</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select name="heightInches" value={heightInches} onValueChange={setHeightInches} required>
                      <SelectTrigger aria-label="Additional height in inches" className="h-12 w-full bg-card px-3">
                        <SelectValue placeholder="Inches" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {INCH_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>{option} in</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-foreground">
                Dietary preferences <span className="font-normal text-muted-foreground">(optional)</span>
              </legend>
              <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                {DIET_OPTIONS.map((diet) => {
                  const selected = preferences.includes(diet)
                  return (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => toggleDiet(diet)}
                      aria-pressed={selected}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
                      )}
                    >
                      {selected && <Check className="size-3.5" aria-hidden="true" />}
                      {diet}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {error && (
              <p id="register-error" role="alert" className="rounded-xl border border-destructive/20 bg-destructive/8 px-3.5 py-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <Button type="button" size="lg" variant="outline" onClick={() => { setError(null); setStep('credentials') }} aria-label="Back to username and password">
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <><LoaderCircle className="size-4 animate-spin" />Creating account</> : <>Create account<ArrowRight className="size-4" /></>}
              </Button>
            </div>
          </div>
        )}
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="inline-flex min-h-10 items-center font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
