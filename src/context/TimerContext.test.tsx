import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/chime', () => ({ playChime: vi.fn() }))

import { playChime } from '../lib/chime'
import { TimerProvider, useTimers } from './TimerContext'

const wrapper = ({ children }: { children: ReactNode }) => <TimerProvider>{children}</TimerProvider>
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('TimerContext', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    vi.mocked(playChime).mockClear()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('finishes a 1 minute timer after 60 s: onDone once, chime once, timer done', () => {
    const { result } = renderHook(() => useTimers(), { wrapper })
    const listener = vi.fn()
    act(() => void result.current.onDone(listener))
    let id = ''
    act(() => void (id = result.current.start({ label: 'Boil', minutes: 1, stepNumber: 2 })))
    expect(id).not.toBe('')
    advance(59_000)
    expect(listener).not.toHaveBeenCalled()
    expect(result.current.timers[0].done).toBe(false)
    advance(1_500)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toMatchObject({ id, label: 'Boil', done: true })
    expect(result.current.timers[0].done).toBe(true)
    expect(playChime).toHaveBeenCalledTimes(1)
    advance(10_000)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('pause holds the remaining time and resume continues it', () => {
    const { result } = renderHook(() => useTimers(), { wrapper })
    let id = ''
    act(() => void (id = result.current.start({ label: 'A', minutes: 2 })))
    advance(30_000)
    act(() => result.current.pause(id))
    const held = result.current.timers[0].pausedRemainingMs
    expect(held).toBe(90_000)
    advance(120_000)
    expect(result.current.timers[0].pausedRemainingMs).toBe(held)
    expect(result.current.timers[0].done).toBe(false)
    act(() => result.current.resume(id))
    advance(89_000)
    expect(result.current.timers[0].done).toBe(false)
    advance(1_500)
    expect(result.current.timers[0].done).toBe(true)
  })

  it('a timer with the same stepNumber replaces the old one', () => {
    const { result } = renderHook(() => useTimers(), { wrapper })
    act(() => void result.current.start({ label: 'one', minutes: 5, stepNumber: 3 }))
    act(() => void result.current.start({ label: 'other', minutes: 5, stepNumber: 4 }))
    act(() => void result.current.start({ label: 'two', minutes: 7, stepNumber: 3 }))
    expect(result.current.timers.map((t) => t.label)).toEqual(['other', 'two'])
  })

  it('rejects minutes outside 1..180', () => {
    const { result } = renderHook(() => useTimers(), { wrapper })
    let ids: string[] = []
    act(() => {
      ids = [0, 181, -3, Number.NaN].map((minutes) => result.current.start({ label: 'x', minutes }))
    })
    expect(ids).toEqual(['', '', '', ''])
    expect(result.current.timers).toHaveLength(0)
    act(() => void (ids = [result.current.start({ label: 'x', minutes: 1 }), result.current.start({ label: 'y', minutes: 180 })]))
    expect(ids.every((id) => id !== '')).toBe(true)
  })

  it('unsubscribe stops notifications', () => {
    const { result } = renderHook(() => useTimers(), { wrapper })
    const kept = vi.fn()
    const dropped = vi.fn()
    let off = () => {}
    act(() => {
      result.current.onDone(kept)
      off = result.current.onDone(dropped)
    })
    off()
    act(() => void result.current.start({ label: 'A', minutes: 1 }))
    advance(61_000)
    expect(kept).toHaveBeenCalledTimes(1)
    expect(dropped).not.toHaveBeenCalled()
  })

  it('catches up when the tab was throttled: a visibility change settles an overdue timer', () => {
    const { result } = renderHook(() => useTimers(), { wrapper })
    const listener = vi.fn()
    act(() => void result.current.onDone(listener))
    act(() => void result.current.start({ label: 'A', minutes: 1 }))
    act(() => {
      vi.setSystemTime(Date.now() + 5 * 60_000) // clock jumps without interval ticks
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(result.current.timers[0].done).toBe(true)
  })

  it('remove deletes the timer; unknown ids are a no-op', () => {
    const { result } = renderHook(() => useTimers(), { wrapper })
    let id = ''
    act(() => void (id = result.current.start({ label: 'A', minutes: 1 })))
    act(() => result.current.pause('nope'))
    act(() => result.current.remove('nope'))
    expect(result.current.timers).toHaveLength(1)
    act(() => result.current.remove(id))
    expect(result.current.timers).toHaveLength(0)
  })

  it('does not re-render while no timer runs', () => {
    let renders = 0
    renderHook(
      () => {
        renders++
        return useTimers()
      },
      { wrapper },
    )
    const before = renders
    advance(5_000)
    expect(renders).toBe(before)
  })
})
