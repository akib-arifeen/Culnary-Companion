import { getRecipeById } from '../../data/recipes'
import { Pause, Play, RotateCcw, Timer as TimerIcon, Trash2 } from 'lucide-react'
import { formatClock, isRunning, timeLeft, type KitchenTimer } from '../../lib/timers'
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from './ui'

const PRESETS = [1, 3, 5, 10, 15, 30] as const

interface TimersViewProps {
  timers: readonly KitchenTimer[]
  now: number
  /** Timers of other recipes get that recipe's title as a subtitle. */
  recipeId: string
  /** The current step's suggested minutes, if it has one. */
  stepDuration?: number
  onStartPreset: (minutes: number) => void
  onStartStepTimer: () => void
  onToggle: (id: string) => void
  onReset: (id: string) => void
  onRemove: (id: string) => void
}

function TimerCard({
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
  const iconButton = `${BTN_SECONDARY} size-11 shrink-0`
  return (
    <li className={`${CARD} flex flex-col gap-2 p-4 ${timer.done ? 'ring-rose-300' : ''}`}>
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-stone-700">{timer.label}</p>
        {otherRecipe ? <p className="truncate text-sm text-stone-600">{otherRecipe}</p> : null}
      </div>
      {timer.done ? (
        <p role="timer" className="text-4xl font-semibold text-rose-700 short:text-3xl">
          Time’s up
        </p>
      ) : (
        <p role="timer" className="text-5xl font-semibold tabular-nums text-stone-900 short:text-4xl">
          {formatClock(left)}
        </p>
      )}
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full rounded-full ${timer.done ? 'bg-rose-600' : 'bg-brand-500'}`} style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
      <div className="mt-1 flex items-center gap-2">
        {timer.done ? (
          <button type="button" onClick={() => onRemove(timer.id)} aria-label={`Dismiss ${timer.label}`} className={`${BTN_PRIMARY} h-11 px-4`}>
            Dismiss
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onToggle(timer.id)}
              aria-label={`${running ? 'Pause' : 'Resume'} ${timer.label}`}
              className={`${BTN_SECONDARY} h-11 px-4`}
            >
              {running ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
              {running ? 'Pause' : 'Resume'}
            </button>
            <button type="button" onClick={() => onReset(timer.id)} aria-label={`Reset ${timer.label}`} className={iconButton}>
              <RotateCcw className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onRemove(timer.id)} aria-label={`Remove ${timer.label}`} className={`${iconButton} ml-auto`}>
              <Trash2 className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export default function TimersView({
  timers,
  now,
  recipeId,
  stepDuration,
  onStartPreset,
  onStartStepTimer,
  onToggle,
  onReset,
  onRemove,
}: TimersViewProps) {
  const presets = (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((minutes) => (
        <button
          key={minutes}
          type="button"
          onClick={() => onStartPreset(minutes)}
          aria-label={`Start ${minutes} minute timer`}
          className={`${BTN_SECONDARY} h-11 min-w-16 px-4`}
        >
          {minutes} min
        </button>
      ))}
    </div>
  )
  return (
    <div className="h-full overflow-y-auto px-5 py-4 sm:px-8">
      <div className="mx-auto max-w-4xl">
        {timers.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-2">
            <TimerIcon className="size-8 text-brand-700" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold text-stone-900">No timers running</h2>
              <p className="mt-1 text-base text-stone-600">Pick a time, or say “timer for 5 minutes”.</p>
            </div>
            {presets}
            {stepDuration ? (
              <button type="button" onClick={onStartStepTimer} className={`${BTN_PRIMARY} h-12`}>
                Start step timer ({stepDuration} min)
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2">
              {timers.map((timer) => (
                <TimerCard key={timer.id} timer={timer} now={now} recipeId={recipeId} onToggle={onToggle} onReset={onReset} onRemove={onRemove} />
              ))}
            </ul>
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-600">Add a timer</h2>
              {presets}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
