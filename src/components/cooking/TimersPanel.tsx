import { useState } from 'react'
import { Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { getRecipeById } from '../../data/recipes'
import { formatClock, isRunning, timeLeft, type KitchenTimer } from '../../lib/timers'
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
  onStartPreset: (minutes: number) => void
  onStartStepTimer: () => void
  onToggle: (id: string) => void
  onReset: (id: string) => void
  onRemove: (id: string) => void
}

/** One ticket: label and clock, then a row of 56 px controls. A finished timer becomes the loud accent row. */
function TimerRow({
  timer,
  now,
  recipeId,
  onToggle,
  onReset,
  onRemove,
}: {
  timer: KitchenTimer
  now: number
  recipeId: string
  onToggle: (id: string) => void
  onReset: (id: string) => void
  onRemove: (id: string) => void
}) {
  const running = isRunning(timer)
  const otherRecipe = timer.recipeId && timer.recipeId !== recipeId ? getRecipeById(timer.recipeId)?.title : undefined
  const tone = timer.done ? 'relative isolate bg-accent! text-accent-ink' : running ? 'border-l-4! border-l-accent!' : ''
  const labelTone = timer.done ? 'text-accent-ink!' : ''
  return (
    <li className={`ticket flex flex-col gap-2 px-3 py-2 ${tone}`}>
      {timer.done ? (
        // The 1 s pulse is a darkening wash behind the text, so the words keep their contrast on every frame.
        <span aria-hidden="true" className="absolute inset-0 -z-10 animate-[live-pulse_1s_var(--ease-out)_infinite] bg-ink/30" />
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Label className={`block truncate ${labelTone}`}>{timer.label}</Label>
          {otherRecipe ? <Label className={`block truncate ${labelTone}`}>{otherRecipe}</Label> : null}
        </div>
        <p role="timer" className={`shrink-0 ${timer.done ? 'text-lg font-extrabold' : 'font-mono text-2xl font-semibold tabular-nums'}`}>
          {timer.done ? 'Time’s up' : formatClock(timeLeft(timer, now))}
        </p>
      </div>
      {timer.done ? (
        <Button onClick={() => onRemove(timer.id)} aria-label={`Dismiss ${timer.label}`} className="min-h-14! w-full">
          Dismiss
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onToggle(timer.id)}
            aria-label={`${running ? 'Pause' : 'Resume'} ${timer.label}`}
            className="min-h-14! flex-1 px-2!"
          >
            {running ? <Pause className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" /> : <Play className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />}
            <span>{running ? 'Pause' : 'Resume'}</span>
          </Button>
          <Button variant="secondary" size="lg" onClick={() => onReset(timer.id)} aria-label={`Reset ${timer.label}`} className="min-h-14! flex-1 px-2!">
            <RotateCcw className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>Reset</span>
          </Button>
          <Button variant="secondary" size="lg" onClick={() => onRemove(timer.id)} aria-label={`Remove ${timer.label}`} className="min-h-14! flex-1 px-2!">
            <Trash2 className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>Remove</span>
          </Button>
        </div>
      )}
    </li>
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
  onStartPreset,
  onStartStepTimer,
  onToggle,
  onReset,
  onRemove,
}: TimersPanelProps) {
  const [open, setOpen] = useState(false)
  const rows = timers.filter((t) => !(stepChipVisible && isRunning(t) && t.recipeId === recipeId && t.stepNumber === stepNumber))
  const runningCount = rows.filter(isRunning).length
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
              onStartPreset(minutes)
            }}
            className="px-2!">
            {minutes} min<span className="sr-only"> timer</span>
          </Button>
        ))}
      </div>
    </div>
  )
  return (
    <section aria-label="Timers">
      <Ticket
        header={
          <>
            <Label as="h2">Timers</Label>
            <Label>{runningCount > 0 ? `${runningCount} running` : rows.length > 0 ? 'Paused' : 'None'}</Label>
          </>
        }
        bodyClassName="flex flex-col gap-3 p-2 sm:p-3"
      >
        {rows.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {rows.map((timer) => (
              <TimerRow key={timer.id} timer={timer} now={now} recipeId={recipeId} onToggle={onToggle} onReset={onReset} onRemove={onRemove} />
            ))}
          </ul>
        ) : null}
        {timers.length === 0 ? (
          <>
            <p className="px-1 text-base text-ink-2">
              <span className="font-bold text-ink">No timers running.</span> Pick a time, or say “timer for 5 minutes”.
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
      </Ticket>
    </section>
  )
}
