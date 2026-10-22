import { isRunning, timeLeft, type KitchenTimer } from '../../lib/timers'

/** Which timer a hands-free command ("pause", "resume", "cancel"...) acts on. `timers` is oldest first. */

export function runningSoonest(timers: readonly KitchenTimer[], now: number): KitchenTimer | undefined {
  let best: KitchenTimer | undefined
  for (const timer of timers) {
    if (isRunning(timer) && (!best || timeLeft(timer, now) < timeLeft(best, now))) best = timer
  }
  return best
}

/** Most recently created paused (not running, not done) timer. */
export function latestPaused(timers: readonly KitchenTimer[]): KitchenTimer | undefined {
  for (let i = timers.length - 1; i >= 0; i--) {
    if (!timers[i].done && timers[i].endsAt === null) return timers[i]
  }
  return undefined
}

export function toggleTarget(timers: readonly KitchenTimer[], now: number): KitchenTimer | undefined {
  return runningSoonest(timers, now) ?? latestPaused(timers)
}

/** A finished timer first, else the running one with the least time left. */
export function cancelTarget(timers: readonly KitchenTimer[], now: number): KitchenTimer | undefined {
  return timers.find((timer) => timer.done) ?? runningSoonest(timers, now)
}
