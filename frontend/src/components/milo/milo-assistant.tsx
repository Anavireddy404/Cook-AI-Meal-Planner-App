import { useState, type FormEvent } from 'react'
import { Bot, Check, LoaderCircle, Send, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, type GeneratedPlan, type MiloMessage, type User } from '@/lib/api'
import { DIET_OPTIONS } from '@/lib/diets'
import { miloSlotKey } from '@/lib/milo'
import { cn } from '@/lib/utils'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { MiloPlanReview } from '@/components/milo/milo-plan-review'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const WELCOME_MESSAGE = 'Hi, I’m **Milo**. Tell me what kind of week you want. You can mention your schedule, budget, cooking time, favorite foods, nutrition goals, or anything you want to avoid.'
const SUGGESTIONS = [
  'Quick high-protein meals with simple ingredients',
  'An affordable vegetarian week with leftovers for lunch',
  'Family-friendly meals with easy dinners on busy nights',
]

function createMessage(role: MiloMessage['role'], content: string): MiloMessage {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    role,
    content,
  }
}

function assistantContent(message: string, questions: string[]) {
  if (!questions.length) return message
  return `${message}\n\n${questions.map((question, index) => `${index + 1}. ${question}`).join('\n')}`
}

function allPlanSlots(plan: GeneratedPlan) {
  return new Set(plan.days.flatMap((day) => day.meals.map((meal) => miloSlotKey(day.day, meal.mealType))))
}

interface MiloAssistantProps {
  user: User
}

