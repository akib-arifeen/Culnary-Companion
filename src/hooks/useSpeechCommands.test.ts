import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpeechCommands } from './useSpeechCommands'

class FakeRecognition {
  static instances: FakeRecognition[] = []
  continuous = false
  interimResults = true
  maxAlternatives = 0
  lang = ''
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onresult: ((e: unknown) => void) | null = null
  start = vi.fn(() => {
    this.onstart?.()
  })
  abort = vi.fn()
  constructor() {
    FakeRecognition.instances.push(this)
  }
  say(text: string, isFinal = true) {
    const result = Object.assign([{ transcript: text }], { isFinal })
    this.onresult?.({ resultIndex: 0, results: [result] })
  }
  /** A real engine ends the session after an error. */
  fail(code: string) {
    this.onerror?.({ error: code })
    this.onend?.()
  }
}

const rec = () => FakeRecognition.instances[0]
const flush = () => act(async () => {})

describe('useSpeechCommands', () => {
  let getUserMedia: ReturnType<typeof vi.fn>
  let trackStop: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    FakeRecognition.instances = []
    ;(window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition
    trackStop = vi.fn()
    getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    Reflect.deleteProperty(window, 'SpeechRecognition')
  })

  function setup(initial: { enabled?: boolean; muted?: boolean } = {}) {
    const onTranscript = vi.fn()
    const hook = renderHook((p: { enabled: boolean; muted: boolean }) => useSpeechCommands({ ...p, onTranscript }), {
      initialProps: { enabled: initial.enabled ?? true, muted: initial.muted ?? false },
    })
    return { onTranscript, ...hook }
  }

  it('does not touch the mic while disabled', async () => {
    const { result } = setup({ enabled: false })
    await flush()
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(FakeRecognition.instances).toHaveLength(0)
    expect(result.current.status).toBe('off')
  })

  it('reports unsupported browsers as unavailable', async () => {
    Reflect.deleteProperty(window, 'SpeechRecognition')
    const { result } = setup()
    await flush()
    expect(result.current.supported).toBe(false)
    expect(result.current.status).toBe('unavailable')
    expect(result.current.message).toBe('Voice commands need Chrome, Edge or Safari.')
  })

  it('returns to off with the message cleared when disabled after an unsupported start', async () => {
    Reflect.deleteProperty(window, 'SpeechRecognition')
    const { result, rerender } = setup()
    await flush()
    expect(result.current.status).toBe('unavailable')
    rerender({ enabled: false, muted: false })
    expect(result.current.status).toBe('off')
    expect(result.current.message).toBeNull()
  })

  it('maps a getUserMedia NotAllowedError to denied and never starts recognition', async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    const { result } = setup()
    await flush()
    expect(result.current.status).toBe('denied')
    expect(result.current.message).toMatch(/Microphone access was blocked/)
    expect(FakeRecognition.instances).toHaveLength(0)
  })

  it('maps a not-allowed recognition error to denied without restarting', async () => {
    const { result } = setup()
    await flush()
    expect(result.current.status).toBe('on')
    expect(trackStop).toHaveBeenCalled()
    act(() => rec().fail('not-allowed'))
    expect(result.current.status).toBe('denied')
    act(() => void vi.advanceTimersByTime(10_000))
    expect(rec().start).toHaveBeenCalledTimes(1)
  })

  it('configures the engine and goes on / listening', async () => {
    const { result } = setup()
    expect(result.current.status).toBe('starting')
    await flush()
    expect(rec().continuous).toBe(true)
    expect(rec().interimResults).toBe(false)
    expect(rec().lang).toBe('en-US')
    expect(result.current.status).toBe('on')
    expect(result.current.listening).toBe(true)
  })

  it('delivers final transcripts, trimmed, and clears heard after 4 s; ignores interim and empty', async () => {
    const { result, onTranscript } = setup()
    await flush()
    act(() => rec().say('nex', false))
    act(() => rec().say('   '))
    expect(onTranscript).not.toHaveBeenCalled()
    act(() => rec().say('  next step  '))
    expect(onTranscript).toHaveBeenCalledExactlyOnceWith('next step')
    expect(result.current.heard).toBe('next step')
    act(() => void vi.advanceTimersByTime(4001))
    expect(result.current.heard).toBeNull()
  })

  it('drops transcripts while muted and for 600 ms after, then delivers', async () => {
    const { rerender, onTranscript } = setup({ muted: true })
    await flush()
    act(() => rec().say('next'))
    expect(onTranscript).not.toHaveBeenCalled()
    rerender({ enabled: true, muted: false })
    act(() => void vi.advanceTimersByTime(599))
    act(() => rec().say('next'))
    expect(onTranscript).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(2))
    act(() => rec().say('next'))
    expect(onTranscript).toHaveBeenCalledExactlyOnceWith('next')
  })

  it('restarts after no-speech and stays on', async () => {
    const { result } = setup()
    await flush()
    act(() => rec().fail('no-speech'))
    expect(result.current.status).toBe('on')
    act(() => void vi.advanceTimersByTime(299))
    expect(rec().start).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(2))
    expect(rec().start).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('on')
  })

  it('keeps restarting after plain session ends, with growing backoff', async () => {
    setup()
    await flush()
    act(() => rec().onend?.())
    act(() => void vi.advanceTimersByTime(300))
    expect(rec().start).toHaveBeenCalledTimes(2)
    act(() => rec().onend?.()) // short session again -> 600 ms
    act(() => void vi.advanceTimersByTime(599))
    expect(rec().start).toHaveBeenCalledTimes(2)
    act(() => void vi.advanceTimersByTime(2))
    expect(rec().start).toHaveBeenCalledTimes(3)
  })

  it('a result resets the backoff: after growth, one onresult then session end restarts at 300 ms, not 1200', async () => {
    setup()
    await flush()
    act(() => rec().onend?.()) // short session 1 -> restart after 300
    act(() => void vi.advanceTimersByTime(300))
    expect(rec().start).toHaveBeenCalledTimes(2)
    act(() => rec().onend?.()) // short session 2 -> restart after 600; backoff is now 1200
    act(() => void vi.advanceTimersByTime(600))
    expect(rec().start).toHaveBeenCalledTimes(3)
    act(() => rec().say('hello'))
    act(() => rec().onend?.())
    act(() => void vi.advanceTimersByTime(299))
    expect(rec().start).toHaveBeenCalledTimes(3)
    act(() => void vi.advanceTimersByTime(2))
    expect(rec().start).toHaveBeenCalledTimes(4)
  })

  it('without a result the backoff keeps growing past 600 ms (1200 on the third short session)', async () => {
    setup()
    await flush()
    act(() => rec().onend?.())
    act(() => void vi.advanceTimersByTime(300))
    act(() => rec().onend?.())
    act(() => void vi.advanceTimersByTime(600))
    expect(rec().start).toHaveBeenCalledTimes(3)
    act(() => rec().onend?.())
    act(() => void vi.advanceTimersByTime(1199))
    expect(rec().start).toHaveBeenCalledTimes(3)
    act(() => void vi.advanceTimersByTime(2))
    expect(rec().start).toHaveBeenCalledTimes(4)
  })

  describe('document visibility', () => {
    afterEach(() => {
      Reflect.deleteProperty(document, 'hidden')
    })
    const setHidden = (hidden: boolean) => Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })

    it('does not restart a session that ends while the document is hidden; restarts immediately when it becomes visible', async () => {
      setup()
      await flush()
      expect(rec().start).toHaveBeenCalledTimes(1)
      setHidden(true)
      act(() => rec().onend?.())
      act(() => void vi.advanceTimersByTime(10_000))
      expect(rec().start).toHaveBeenCalledTimes(1)
      setHidden(false)
      act(() => void document.dispatchEvent(new Event('visibilitychange')))
      expect(rec().start).toHaveBeenCalledTimes(2)
    })

    it('a visibilitychange while still hidden does not start', async () => {
      setup()
      await flush()
      setHidden(true)
      act(() => rec().onend?.())
      act(() => void document.dispatchEvent(new Event('visibilitychange')))
      expect(rec().start).toHaveBeenCalledTimes(1)
    })
  })

  it('surfaces a fatal error status after three consecutive network errors', async () => {
    const { result } = setup()
    await flush()
    act(() => rec().fail('network'))
    act(() => void vi.advanceTimersByTime(300))
    expect(result.current.status).toBe('on')
    act(() => rec().fail('network'))
    act(() => void vi.advanceTimersByTime(600))
    expect(result.current.status).toBe('on')
    act(() => rec().fail('network'))
    expect(result.current.status).toBe('error')
    expect(result.current.message).toMatch(/internet connection/)
    const starts = rec().start.mock.calls.length
    act(() => void vi.advanceTimersByTime(20_000))
    expect(rec().start).toHaveBeenCalledTimes(starts)
  })

  it('aborts on disable and goes off', async () => {
    const { result, rerender } = setup()
    await flush()
    const r = rec()
    rerender({ enabled: false, muted: false })
    expect(r.abort).toHaveBeenCalled()
    expect(result.current.status).toBe('off')
    expect(result.current.listening).toBe(false)
    act(() => r.onend?.())
    act(() => void vi.advanceTimersByTime(10_000))
    expect(r.start).toHaveBeenCalledTimes(1)
  })

  it('releases the mic and starts nothing if disabled while the permission prompt is open', async () => {
    let grant: (s: unknown) => void = () => {}
    getUserMedia.mockReturnValue(new Promise((r) => (grant = r)))
    const { rerender } = setup()
    rerender({ enabled: false, muted: false })
    await act(async () => grant({ getTracks: () => [{ stop: trackStop }] }))
    expect(trackStop).toHaveBeenCalled()
    expect(FakeRecognition.instances).toHaveLength(0)
  })

  describe('muting', () => {
    it('aborts on mute, does not restart while muted even when onend fires, and never touches the mic or status', async () => {
      const { result, rerender } = setup()
      await flush()
      getUserMedia.mockClear()
      rerender({ enabled: true, muted: true })
      expect(rec().abort).toHaveBeenCalledTimes(1)
      expect(result.current.listening).toBe(false)
      expect(result.current.status).toBe('on')
      expect(result.current.message).toBeNull()
      act(() => rec().onend?.())
      act(() => void vi.advanceTimersByTime(10_000))
      expect(rec().start).toHaveBeenCalledTimes(1)
      expect(getUserMedia).not.toHaveBeenCalled()
    })

    it('restarts once, about 600 ms after unmuting', async () => {
      const { result, rerender } = setup()
      await flush()
      rerender({ enabled: true, muted: true })
      rerender({ enabled: true, muted: false })
      act(() => void vi.advanceTimersByTime(599))
      expect(rec().start).toHaveBeenCalledTimes(1)
      act(() => void vi.advanceTimersByTime(2))
      expect(rec().start).toHaveBeenCalledTimes(2)
      expect(result.current.listening).toBe(true)
      act(() => void vi.advanceTimersByTime(10_000))
      expect(rec().start).toHaveBeenCalledTimes(2)
    })

    it('does not deliver a result that arrives during the muted window', async () => {
      const { rerender, onTranscript } = setup()
      await flush()
      rerender({ enabled: true, muted: true })
      act(() => rec().say('continue stirring'))
      expect(onTranscript).not.toHaveBeenCalled()
    })

    it('a rapid true/false/true/false toggle yields exactly one restart', async () => {
      const { rerender } = setup()
      await flush()
      rerender({ enabled: true, muted: true })
      rerender({ enabled: true, muted: false })
      rerender({ enabled: true, muted: true })
      rerender({ enabled: true, muted: false })
      act(() => void vi.advanceTimersByTime(10_000))
      expect(rec().start).toHaveBeenCalledTimes(2)
    })

    it('does not start while muted from the beginning, then starts after unmute', async () => {
      const { rerender } = setup({ muted: true })
      await flush()
      expect(rec().start).not.toHaveBeenCalled()
      rerender({ enabled: true, muted: false })
      act(() => void vi.advanceTimersByTime(601))
      expect(rec().start).toHaveBeenCalledTimes(1)
    })
  })
})
