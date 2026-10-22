import type { KitchenTimer } from '../lib/timers'

/**
 * App-wide kitchen timers (provider sits above the router, so timers survive navigation).
 * Implemented in TimerContext.tsx on top of the pure functions in lib/timers.ts.
 */
export interface TimersApi {
  /** Oldest first. Done timers stay until removed, so the UI can show "Done". */
  timers: readonly KitchenTimer[]
  /** Epoch ms; re-rendered ~4x/s only while at least one timer is running. */
  now: number
  /**
   * Creates and starts a timer; returns its id. If a timer with the same recipeId AND stepNumber
   * already exists it is replaced (one timer per recipe step). Timers of other recipes, and timers
   * without a stepNumber, are never replaced. minutes must be 1..180, else no-op returning ''.
   */
  start: (opts: { label: string; minutes: number; stepNumber?: number; recipeId?: string }) => string
  pause: (id: string) => void
  resume: (id: string) => void
  toggle: (id: string) => void
  reset: (id: string) => void
  remove: (id: string) => void
  /**
   * Subscribe to completions (fires once per timer when it reaches zero, also if that happened
   * while the tab was in the background). Returns an unsubscribe function. The provider itself
   * plays the completion chime; subscribers add speech / UI.
   */
  onDone: (listener: (timer: KitchenTimer) => void) => () => void
}