export function MiloAssistant({ user }: MiloAssistantProps) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<MiloMessage[]>([createMessage('assistant', WELCOME_MESSAGE)])
  const [input, setInput] = useState('')
  const [diets, setDiets] = useState<string[]>(user.preferences)
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [isWorking, setIsWorking] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  function toggleDiet(diet: string) {
    setDiets((current) => current.includes(diet) ? current.filter((item) => item !== diet) : [...current, diet])
  }

  function toggleMeal(slot: string) {
    setSelectedSlots((current) => {
      const next = new Set(current)
      if (next.has(slot)) next.delete(slot)
      else next.add(slot)
      return next
    })
  }

  async function requestMilo(text: string, action: 'chat' | 'revise' | 'regenerate') {
    if (isWorking || isApproving) return
    const userMessage = createMessage('user', text)
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setIsWorking(true)

    try {
      const reply = await api.chatWithMilo({
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        diets,
        action,
        draftId,
      })
      setMessages((current) => [...current, createMessage('assistant', assistantContent(reply.message, reply.questions))])
      if (reply.plan && reply.draftId) {
        setPlan(reply.plan)
        setDraftId(reply.draftId)
        setSelectedSlots(allPlanSlots(reply.plan))
        toast.success(action === 'regenerate' ? 'Milo created a fresh draft' : 'Milo’s draft is ready to review')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Milo could not respond')
    } finally {
      setIsWorking(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isWorking) return
    await requestMilo(text, plan ? 'revise' : 'chat')
  }

  async function regeneratePlan() {
    if (!draftId || isWorking) return
    await requestMilo('Please create a different version using the same preferences.', 'regenerate')
  }

  async function clearDraft() {
    if (draftId) {
      await api.clearMiloDraft(draftId).catch(() => null)
    }
    setMessages([createMessage('assistant', WELCOME_MESSAGE)])
    setInput('')
    setPlan(null)
    setDraftId(null)
    setSelectedSlots(new Set())
    toast.success('Milo’s draft was cleared')
  }

  async function approvePlan() {
    if (!draftId || selectedSlots.size === 0) return
    setIsApproving(true)
    try {
      const result = await api.approveMiloDraft(draftId, [...selectedSlots])
      toast.success(`${result.addedCount} meals added to your week`)
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add Milo’s meals')
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div className={cn('grid items-start gap-5', plan ? '2xl:grid-cols-[minmax(380px,0.78fr)_minmax(620px,1.22fr)]' : 'xl:grid-cols-[minmax(0,1fr)_340px]')}>
      <section className="flex min-h-[680px] min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-card" aria-label="Chat with Milo">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:p-5">
          <span className="relative flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Bot className="size-5" />
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-400" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg">Milo</h2>
            <p className="text-xs text-muted-foreground">Your meal planning assistant</p>
          </div>
          <Badge variant="secondary" className="ml-auto">Local preview</Badge>
          <Button type="button" variant="ghost" size="icon-sm" onClick={clearDraft} disabled={messages.length === 1 || isWorking || isApproving} aria-label="Clear Milo conversation">
            <Trash2 className="size-4" />
          </Button>
        </div>

        <Conversation className="h-[440px] min-h-0 flex-1">
          <ConversationContent className="gap-5 p-4 sm:p-5">
            {messages.map((message) => (
              <Message key={message.id} from={message.role} className={message.role === 'assistant' ? 'flex-row items-start gap-2.5' : ''}>
                {message.role === 'assistant' && (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Bot className="size-4" />
                  </span>
                )}
                <MessageContent className={message.role === 'assistant' ? 'max-w-[calc(100%-2.75rem)] rounded-2xl rounded-tl-sm bg-muted px-4 py-3' : 'rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground'}>
                  {message.role === 'assistant'
                    ? <MessageResponse className="text-sm leading-relaxed">{message.content}</MessageResponse>
                    : <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>}
                </MessageContent>
              </Message>
            ))}
            {isWorking && (
              <Message from="assistant" className="flex-row items-start gap-2.5" aria-live="polite">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Bot className="size-4" /></span>
                <MessageContent className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Milo is planning…</span>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton className="bottom-3" aria-label="Scroll to latest Milo message" />
        </Conversation>

        {messages.length === 1 && (
          <div className="flex gap-2 overflow-x-auto border-t border-border px-4 py-3" aria-label="Milo prompt suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => requestMilo(suggestion, 'chat')} disabled={isWorking} className="min-h-10 shrink-0 rounded-full border border-border bg-background px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring">
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-border bg-background/70 p-3 sm:p-4">
          <label htmlFor="milo-message" className="sr-only">Message Milo</label>
          <div className="rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-ring/30">
            <Textarea
              id="milo-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={800}
              rows={3}
              className="min-h-20 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
              placeholder={plan ? 'Ask Milo to change something in this draft…' : 'Tell Milo what you want to eat this week…'}
              disabled={isWorking || isApproving}
            />
            <div className="flex items-center justify-between gap-3 px-1 pb-1">
              <span className="text-[0.68rem] text-muted-foreground">{input.length}/800</span>
              <Button type="submit" size="sm" disabled={!input.trim() || isWorking || isApproving}>
                {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send
              </Button>
            </div>
          </div>
        </form>
      </section>

      {plan ? (
        <MiloPlanReview
          plan={plan}
          selectedSlots={selectedSlots}
          isWorking={isWorking}
          isApproving={isApproving}
          onToggleMeal={toggleMeal}
          onRegenerate={regeneratePlan}
          onClear={clearDraft}
          onApprove={approvePlan}
        />
      ) : (
        <aside className="space-y-4">
          <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card">
            <Sparkles className="size-5 text-primary" />
            <h2 className="mt-4 text-lg">Food preferences</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Milo starts with your saved profile. Change these for this conversation.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DIET_OPTIONS.map((diet) => {
                const selected = diets.includes(diet)
                return (
                  <button key={diet} type="button" aria-pressed={selected} onClick={() => toggleDiet(diet)} className={cn('min-h-9 rounded-full border px-3 text-[0.7rem] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/30')}>
                    {selected && <Check className="mr-1 inline size-3" />}{diet}
                  </button>
                )
              })}
            </div>
          </section>
          <section className="rounded-[1.5rem] bg-secondary/70 p-5">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="mt-4 text-lg">You stay in control</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Milo can ask questions and create drafts. It cannot add a meal until you review the plan and approve it.</p>
            <p className="mt-4 border-t border-primary/10 pt-4 text-xs leading-relaxed text-muted-foreground">Nutrition and calorie details are estimates. Check ingredients carefully for allergies or medical dietary needs.</p>
          </section>
        </aside>
      )}
    </div>
  )
}
