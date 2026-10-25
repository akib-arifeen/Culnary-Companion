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
  onResetTimer: (id: string) => void
  /** Drop the giant numeral to win back height (a small phone with the camera preview up). "STEP n OF N" still names the step. */
  hideNumeral?: boolean
  /** Names of the ingredients this step uses (from ingredientsInStep); the line is hidden when empty. */
  uses?: readonly string[]
}

function StepTimerButton({ timer, now, onToggle }: { timer: KitchenTimer; now: number; onToggle: (id: string) => void }) {
  const clock = formatClock(timeLeft(timer, now))
  const running = isRunning(timer)
  const action = timer.done ? 'Restart step timer' : running ? 'Pause step timer' : 'Resume step timer'
  const Icon = timer.done ? RotateCcw : running ? Pause : Play
  return (
    <button type="button" onClick={() => onToggle(timer.id)} className={buttonClass('secondary', 'lg', 'shrink-0')}>
      <Icon className={`size-5 ${running ? 'text-accent' : ''}`} strokeWidth={2} aria-hidden="true" />
      <span className="text-lg tabular-nums">{timer.done ? 'Time’s up' : clock}</span>
      {!timer.done && !running ? <span className="text-ink-2">Paused</span> : null}
      <span className="sr-only">
        . {action}
        {timer.done ? '' : `, ${clock} left`}
      </span>
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
  onResetTimer,
  hideNumeral = false,
  uses = [],
}: StepTicketProps) {
  const long = instruction.length > LONG_STEP_CHARS
  // A step that times each side ("2–3 minutes per side") says so on the chip; it is still one timer.
  const perSide = /per side/i.test(instruction)
  return (
    <section aria-label={`Step ${stepNumber}`} className="ticket flex h-full min-h-0 flex-col">
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-1 sm:px-8 sm:py-1.5">
        <Label className="text-base! whitespace-nowrap">
          Step {stepNumber} of {stepCount}
        </Label>
        {duration ? (
          stepTimer ? (
            <span className="flex shrink-0 items-center gap-1">
              <StepTimerButton timer={stepTimer} now={now} onToggle={onToggleTimer} />
              {stepTimer.done ? null : (
                <button
                  type="button"
                  onClick={() => onResetTimer(stepTimer.id)}
                  aria-label="Reset step timer"
                  className="grid size-14 shrink-0 cursor-pointer place-items-center rounded-(--radius-control) border-2 border-ink-2 bg-paper text-ink hover:bg-paper-2"
                >
                  <RotateCcw className="size-5" strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            </span>
          ) : (
            <Button variant="secondary" size="lg" onClick={onStartTimer} className="shrink-0 max-sm:px-3 max-sm:text-xs">
              Start {duration}-min timer{perSide ? ' (per side)' : ''}
            </Button>
          )
        ) : null}
      </div>
      <div className="perforation shrink-0" aria-hidden="true" />
      {/* The size container: the step type tokens are in cqi / cqb, so the text fills exactly this box. */}
      <div className="min-h-0 flex-1 [container-type:size]">
        <div key={stepNumber} tabIndex={0} className="step-in flex h-full flex-col overflow-y-auto px-5 py-2 sm:py-4 sm:px-8 short:py-3">
          <div className="my-auto flex flex-col gap-3 short:flex-row short:items-start short:gap-6">
            {hideNumeral ? null : (
              <p aria-hidden="true" className="font-mono text-clock font-semibold tabular-nums text-accent">
                {stepNumber}
              </p>
            )}
            <p className={`max-w-[28ch] font-bold text-ink text-pretty ${long ? 'text-step-s' : 'text-step'}`}>{instruction}</p>
          </div>
        </div>
      </div>
      {uses.length > 0 || nextInstruction ? (
        <div className={`shrink-0 border-t border-rule px-5 py-2 sm:px-8 ${uses.length === 0 ? 'short:hidden' : ''}`}>
          {uses.length > 0 ? (
            <p className="flex items-baseline gap-3">
              <Label className="shrink-0 text-ink!">This step uses</Label>
              <span className="min-w-0 truncate text-lg font-bold text-ink">{uses.join(' · ')}</span>
            </p>
          ) : null}
          {nextInstruction ? (
            <p className={`flex items-baseline gap-3 short:hidden max-[22.5rem]:hidden ${uses.length > 0 ? 'mt-1' : ''}`}>
              <Label className="shrink-0">Up next</Label>
              <span className="min-w-0 truncate text-lg text-ink-2">{nextInstruction}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
