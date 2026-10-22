import { Pause, Play, RotateCcw } from 'lucide-react'
import { formatClock, isRunning, timeLeft, type KitchenTimer } from '../../lib/timers'
import { buttonClass } from '../ui/buttonClass'
import { Button, Label } from '../ui/primitives'

/** DESIGN.md § Typography: a step over this many characters steps down one rung. */
const LONG_STEP_CHARS = 140

interface StepTicketProps {
  stepNumber: number
  stepCount: number
  instruction: string
  /** Minutes, only when the step text states a duration. */
  duration?: number
  /** The timer started for this step, if any. */
  stepTimer?: KitchenTimer
  now: number
  nextInstruction?: string
  onStartTimer: () => void
  onToggleTimer: (id: string) => void
  /** Drop the giant numeral to win back height (a small phone with the camera preview up). "STEP n OF N" still names the step. */
  hideNumeral?: boolean
}

function StepTimerButton({ timer, now, onToggle }: { timer: KitchenTimer; now: number; onToggle: (id: string) => void }) {
  const clock = formatClock(timeLeft(timer, now))
  const running = isRunning(timer)
  const label = timer.done ? 'Step timer finished, restart it' : running ? `Pause step timer, ${clock} left` : `Resume step timer, ${clock} left`
  const Icon = timer.done ? RotateCcw : running ? Pause : Play
  return (
    <button type="button" onClick={() => onToggle(timer.id)} aria-label={label} className={buttonClass('secondary', 'lg', 'shrink-0')}>
      <Icon className={`size-5 ${running ? 'text-accent' : ''}`} strokeWidth={2} aria-hidden="true" />
      <span className="text-lg tabular-nums">{timer.done ? 'Time’s up' : clock}</span>
      {!timer.done && !running ? <span className="text-ink-2">Paused</span> : null}
    </button>
  )
}

/**
 * The hero: one step, called out. Header strip (step n of N + the step's timer), perforation, then a giant
 * mono numeral over the instruction. The body scrolls if the text is long; nothing overlaps the strip.
 */
export default function StepTicket({
  stepNumber,
  stepCount,
  instruction,
  duration,
  stepTimer,
  now,
  nextInstruction,
  onStartTimer,
  onToggleTimer,
  hideNumeral = false,
}: StepTicketProps) {
  const long = instruction.length > LONG_STEP_CHARS
  return (
    <section aria-label={`Step ${stepNumber}`} className="ticket flex h-full min-h-0 flex-col">
      <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
        <Label>
          Step {stepNumber} of {stepCount}
        </Label>
        {duration ? (
          stepTimer ? (
            <StepTimerButton timer={stepTimer} now={now} onToggle={onToggleTimer} />
          ) : (
            <Button variant="secondary" size="lg" onClick={onStartTimer} className="shrink-0">
              Start {duration}-min timer
            </Button>
          )
        ) : null}
      </div>
      <div className="perforation shrink-0" aria-hidden="true" />
      <div key={stepNumber} tabIndex={0} className="step-in flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-8 short:py-3">
        <div className="my-auto flex flex-col gap-3 short:flex-row short:items-start short:gap-6">
          {hideNumeral ? null : (
            <p aria-hidden="true" className="font-mono text-clock font-semibold tabular-nums text-ink-2">
              {stepNumber}
            </p>
          )}
          <p className={`max-w-[28ch] font-bold text-ink text-pretty ${long ? 'text-step-s' : 'text-step short:text-step-s'}`}>{instruction}</p>
        </div>
        {nextInstruction ? (
          // Inside the scroll area: on a small phone the step itself wins the height and this line scrolls instead.
          <p className="mt-4 flex shrink-0 items-baseline gap-3 border-t border-rule pt-3 short:hidden">
            <Label className="shrink-0">Up next</Label>
            <span className="min-w-0 truncate text-lg text-ink-2">{nextInstruction}</span>
          </p>
        ) : null}
      </div>
    </section>
  )
}
