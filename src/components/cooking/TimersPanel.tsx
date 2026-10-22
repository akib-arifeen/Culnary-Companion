import { Pause, Play, RotateCcw, Trash2 } from 'lucide-react'
import { getRecipeById } from '../../data/recipes'
import { formatClock, isRunning, timeLeft, type KitchenTimer } from '../../lib/timers'
import { Button, Label, Ticket } from '../ui/primitives'

const PRESETS = [1, 3, 5, 10, 15, 30] as const

interface TimersPanelProps {
  timers: readonly KitchenTimer[]
  now: number
  /** Timers of other recipes get that recipe's title in their header. */
  recipeId: string
  /** The current step's stated minutes, if it has one and no timer exists for it yet. */
  stepDuration?: number
  stepNumber: number
  onStartPreset: (minutes: number) => void
  onStartStepTimer: () => void
  onToggle: (id: string) => void
  onReset: (id: string) => void
  onRemove: (id: string) => void
}

function TimerTicket({
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
  const left = timeLeft(timer, now)
  const running = isRunning(timer)
  const fraction = timer.durationMs > 0 ? left / timer.durationMs : 0
  const otherRecipe = timer.recipeId && timer.recipeId !== recipeId ? getRecipeById(timer.recipeId)?.title : undefined
  // A finished timer is the loudest thing on screen until dismissed; a running one carries the accent edge.
  const tone = timer.done
    ? 'isolate bg-accent! text-accent-ink'
    : running
      ? 'border-l-4! border-l-accent!'
      : ''
  const labelTone = timer.done ? 'text-accent-ink!' : ''
  return (
    <Ticket
      as="li"
      className={tone}
      bodyClassName="flex flex-col gap-3 p-4"
      header={
        <>
          <Label className={`min-w-0 truncate ${labelTone}`}>{timer.label}</Label>
          {otherRecipe ? <Label className={`min-w-0 truncate ${labelTone}`}>{otherRecipe}</Label> : null}
        </>
      }
    >
      {timer.done ? (
        // The 1 s pulse is a darkening wash behind the text, so the words keep their contrast on every frame.
        <span aria-hidden="true" className="absolute inset-0 -z-10 animate-[live-pulse_1s_var(--ease-out)_infinite] bg-ink/30" />
      ) : null}
      <p role="timer" className={timer.done ? 'text-title font-extrabold' : 'font-mono text-clock font-semibold tabular-nums'}>
        {timer.done ? 'Time’s up' : formatClock(left)}
      </p>
      {timer.done ? null : (
        <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-rule">
          <div className={`h-full ${running ? 'bg-accent' : 'bg-ink-2'}`} style={{ width: `${Math.round(fraction * 100)}%` }} />
        </div>
      )}
      <div className="flex items-center gap-2">
        {timer.done ? (
          <Button size="lg" onClick={() => onRemove(timer.id)} aria-label={`Dismiss ${timer.label}`}>
            Dismiss
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="lg" onClick={() => onToggle(timer.id)} aria-label={`${running ? 'Pause' : 'Resume'} ${timer.label}`}>
              {running ? <Pause className="size-5" strokeWidth={2} aria-hidden="true" /> : <Play className="size-5" strokeWidth={2} aria-hidden="true" />}
              {running ? 'Pause' : 'Resume'}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => onReset(timer.id)} aria-label={`Reset ${timer.label}`} className="size-14 px-0!">
              <RotateCcw className="size-5" strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => onRemove(timer.id)} aria-label={`Remove ${timer.label}`} className="ml-auto size-14 px-0!">
              <Trash2 className="size-5" strokeWidth={2} aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </Ticket>
  )
}

/** Running and finished timers as tickets, plus the preset buttons. Used as the Timers tab and as the rail section. */
export default function TimersPanel({
  timers,
  now,
  recipeId,
  stepDuration,
  stepNumber,
  onStartPreset,
  onStartStepTimer,
  onToggle,
  onReset,
  onRemove,
}: TimersPanelProps) {
  return (
    <section aria-label="Timers" className="flex flex-col gap-3">
      {timers.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {timers.map((timer) => (
            <TimerTicket key={timer.id} timer={timer} now={now} recipeId={recipeId} onToggle={onToggle} onReset={onReset} onRemove={onRemove} />
          ))}
        </ul>
      ) : null}
      <Ticket bodyClassName="flex flex-col gap-3 p-3 sm:p-4">
        <Label as="h2">{timers.length === 0 ? 'Timers' : 'Add a timer'}</Label>
        {timers.length === 0 ? (
          <p className="text-base text-ink-2">
            <span className="font-bold text-ink">No timers running.</span> Pick a time, or say “timer for 5 minutes”.
          </p>
        ) : null}
        {stepDuration ? (
          <Button variant="secondary" size="lg" onClick={onStartStepTimer}>
            Start step {stepNumber} timer ({stepDuration} min)
          </Button>
        ) : null}
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((minutes) => (
            <Button
              key={minutes}
              variant="secondary"
              size="lg"
              onClick={() => onStartPreset(minutes)}
              aria-label={`Start ${minutes} minute timer`}
              className="px-2!"
            >
              {minutes} min
            </Button>
          ))}
        </div>
      </Ticket>
    </section>
  )
}
