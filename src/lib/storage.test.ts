import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { PREF_DEFAULTS, PREF_KEYS, readJSON, usePref, writeJSON } from './storage'

// Each test uses its own key: storage.ts keeps an in-memory copy of unpersistable writes.
let n = 0
const freshKey = () => `test.key.${++n}`

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PREF_DEFAULTS', () => {
  it('hands-free inputs are off until the user opts in', () => {
    expect(PREF_DEFAULTS[PREF_KEYS.voice]).toBe(false)
    expect(PREF_DEFAULTS[PREF_KEYS.gestures]).toBe(false)
    expect(PREF_DEFAULTS[PREF_KEYS.onboarded]).toBe(false)
  })

  it('speech and camera preview default on', () => {
    expect(PREF_DEFAULTS[PREF_KEYS.speakSteps]).toBe(true)
    expect(PREF_DEFAULTS[PREF_KEYS.cameraPreview]).toBe(true)
  })
})

describe('readJSON / writeJSON', () => {
  it('returns the fallback when the key is missing', () => {
    expect(readJSON(freshKey(), 'fb')).toBe('fb')
    const fb = { a: 1 }
    expect(readJSON(freshKey(), fb)).toBe(fb)
  })

  it('returns the fallback for invalid JSON', () => {
    const key = freshKey()
    localStorage.setItem(key, '{not json')
    expect(readJSON(key, 42)).toBe(42)
  })

  it.each([
    ['string', 'hello'],
    ['number', 3.5],
    ['zero', 0],
    ['false', false],
    ['true', true],
    ['null', null],
    ['array', [1, 'two', { three: 3 }]],
    ['object', { a: { b: [1, 2] }, c: 'd' }],
  ])('round-trips a %s', (_label, value) => {
    const key = freshKey()
    writeJSON(key, value)
    expect(readJSON(key, 'fallback')).toEqual(value)
  })

  it('persists as JSON in localStorage', () => {
    const key = freshKey()
    writeJSON(key, { x: [1, 2] })
    expect(localStorage.getItem(key)).toBe(JSON.stringify({ x: [1, 2] }))
  })

  it('reads values written straight to localStorage', () => {
    const key = freshKey()
    localStorage.setItem(key, JSON.stringify({ hello: 'world' }))
    expect(readJSON(key, null)).toEqual({ hello: 'world' })
  })

  it('later writes win', () => {
    const key = freshKey()
    writeJSON(key, 1)
    writeJSON(key, 2)
    expect(readJSON(key, 0)).toBe(2)
  })

  describe('when localStorage throws', () => {
    beforeEach(() => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked')
      })
    })

    it('readJSON returns the fallback and does not throw', () => {
      expect(readJSON(freshKey(), 'fb')).toBe('fb')
    })

    it('writeJSON does not throw', () => {
      expect(() => writeJSON(freshKey(), { a: 1 })).not.toThrow()
    })

    it('a value written in this tab is still read back', () => {
      const key = freshKey()
      writeJSON(key, { a: 1 })
      expect(readJSON(key, null)).toEqual({ a: 1 })
      writeJSON(key, [2])
      expect(readJSON(key, null)).toEqual([2])
    })

    it('usePref still works', () => {
      const key = freshKey()
      const { result } = renderHook(() => usePref(key, 'init'))
      expect(result.current[0]).toBe('init')
      act(() => result.current[1]('changed'))
      expect(result.current[0]).toBe('changed')
    })
  })

  it('only setItem throwing (quota) still reads back what was written', () => {
    const key = freshKey()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writeJSON(key, 'kept')).not.toThrow()
    expect(readJSON(key, 'fb')).toBe('kept')
  })
})

describe('usePref', () => {
  it('returns the fallback initially', () => {
    const { result } = renderHook(() => usePref(freshKey(), 5))
    expect(result.current[0]).toBe(5)
  })

  it('returns an existing stored value', () => {
    const key = freshKey()
    localStorage.setItem(key, JSON.stringify('stored'))
    const { result } = renderHook(() => usePref(key, 'fb'))
    expect(result.current[0]).toBe('stored')
  })

  it('the setter updates the value and persists it', () => {
    const key = freshKey()
    const { result } = renderHook(() => usePref(key, 5))
    act(() => result.current[1](7))
    expect(result.current[0]).toBe(7)
    expect(JSON.parse(localStorage.getItem(key) ?? 'null')).toBe(7)
    expect(readJSON(key, 0)).toBe(7)
  })

  it('works with booleans set to false', () => {
    const key = freshKey()
    const { result } = renderHook(() => usePref(key, true))
    act(() => result.current[1](false))
    expect(result.current[0]).toBe(false)
  })

  it('two hooks on the same key stay in sync', () => {
    const key = freshKey()
    const a = renderHook(() => usePref(key, 'x'))
    const b = renderHook(() => usePref(key, 'x'))
    act(() => a.result.current[1]('y'))
    expect(a.result.current[0]).toBe('y')
    expect(b.result.current[0]).toBe('y')
    act(() => b.result.current[1]('z'))
    expect(a.result.current[0]).toBe('z')
    expect(b.result.current[0]).toBe('z')
  })

  it('hooks on different keys do not interfere', () => {
    const ka = freshKey()
    const kb = freshKey()
    const a = renderHook(() => usePref(ka, 1))
    const b = renderHook(() => usePref(kb, 1))
    act(() => a.result.current[1](2))
    expect(a.result.current[0]).toBe(2)
    expect(b.result.current[0]).toBe(1)
  })

  it('a "storage" event from another tab updates the value', () => {
    const key = freshKey()
    const { result } = renderHook(() => usePref(key, 'old'))
    act(() => {
      localStorage.setItem(key, JSON.stringify('from-other-tab'))
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify('from-other-tab') }))
    })
    expect(result.current[0]).toBe('from-other-tab')
  })

  it('a "storage" event for another key leaves the value alone', () => {
    const key = freshKey()
    const { result } = renderHook(() => usePref(key, 'old'))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: freshKey(), newValue: '"nope"' }))
    })
    expect(result.current[0]).toBe('old')
  })

  it('tolerates a fresh object literal as fallback on every render (no render loop)', () => {
    const key = freshKey()
    const { result, rerender } = renderHook(() => usePref<number[]>(key, []))
    rerender()
    rerender()
    expect(result.current[0]).toEqual([])
  })

  it('keeps a stable value between renders when nothing changed', () => {
    const key = freshKey()
    writeJSON(key, { a: 1 })
    const { result, rerender } = renderHook(() => usePref<{ a: number }>(key, { a: 0 }))
    const first = result.current[0]
    rerender()
    expect(result.current[0]).toBe(first)
  })

  it('stops listening after unmount', () => {
    const key = freshKey()
    const { result, unmount } = renderHook(() => usePref(key, 'old'))
    unmount()
    expect(() => {
      localStorage.setItem(key, '"new"')
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: '"new"' }))
    }).not.toThrow()
    expect(result.current[0]).toBe('old')
  })
})
