import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpeechSynthesis } from './useSpeechSynthesis'

class FakeUtterance {
  lang = ''
  rate = 1
  voice: unknown = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

describe('useSpeechSynthesis', () => {
  let spoken: FakeUtterance[]
  let synth: {
    speak: ReturnType<typeof vi.fn>
    cancel: ReturnType<typeof vi.fn>
    getVoices: ReturnType<typeof vi.fn>
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.useFakeTimers()
    spoken = []
    synth = {
      speak: vi.fn((u: FakeUtterance) => void spoken.push(u)),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [
        { lang: 'fr-FR', localService: true, default: false, name: 'fr' },
        { lang: 'en-GB', localService: false, default: true, name: 'remote' },
        { lang: 'en-US', localService: true, default: false, name: 'local' },
      ]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth })
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(window, 'speechSynthesis')
  })

  it('is speaking immediately and stops when the utterance ends', () => {
    const { result } = renderHook(() => useSpeechSynthesis({ rate: 0.9 }))
    expect(result.current.supported).toBe(true)
    act(() => result.current.speak('Next step'))
    expect(result.current.speaking).toBe(true)
    expect(spoken[0].lang).toBe('en-US')
    expect(spoken[0].rate).toBe(0.9)
    expect((spoken[0].voice as { name: string }).name).toBe('local')
    act(() => spoken[0].onend?.())
    expect(result.current.speaking).toBe(false)
  })

  it('an error (interrupted / canceled) also ends speaking', () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    act(() => result.current.speak('Hello'))
    act(() => spoken[0].onerror?.())
    expect(result.current.speaking).toBe(false)
  })

  it('a stale end from the previous utterance does not flip the new one', () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    act(() => result.current.speak('first'))
    act(() => result.current.speak('second'))
    expect(synth.cancel).toHaveBeenCalled()
    act(() => spoken[0].onerror?.()) // 'interrupted' arrives late
    expect(result.current.speaking).toBe(true)
    act(() => spoken[0].onend?.())
    expect(result.current.speaking).toBe(true)
    act(() => spoken[1].onend?.())
    expect(result.current.speaking).toBe(false)
  })

  it('cancel stops speaking and cancels the engine', () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    act(() => result.current.speak('Hello'))
    synth.cancel.mockClear()
    act(() => result.current.cancel())
    expect(synth.cancel).toHaveBeenCalledTimes(1)
    expect(result.current.speaking).toBe(false)
  })

  it('ignores blank text', () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    act(() => result.current.speak('   '))
    expect(synth.speak).not.toHaveBeenCalled()
    expect(result.current.speaking).toBe(false)
  })

  it('watchdog clears speaking if the end event never arrives', () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    act(() => result.current.speak('abcde')) // 5 * 90 + 4000
    act(() => void vi.advanceTimersByTime(4449))
    expect(result.current.speaking).toBe(true)
    act(() => void vi.advanceTimersByTime(2))
    expect(result.current.speaking).toBe(false)
  })

  it('cancels on unmount', () => {
    const { result, unmount } = renderHook(() => useSpeechSynthesis())
    act(() => result.current.speak('Hello'))
    synth.cancel.mockClear()
    unmount()
    expect(synth.cancel).toHaveBeenCalled()
  })

  it('is a silent no-op when unsupported', () => {
    Reflect.deleteProperty(window, 'speechSynthesis')
    const { result } = renderHook(() => useSpeechSynthesis())
    expect(result.current.supported).toBe(false)
    expect(() => act(() => result.current.speak('Hello'))).not.toThrow()
    expect(() => act(() => result.current.cancel())).not.toThrow()
    expect(result.current.speaking).toBe(false)
  })
})
