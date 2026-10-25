import { useRef, useState, type FormEvent } from 'react'
import { Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { getRecipeById } from '../../data/recipes'
import {
  formatClock,
  isRunning,
  MAX_TIMER_MINUTES,
  MIN_TIMER_MINUTES,
  parseTimerMinutes,
  timeLeft,
  type KitchenTimer,
} from '../../lib/timers'
import { Button, Label, Ticket } from '../ui/primitives'

const PRESETS = [1, 3, 5, 10, 15, 30] as const

interface TimersPanelProps {
  timers: readonly KitchenTimer[]
  now: number
  /** Timers of other recipes get that recipe's title under their label. */
  recipeId: string
  /** The current step's stated minutes, if it has one and no timer exists for it yet (tabs layout only). */
  stepDuration?: number
  stepNumber: number
  /**
   * The step ticket (with its own timer chip) is visible next to this panel: a RUNNING timer of the current step
   * is already shown there as the control, so it is not repeated here.
   */
  stepChipVisible: boolean
  /** Presets: the cook tapped a known duration, so the app voice confirms it. */
  onStartMinutes: (minutes: number) => void
  /** Typed durations: the field's polite status is the one confirmation, so this path must not also speak. */
  onStartTypedMinutes: (minutes: number) => void
  onStartStepTimer: () => void
  onToggle: (id: string) => void
  onReset: (id: string) => void
  onRemove: (id: string) => void
}

/** One ticket: label and clock, then a row of 56 px controls. A finished timer is a static accent row, never a pulse. */
function TimerRow({
  timer,
  now,
  name,
  label,
  otherRecipe,
  onToggle,
  onReset,
  onRemove,
}: {
  timer: KitchenTimer
  now: number
  /** Full accessible name: the row's label, its recipe when it belongs elsewhere, and a sequence when labels collide. */
  name: string
  /** Visible label: the timer's own label plus that sequence. */
  label: string
  otherRecipe?: string
  onToggle: (id: string) => void
  onReset: (id: string) => void
  onRemove: (id: string) => void
}) {
  const running = isRunning(timer)
  const tone = timer.done ? 'bg-accent! text-accent-ink' : running ? 'border-l-4! border-l-accent!' : ''
  const labelTone = timer.done ? 'text-accent-ink!' : ''
  return (
    <li className={`ticket flex flex-col gap-2 px-3 py-2 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Label className={`block truncate ${labelTone}`}>{label}</Label>
          {otherRecipe ? <Label className={`block truncate ${labelTone}`}>{otherRecipe}</Label> : null}
        </div>
        <p
          {...(timer.done ? {} : { role: 'timer' })}
          className={`shrink-0 ${timer.done ? 'text-lg font-extrabold' : 'font-mono text-2xl font-semibold tabular-nums'}`}
        >
          {timer.done ? 'Time’s up' : formatClock(timeLeft(timer, now))}
        </p>
      </div>
      {timer.done ? (
        <Button onClick={() => onRemove(timer.id)} aria-label={`Dismiss ${name}`} className="min-h-14! w-full">
          Dismiss
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onToggle(timer.id)}
            aria-label={`${running ? 'Pause' : 'Resume'} ${name}`}
            className="min-h-14! flex-1 px-2!"
          >
            {running ? <Pause className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" /> : <Play className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />}
            <span>{running ? 'Pause' : 'Resume'}</span>
          </Button>
          <Button variant="secondary" size="lg" onClick={() => onReset(timer.id)} aria-label={`Reset ${name}`} className="min-h-14! flex-1 px-2!">
            <RotateCcw className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>Reset</span>
          </Button>
          <Button variant="secondary" size="lg" onClick={() => onRemove(timer.id)} aria-label={`Remove ${name}`} className="min-h-14! flex-1 px-2!">
            <Trash2 className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>Remove</span>
          </Button>
        </div>
      )}
    </li>
  )
}

/**
 * Any whole-minute duration, including the ones no preset covers. Validation and its message live with the field.
 * The confirmation is the field's own polite status; CookingScreen does not speak it again, so a screen reader
 * hears it once. Re-submitting the same duration replaces the status node (a new key), so it is announced again.
 */
function CustomTimer({ onStart }: { onStart: (minutes: number) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<{ text: string; seq: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = parseTimerMinutes(value)
    if ('error' in parsed) {
      setError(parsed.error)
      setStatus(null)
      inputRef.current?.focus()
      return
    }
    setError('')
    setValue('')
    setStatus((previous) => ({
      text: `Timer set for ${parsed.minutes} ${parsed.minutes === 1 ? 'minute' : 'minutes'}.`,
      seq: (previous?.seq ?? 0) + 1,
    }))
    onStart(parsed.minutes)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2 border-t border-rule pt-3">
      <label htmlFor="custom-timer-minutes" className="label-mono text-ink">
        Custom timer
      </label>
      <div className="flex items-center gap-2">
        <input
          id="custom-timer-minutes"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            if (error) setError('')
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby="custom-timer-help custom-timer-error"
          className="min-h-14 w-20 min-w-0 flex-1 rounded-(--radius-control) border-2 border-ink-2 bg-paper px-3 font-mono text-xl font-semibold text-ink"
        />
        <span className="shrink-0 text-base text-ink-2">minutes</span>
        <Button type="submit" variant="secondary" size="lg" className="shrink-0 px-4!">
          Start timer
        </Button>
      </div>
      <p id="custom-timer-help" className="text-sm text-ink-2">
        Whole minutes, {MIN_TIMER_MINUTES} to {MAX_TIMER_MINUTES}.
      </p>
      <p id="custom-timer-error" role="alert" className={error ? 'font-bold text-accent' : 'sr-only'}>
        {error}
      </p>
      <div aria-live="polite" className={status ? 'text-base font-bold text-ink' : 'sr-only'}>
        <p key={status?.seq ?? 0}>{status?.text ?? ''}</p>
      </div>
    </form>
  )
}

/** Timers as a ticket in the rail: the rows, then the presets (inline when there are no timers, behind "+ Add timer" otherwise). */
export default function TimersPanel({
  timers,
  now,
  recipeId,
  stepDuration,
  stepNumber,
  stepChipVisible,
  onStartMinutes,
  onStartTypedMinutes,
  onStartStepTimer,
  onToggle,
  onReset,
  onRemove,
}: TimersPanelProps) {
  const [open, setOpen] = useState(false)
  const rows = timers.filter((t) => !(stepChipVisible && isRunning(t) && t.recipeId === recipeId && t.stepNumber === stepNumber))
  const runningCount = rows.filter(isRunning).length
  const doneCount = rows.filter((timer) => timer.done).length
  const pausedCount = rows.length - runningCount - doneCount
  const state =
    [
      runningCount > 0 ? `${runningCount} running` : null,
      doneCount > 0 ? `${doneCount} finished` : null,
      pausedCount > 0 ? `${pausedCount} paused` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'None'
  const presets = (
    <div className="flex flex-col gap-3">
      {stepDuration ? (
        <Button variant="secondary" size="lg" onClick={onStartStepTimer}>
          Start step {stepNumber} timer ({stepDuration} min)
        </Button>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((minutes) => (
          <Button key={minutes} variant="secondary" size="lg" onClick={() => {
              setOpen(false)
              onStartMinutes(minutes)
            }}
            className="px-2!">
            {minutes} min<span className="sr-only"> timer</span>
          </Button>
        ))}
      </div>
    </div>
  )
  // Equal labels (two "7 min timer"s, or step 3 of two recipes) need distinct accessible names, so the
  // controls still say which row they act on. The sequence is creation order, numbered only when it collides.
  const labelCounts = new Map<string, number>()
  for (const timer of rows) labelCounts.set(timer.label, (labelCounts.get(timer.label) ?? 0) + 1)
  const seen = new Map<string, number>()
  const namedRows = rows.map((timer) => {
    const ordinal = (seen.get(timer.label) ?? 0) + 1
    seen.set(timer.label, ordinal)
    const otherRecipe = timer.recipeId && timer.recipeId !== recipeId ? getRecipeById(timer.recipeId)?.title : undefined
    const sequence = (labelCounts.get(timer.label) ?? 1) > 1 ? ` (${ordinal})` : ''
    return {
      timer,
      label: `${timer.label}${sequence}`,
      otherRecipe,
      name: `${timer.label}${sequence}${otherRecipe ? ` — ${otherRecipe}` : ''}`,
    }
  })
  return (
    <section aria-label="Timers">
      <Ticket
        header={
          <>
            <Label as="h2">Timers</Label>
            <Label>{state}</Label>
          </>
        }
        bodyClassName="flex flex-col gap-3 p-2 sm:p-3"
      >
        {namedRows.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {namedRows.map(({ timer, label, otherRecipe, name }) => (
              <TimerRow
                key={timer.id}
                timer={timer}
                now={now}
                label={label}
                otherRecipe={otherRecipe}
                name={name}
                onToggle={onToggle}
                onReset={onReset}
                onRemove={onRemove}
              />
            ))}
          </ul>
        ) : null}
        {timers.length === 0 ? (
          <>
            <p className="px-1 text-base text-ink-2">
              <span className="font-bold text-ink">No timers running.</span> Pick or type a time, or say “timer for 5 minutes”.
            </p>
            {presets}
          </>
        ) : (
          <>
            <Button variant="secondary" size="lg" aria-expanded={open} onClick={() => setOpen(!open)}>
              <Plus className="size-5" strokeWidth={2} aria-hidden="true" />
              Add timer
            </Button>
            {open ? <div className="pt-1">{presets}</div> : null}
          </>
        )}
        {/* Outside the collapse: the typed field and its confirmation must survive the first timer starting. */}
        <CustomTimer onStart={onStartTypedMinutes} />
      </Ticket>
    </section>
  )
}
