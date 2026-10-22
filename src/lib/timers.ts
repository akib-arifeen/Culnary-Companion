/**
 * Timestamp-based kitchen timers. A running timer stores when it ends, not how many
 * ticks are left, so it stays correct when the tab is throttled in the background.
 * All functions are pure: they return a new object (or the same object when nothing changed).
 */

export interface KitchenTimer {
  readonly id: string
  readonly label: string
  readonly durationMs: number
  /** Epoch ms when a RUNNING timer reaches zero; null when paused or done. */
  readonly endsAt: number | null
  /** Remaining ms while paused. Ignored while running. 0 when done. */
  readonly pausedRemainingMs: number
  readonly done: boolean
  /** 1-based recipe step this timer belongs to, if any. */
  readonly stepNumber?: number
  /** Recipe this timer belongs to, if any. Timers are app-wide, so (recipeId, stepNumber) identifies a step timer. */
  readonly recipeId?: string
}

/** minutes must be > 0. autoStart defaults to true. */
export function createTimer(opts: {
  id: string
  label: string
  minutes: number
  now: number
  stepNumber?: number
  recipeId?: string
  autoStart?: boolean
}): KitchenTimer {
  const durationMs = opts.minutes * 60_000
  const running = opts.autoStart ?? true
  return {
    id: opts.id,
    label: opts.label,
    durationMs,
    endsAt: running ? opts.now + durationMs : null,
    pausedRemainingMs: running ? 0 : durationMs,
    done: false,
    ...(opts.stepNumber !== undefined ? { stepNumber: opts.stepNumber } : {}),
    ...(opts.recipeId !== undefined ? { recipeId: opts.recipeId } : {}),
  }
}

export function isRunning(timer: KitchenTimer): boolean {
  return timer.endsAt !== null && !timer.done
}

/** Remaining ms, never negative. Done -> 0. */
export function timeLeft(timer: KitchenTimer, now: number): number {
  if (timer.done) return 0
  if (timer.endsAt !== null) return Math.max(0, timer.endsAt - now)
  return Math.max(0, timer.pausedRemainingMs)
}

/** Running -> paused with the current remaining time. Paused/done -> same object. */
export function pauseTimer(timer: KitchenTimer, now: number): KitchenTimer {
  if (!isRunning(timer)) return timer
  return { ...timer, endsAt: null, pausedRemainingMs: timeLeft(timer, now) }
}

/** Paused (not done) -> running from its remaining time. Running/done -> same object. */
export function resumeTimer(timer: KitchenTimer, now: number): KitchenTimer {
  if (timer.done || timer.endsAt !== null) return timer
  return { ...timer, endsAt: now + timer.pausedRemainingMs, pausedRemainingMs: 0 }
}

/** Running -> pause; paused -> resume; done -> restart from full duration, running. */
export function toggleTimer(timer: KitchenTimer, now: number): KitchenTimer {
  if (timer.done) return { ...timer, endsAt: now + timer.durationMs, pausedRemainingMs: 0, done: false }
  return isRunning(timer) ? pauseTimer(timer, now) : resumeTimer(timer, now)
}

/** Back to full duration, paused, not done. */
export function resetTimer(timer: KitchenTimer): KitchenTimer {
  return { ...timer, endsAt: null, pausedRemainingMs: timer.durationMs, done: false }
}

/** If running and endsAt <= now -> done (endsAt null, pausedRemainingMs 0). Otherwise same object. */
export function settleTimer(timer: KitchenTimer, now: number): KitchenTimer {
  if (!isRunning(timer) || (timer.endsAt as number) > now) return timer
  return { ...timer, endsAt: null, pausedRemainingMs: 0, done: true }
}

/**
 * Clock text, rounding UP to whole seconds (a timer shows 0:01 until it is really done).
 * < 1 h: "m:ss" ("4:05", "12:00", "0:00"); >= 1 h: "h:mm:ss" ("1:02:03"). Negative -> "0:00".
 */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Spoken form for TTS: "7 minutes", "1 minute", "1 minute 30 seconds", "45 seconds", "1 hour 5 minutes". Rounds up to seconds. */
export function formatSpokenDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`)
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`)
  if (s > 0) parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`)
  return parts.length > 0 ? parts.join(' ') : '0 seconds'
}
