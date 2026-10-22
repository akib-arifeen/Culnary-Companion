import { Clock, Pause, Play, RotateCcw } from 'lucide-react'
import { formatClock, isRunning, timeLeft, type KitchenTimer } from '../../lib/timers'
import { BTN_PRIMARY } from './ui'

interface StepViewProps {
  stepNumber: number
  stepCount: number
  instruction: string
  /** Minutes, when the step suggests a timer. */
  duration?: number
  /** The timer started for this step, if any. */
  stepTimer?: KitchenTimer
  now: number
  nextInstruction?: string
  onStartTimer: () => void
  onToggleTimer: (id: string) => void
}

function instructionSize(length: number): string {
  if (length <= 60) return 'text-[clamp(1.5rem,min(8.5vw,8.5vh),3.5rem)]'
  if (length <= 120) return 'text-[clamp(1.3rem,min(6.8vw,7vh),2.75rem)]'
  return 'text-[clamp(1.15rem,min(5.8vw,5.6vh),2.25rem)]'
}

function StepTimerChip({ timer, now, onToggle }: { timer: KitchenTimer; now: number; onToggle: (id: string) => void }) {
  const clock = formatClock(timeLeft(timer, now))
  const running = isRunning(timer)
  const label = timer.done
    ? 'Step timer finished, restart it'
    : running
      ? `Pause step timer, ${clock} left`
      : `Resume step timer, ${clock} left`
  const Icon = timer.done ? RotateCcw : running ? Pause : Play
  return (
    <button
      type="button"
      onClick={() => onToggle(timer.id)}
      aria-label={label}
      className={`inline-flex h-12 cursor-pointer items-center gap-3 rounded-xl bg-white px-4 ring-1 ring-stone-300 hover:bg-stone-50`}
    >
      <Icon className="size-5 text-brand-700" aria-hidden="true" />
      {timer.done ? (
        <span className="text-xl font-semibold text-rose-700">Time’s up</span>
      ) : (
        <span className="text-2xl font-semibold tabular-nums text-stone-900">{clock}</span>
      )}
      {!timer.done && !running ? <span className="text-sm text-stone-600">Paused</span> : null}
    </button>
  )
}

export default function StepView({
  stepNumber,
  stepCount,
  instruction,
  duration,
  stepTimer,
  now,
  nextInstruction,
  onStartTimer,
  onToggleTimer,
}: StepViewProps) {
  return (
    <section aria-label={`Step ${stepNumber}`} className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-5 py-3 sm:px-8 sm:py-5">
      <p className="shrink-0 text-sm font-semibold uppercase tracking-wide text-brand-700">
        Step {stepNumber} of {stepCount}
      </p>
      <div
        tabIndex={0}
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg py-2`}
      >
        <p className={`my-auto font-semibold leading-snug text-balance text-stone-900 ${instructionSize(instruction.length)}`}>
          {instruction}
        </p>
      </div>
      <div className="shrink-0 pt-2">
        {duration ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-sm font-medium text-brand-900">
              <Clock className="size-4" aria-hidden="true" />
              About {duration} min
            </span>
            {stepTimer ? (
              <StepTimerChip timer={stepTimer} now={now} onToggle={onToggleTimer} />
            ) : (
              <button type="button" onClick={onStartTimer} className={`${BTN_PRIMARY} h-12`}>
                Start {duration}-min timer
              </button>
            )}
          </div>
        ) : null}
        {nextInstruction ? (
          <p className="mt-2 truncate text-base text-stone-600 short:hidden">
            <span className="font-medium">Up next:</span> {nextInstruction}
          </p>
        ) : null}
      </div>
    </section>
  )
}
