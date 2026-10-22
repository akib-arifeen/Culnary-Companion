import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { playChime } from '../lib/chime'
import {
  createTimer,
  isRunning,
  pauseTimer,
  resetTimer,
  resumeTimer,
  settleTimer,
  toggleTimer,
  type KitchenTimer,
} from '../lib/timers'
import type { TimersApi } from './timerContract'

const TimerContext = createContext<TimersApi | null>(null)

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<readonly KitchenTimer[]>([])
  const [now, setNow] = useState(() => Date.now())
  // Mirror of `timers` so operations and ticks read the latest list synchronously and
  // completion side effects run exactly once (never inside a state updater).
  const timersRef = useRef<readonly KitchenTimer[]>([])
  const listenersRef = useRef(new Set<(timer: KitchenTimer) => void>())

  const commit = useCallback((next: readonly KitchenTimer[]) => {
    timersRef.current = next
    setTimers(next)
  }, [])

  /** Settles every timer at time t; fires chime, vibration and listeners once per newly finished timer. */
  const settleAll = useCallback(
    (t: number) => {
      const prev = timersRef.current
      const next = prev.map((timer) => settleTimer(timer, t))
      const finished = next.filter((timer, i) => timer !== prev[i])
      if (finished.length === 0) return
      commit(next)
      playChime()
      try {
        navigator.vibrate?.([200, 100, 200])
      } catch {
        // vibration is optional
      }
      for (const timer of finished) listenersRef.current.forEach((listener) => listener(timer))
    },
    [commit],
  )

  const tick = useCallback(() => {
    const t = Date.now()
    settleAll(t)
    setNow(t)
  }, [settleAll])

  const anyRunning = timers.some(isRunning)
  useEffect(() => {
    if (!anyRunning) return
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [anyRunning, tick])

  useEffect(() => {
    document.addEventListener('visibilitychange', tick)
    return () => document.removeEventListener('visibilitychange', tick)
  }, [tick])

  const start = useCallback<TimersApi['start']>(
    ({ label, minutes, stepNumber }) => {
      if (!Number.isFinite(minutes) || Math.abs(minutes - Math.round(minutes)) > 1e-9) return ''
      const whole = Math.round(minutes)
      if (whole < 1 || whole > 180) return ''
      const t = Date.now()
      settleAll(t)
      const id = newId()
      const timer = createTimer({ id, label, minutes: whole, now: t, stepNumber, autoStart: true })
      const kept = stepNumber === undefined ? timersRef.current : timersRef.current.filter((x) => x.stepNumber !== stepNumber)
      commit([...kept, timer])
      setNow(t)
      return id
    },
    [commit, settleAll],
  )

  const update = useCallback(
    (id: string, fn: (timer: KitchenTimer, t: number) => KitchenTimer) => {
      const t = Date.now()
      settleAll(t)
      const current = timersRef.current
      if (!current.some((x) => x.id === id)) return
      commit(current.map((x) => (x.id === id ? fn(x, t) : x)))
      setNow(t)
    },
    [commit, settleAll],
  )

  const pause = useCallback((id: string) => update(id, pauseTimer), [update])
  const resume = useCallback((id: string) => update(id, resumeTimer), [update])
  const toggle = useCallback((id: string) => update(id, toggleTimer), [update])
  const reset = useCallback((id: string) => update(id, (timer) => resetTimer(timer)), [update])
  const remove = useCallback(
    (id: string) => {
      if (timersRef.current.some((x) => x.id === id)) commit(timersRef.current.filter((x) => x.id !== id))
    },
    [commit],
  )

  const onDone = useCallback<TimersApi['onDone']>((listener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const value = useMemo<TimersApi>(
    () => ({ timers, now, start, pause, resume, toggle, reset, remove, onDone }),
    [timers, now, start, pause, resume, toggle, reset, remove, onDone],
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider
export function useTimers(): TimersApi {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimers must be used inside <TimerProvider>')
  return ctx
}
