import { isRunning, timeLeft, type KitchenTimer } from '../../lib/timers'

/**
 * Which timer a hands-free command ("pause", "resume", "cancel"...) acts on. `timers` is oldest first.
 * Timers are app-wide, so each picker prefers the current recipe's timers and falls back to the others.
 */

function preferring(
  timers: readonly KitchenTimer[],
  recipeId: string,
  pick: (list: readonly KitchenTimer[]) => KitchenTimer | undefined,
): KitchenTimer | undefined {
  return pick(timers.filter((timer) => timer.recipeId === recipeId)) ?? pick(timers)
}

function soonest(list: readonly KitchenTimer[], now: number): KitchenTimer | undefined {
  let best: KitchenTimer | undefined
  for (const timer of list) {
    if (isRunning(timer) && (!best || timeLeft(timer, now) < timeLeft(best, now))) best = timer
  }
  return best
}

function paused(list: readonly KitchenTimer[]): KitchenTimer | undefined {
  for (let i = list.length - 1; i >= 0; i--) {
    if (!list[i].done && list[i].endsAt === null) return list[i]
  }
  return undefined
}

export function runningSoonest(timers: readonly KitchenTimer[], now: number, recipeId: string): KitchenTimer | undefined {
  return preferring(timers, recipeId, (list) => soonest(list, now))
}

/** Most recently created paused (not running, not done) timer. */
export function latestPaused(timers: readonly KitchenTimer[], recipeId: string): KitchenTimer | undefined {
  return preferring(timers, recipeId, paused)
}

export function toggleTarget(timers: readonly KitchenTimer[], now: number, recipeId: string): KitchenTimer | undefined {
  return preferring(timers, recipeId, (list) => soonest(list, now) ?? paused(list))
}

/** Most recently created timer. */
export function resetTarget(timers: readonly KitchenTimer[], recipeId: string): KitchenTimer | undefined {
  return preferring(timers, recipeId, (list) => list[list.length - 1])
}

/** A finished timer first, else the running one with the least time left. */
export function cancelTarget(timers: readonly KitchenTimer[], now: number, recipeId: string): KitchenTimer | undefined {
  return preferring(timers, recipeId, (list) => list.find((timer) => timer.done) ?? soonest(list, now))
}
