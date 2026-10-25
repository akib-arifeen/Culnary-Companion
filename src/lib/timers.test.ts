import { describe, it, expect } from 'vitest'
import {
  createTimer,
  isRunning,
  timeLeft,
  pauseTimer,
  resumeTimer,
  toggleTimer,
  resetTimer,
  settleTimer,
  formatClock,
  formatSpokenDuration,
  parseTimerMinutes,
} from './timers'

const T0 = 1_000_000
const MIN = 60_000
const make = (o: Partial<Parameters<typeof createTimer>[0]> = {}) =>
  createTimer({ id: 't1', label: 'Simmer', minutes: 2, now: T0, ...o })

describe('createTimer', () => {
  it('starts running by default', () => {
    const t = make()
    expect(t.id).toBe('t1')
    expect(t.label).toBe('Simmer')
    expect(t.durationMs).toBe(2 * MIN)
    expect(t.endsAt).toBe(T0 + 2 * MIN)
    expect(t.pausedRemainingMs).toBe(0)
    expect(t.done).toBe(false)
    expect(isRunning(t)).toBe(true)
  })

  it('autoStart false -> paused with full duration', () => {
    const t = make({ autoStart: false })
    expect(t.endsAt).toBeNull()
    expect(t.pausedRemainingMs).toBe(2 * MIN)
    expect(t.done).toBe(false)
    expect(isRunning(t)).toBe(false)
  })

  it('autoStart true is the same as the default', () => {
    expect(make({ autoStart: true })).toEqual(make())
  })

  it('keeps the step number and supports fractional minutes', () => {
    expect(make({ stepNumber: 3 }).stepNumber).toBe(3)
    expect(make({ minutes: 0.5 }).durationMs).toBe(30_000)
  })

  it('copies recipeId when given', () => {
    expect(make({ recipeId: 'r1' }).recipeId).toBe('r1')
    expect(make({ recipeId: 'r1', stepNumber: 2 })).toMatchObject({ recipeId: 'r1', stepNumber: 2 })
  })

  it('omits the recipeId key when not given', () => {
    expect('recipeId' in make()).toBe(false)
    expect(Object.keys(make())).not.toContain('recipeId')
  })

  it('recipeId survives pause, resume, reset and settle', () => {
    const t = make({ recipeId: 'r1' })
    expect(pauseTimer(t, T0 + 1000).recipeId).toBe('r1')
    expect(resumeTimer(pauseTimer(t, T0 + 1000), T0 + 2000).recipeId).toBe('r1')
    expect(resetTimer(t).recipeId).toBe('r1')
    expect(settleTimer(t, T0 + 5 * MIN).recipeId).toBe('r1')
  })
})

describe('timeLeft', () => {
  it('running: endsAt - now', () => {
    const t = make()
    expect(timeLeft(t, T0)).toBe(2 * MIN)
    expect(timeLeft(t, T0 + 30_000)).toBe(90_000)
  })

  it('never negative once the end has passed', () => {
    const t = make()
    expect(timeLeft(t, T0 + 2 * MIN)).toBe(0)
    expect(timeLeft(t, T0 + 10 * MIN)).toBe(0)
  })

  it('paused: pausedRemainingMs regardless of now', () => {
    const t = make({ autoStart: false })
    expect(timeLeft(t, T0)).toBe(2 * MIN)
    expect(timeLeft(t, T0 + 99 * MIN)).toBe(2 * MIN)
  })

  it('done: 0', () => {
    const t = settleTimer(make(), T0 + 3 * MIN)
    expect(timeLeft(t, T0 + 3 * MIN)).toBe(0)
    expect(timeLeft(t, T0)).toBe(0)
  })
})

describe('pauseTimer / resumeTimer', () => {
  it('pause stores the remaining time', () => {
    const p = pauseTimer(make(), T0 + 30_000)
    expect(p.endsAt).toBeNull()
    expect(p.pausedRemainingMs).toBe(90_000)
    expect(p.done).toBe(false)
    expect(isRunning(p)).toBe(false)
    expect(timeLeft(p, T0 + 999_999)).toBe(90_000)
  })

  it('pause does not mutate the input', () => {
    const t = make()
    const copy = { ...t }
    pauseTimer(t, T0 + 1000)
    expect(t).toEqual(copy)
  })

  it('pause on a paused or done timer returns the same object', () => {
    const paused = make({ autoStart: false })
    expect(pauseTimer(paused, T0 + 5)).toBe(paused)
    const done = settleTimer(make(), T0 + 5 * MIN)
    expect(pauseTimer(done, T0 + 6 * MIN)).toBe(done)
  })

  it('pause then resume later preserves the remaining time', () => {
    const p = pauseTimer(make(), T0 + 30_000)
    const r = resumeTimer(p, T0 + 500_000)
    expect(isRunning(r)).toBe(true)
    expect(r.endsAt).toBe(T0 + 500_000 + 90_000)
    expect(timeLeft(r, T0 + 500_000)).toBe(90_000)
    expect(timeLeft(r, T0 + 500_000 + 10_000)).toBe(80_000)
  })

  it('resume on a running or done timer returns the same object', () => {
    const running = make()
    expect(resumeTimer(running, T0 + 1)).toBe(running)
    const done = settleTimer(make(), T0 + 5 * MIN)
    expect(resumeTimer(done, T0 + 6 * MIN)).toBe(done)
  })
})

describe('toggleTimer', () => {
  it('running -> paused', () => {
    const p = toggleTimer(make(), T0 + 20_000)
    expect(isRunning(p)).toBe(false)
    expect(p.pausedRemainingMs).toBe(100_000)
  })

  it('paused -> running from the remaining time', () => {
    const p = make({ autoStart: false })
    const r = toggleTimer(p, T0 + 7000)
    expect(isRunning(r)).toBe(true)
    expect(r.endsAt).toBe(T0 + 7000 + 2 * MIN)
  })

  it('done -> restarts from the full duration, running', () => {
    const done = settleTimer(make(), T0 + 3 * MIN)
    expect(done.done).toBe(true)
    const again = toggleTimer(done, T0 + 4 * MIN)
    expect(again.done).toBe(false)
    expect(isRunning(again)).toBe(true)
    expect(again.endsAt).toBe(T0 + 4 * MIN + 2 * MIN)
    expect(timeLeft(again, T0 + 4 * MIN)).toBe(2 * MIN)
  })
})

describe('resetTimer', () => {
  it('goes back to full duration, paused, not done', () => {
    const r = resetTimer(pauseTimer(make(), T0 + 30_000))
    expect(r.endsAt).toBeNull()
    expect(r.pausedRemainingMs).toBe(2 * MIN)
    expect(r.done).toBe(false)
    expect(isRunning(r)).toBe(false)
  })

  it('also resets a running and a done timer', () => {
    const fromRunning = resetTimer(make())
    expect(fromRunning.endsAt).toBeNull()
    expect(timeLeft(fromRunning, T0 + 123)).toBe(2 * MIN)
    const fromDone = resetTimer(settleTimer(make(), T0 + 5 * MIN))
    expect(fromDone.done).toBe(false)
    expect(fromDone.pausedRemainingMs).toBe(2 * MIN)
  })

  it('keeps identity fields', () => {
    const r = resetTimer(make({ stepNumber: 4 }))
    expect(r.id).toBe('t1')
    expect(r.label).toBe('Simmer')
    expect(r.stepNumber).toBe(4)
    expect(r.durationMs).toBe(2 * MIN)
  })
})

describe('settleTimer', () => {
  it('marks done exactly at endsAt', () => {
    const t = make()
    const s = settleTimer(t, T0 + 2 * MIN)
    expect(s.done).toBe(true)
    expect(s.endsAt).toBeNull()
    expect(s.pausedRemainingMs).toBe(0)
    expect(isRunning(s)).toBe(false)
  })

  it('one ms before the end it returns the same object', () => {
    const t = make()
    expect(settleTimer(t, T0 + 2 * MIN - 1)).toBe(t)
  })

  it('long after the end is done too', () => {
    expect(settleTimer(make(), T0 + 60 * MIN).done).toBe(true)
  })

  it('paused or done timers return the same object', () => {
    const paused = make({ autoStart: false })
    expect(settleTimer(paused, T0 + 99 * MIN)).toBe(paused)
    const done = settleTimer(make(), T0 + 5 * MIN)
    expect(settleTimer(done, T0 + 6 * MIN)).toBe(done)
  })
})

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [1, '0:01'],
    [999, '0:01'],
    [1000, '0:01'],
    [1001, '0:02'],
    [59_000, '0:59'],
    [59_001, '1:00'],
    [61_000, '1:01'],
    [245_000, '4:05'],
    [720_000, '12:00'],
    [3_599_000, '59:59'],
    [3_600_000, '1:00:00'],
    [3_723_000, '1:02:03'],
    [-1, '0:00'],
    [-5000, '0:00'],
  ])('%i ms -> %s', (ms, text) => {
    expect(formatClock(ms)).toBe(text)
  })
})

describe('formatSpokenDuration', () => {
  it.each([
    [420_000, '7 minutes'],
    [60_000, '1 minute'],
    [120_000, '2 minutes'],
    [90_000, '1 minute 30 seconds'],
    [45_000, '45 seconds'],
    [1000, '1 second'],
    [3_900_000, '1 hour 5 minutes'],
    [3_600_000, '1 hour'],
    [7_200_000, '2 hours'],
  ])('%i ms -> %s', (ms, text) => {
    expect(formatSpokenDuration(ms)).toBe(text)
  })

  it('rounds up to whole seconds', () => {
    expect(formatSpokenDuration(44_001)).toBe('45 seconds')
    expect(formatSpokenDuration(1)).toBe('1 second')
  })
})

describe('parseTimerMinutes', () => {
  it('accepts whole minutes in the timer range', () => {
    expect(parseTimerMinutes('7')).toEqual({ minutes: 7 })
    expect(parseTimerMinutes(' 1 ')).toEqual({ minutes: 1 })
    expect(parseTimerMinutes('180')).toEqual({ minutes: 180 })
  })

  it('rejects empty, fractional, negative, non-numeric and out-of-range input with a sentence', () => {
    for (const value of ['', '  ', '0', '181', '2.5', '-3', 'seven', '7 min']) {
      const result = parseTimerMinutes(value)
      expect('error' in result, value).toBe(true)
      if ('error' in result) expect(result.error.length).toBeGreaterThan(10)
    }
  })

  it('names the accepted range in the out-of-range message', () => {
    const result = parseTimerMinutes('181')
    expect('error' in result && result.error).toMatch(/1 to 180/)
  })
})
