import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  recognizeForVideo: vi.fn(),
  createFromOptions: vi.fn(),
  forVisionTasks: vi.fn(),
}))

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mocks.forVisionTasks },
  GestureRecognizer: { createFromOptions: mocks.createFromOptions },
}))

import { useGestureRecognizer as importedHook } from './useGestureRecognizer'
let useGestureRecognizer = importedHook
import { silenceMediaPipeLogs } from './useGestureRecognizer'

function fakeStream() {
  const track = { stop: vi.fn() }
  return { track, stream: { getTracks: () => [track] } as unknown as MediaStream }
}

const thumbUp = { gestures: [[{ categoryName: 'Thumb_Up', score: 0.9 }]], landmarks: [[{}]] }
const noHands = { gestures: [], landmarks: [] }

describe('useGestureRecognizer', () => {
  let now = 0
  let frameQueue: Array<() => void> = []
  let videoTime = 0
  let getUserMedia: ReturnType<typeof vi.fn>

  /** Runs one animation frame, advancing the clock and the video clock first. */
  function frame(ms = 70) {
    now += ms
    videoTime += 1
    const queued = frameQueue
    frameQueue = []
    act(() => queued.forEach((cb) => cb()))
  }

  beforeEach(() => {
    now = 1000
    videoTime = 0
    frameQueue = []
    mocks.recognizeForVideo.mockReset().mockReturnValue(noHands)
    mocks.forVisionTasks.mockReset().mockResolvedValue({})
    mocks.createFromOptions.mockReset().mockResolvedValue({ recognizeForVideo: mocks.recognizeForVideo })
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => frameQueue.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {
      frameQueue = []
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { configurable: true, get: () => 4 })
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { configurable: true, get: () => videoTime })
    getUserMedia = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(HTMLMediaElement.prototype, 'readyState')
    Reflect.deleteProperty(HTMLMediaElement.prototype, 'currentTime')
  })

  it('never touches the camera while disabled', () => {
    const { result } = renderHook(() => useGestureRecognizer({ enabled: false, onGesture: vi.fn() }))
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(result.current.status).toBe('off')
  })

  it('maps NotAllowedError to denied with the non-iframe message', async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    const { result } = renderHook(() => useGestureRecognizer({ enabled: true, onGesture: vi.fn() }))
    await waitFor(() => expect(result.current.status).toBe('denied'))
    expect(result.current.message).toBe("Camera access was blocked. Allow the camera in your browser's site settings, then try again.")
  })

  it('maps NotFoundError to unavailable', async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotFoundError' }))
    const { result } = renderHook(() => useGestureRecognizer({ enabled: true, onGesture: vi.fn() }))
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(result.current.message).toMatch(/No camera found/)
  })

  it('is unavailable without getUserMedia', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    const { result } = renderHook(() => useGestureRecognizer({ enabled: true, onGesture: vi.fn() }))
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
  })

  it('goes starting then on, fires Thumb_Up once after the hold, and stops tracks on disable', async () => {
    const { stream, track } = fakeStream()
    getUserMedia.mockResolvedValue(stream)
    const onGesture = vi.fn()
    const { result, rerender } = renderHook(({ enabled }) => useGestureRecognizer({ enabled, onGesture }), {
      initialProps: { enabled: true },
    })
    expect(result.current.status).toBe('starting')
    await waitFor(() => expect(result.current.status).toBe('on'))
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }))

    mocks.recognizeForVideo.mockReturnValue(thumbUp)
    for (let i = 0; i < 10; i++) frame() // 700 ms of held Thumb_Up
    expect(onGesture).toHaveBeenCalledTimes(1)
    expect(onGesture).toHaveBeenCalledWith('Thumb_Up')
    expect(result.current.live.gesture).toBe('Thumb_Up')
    expect(result.current.live.handVisible).toBe(true)

    rerender({ enabled: false })
    expect(track.stop).toHaveBeenCalled()
    expect(result.current.status).toBe('off')
    expect(result.current.live).toEqual({ gesture: null, progress: 0, handVisible: false })
  })

  it('a frame callback already queued when the hook is disabled does not call recognizeForVideo', async () => {
    getUserMedia.mockResolvedValue(fakeStream().stream)
    const { result, rerender } = renderHook(({ enabled }) => useGestureRecognizer({ enabled, onGesture: vi.fn() }), {
      initialProps: { enabled: true },
    })
    await waitFor(() => expect(result.current.status).toBe('on'))
    mocks.recognizeForVideo.mockReturnValue(thumbUp)
    frame()
    expect(mocks.recognizeForVideo).toHaveBeenCalled()
    // keep a copy of the pending callbacks: the cancelAnimationFrame stub clears the real queue
    const stale = [...frameQueue]
    expect(stale.length).toBeGreaterThan(0)
    rerender({ enabled: false })
    mocks.recognizeForVideo.mockClear()
    now += 70
    videoTime += 1
    act(() => stale.forEach((cb) => cb()))
    expect(mocks.recognizeForVideo).not.toHaveBeenCalled()
    expect(result.current.status).toBe('off')
  })

  it('ignores None and unknown labels', async () => {
    getUserMedia.mockResolvedValue(fakeStream().stream)
    const onGesture = vi.fn()
    const { result } = renderHook(() => useGestureRecognizer({ enabled: true, onGesture }))
    await waitFor(() => expect(result.current.status).toBe('on'))
    mocks.recognizeForVideo.mockReturnValue({ gestures: [[{ categoryName: 'None', score: 0.99 }]], landmarks: [[{}]] })
    for (let i = 0; i < 12; i++) frame()
    expect(onGesture).not.toHaveBeenCalled()
  })

  it('releases the camera if disabled before the start completes', async () => {
    const { stream, track } = fakeStream()
    let resolveCamera: (s: MediaStream) => void = () => {}
    getUserMedia.mockReturnValue(new Promise<MediaStream>((r) => (resolveCamera = r)))
    const { result, rerender } = renderHook(({ enabled }) => useGestureRecognizer({ enabled, onGesture: vi.fn() }), {
      initialProps: { enabled: true },
    })
    rerender({ enabled: false })
    await act(async () => resolveCamera(stream))
    expect(track.stop).toHaveBeenCalled()
    expect(result.current.status).toBe('off')
  })

  it('reports a model load failure as an error and recovers on retry', async () => {
    vi.resetModules() // the model is a module-level singleton; start this test from a cold page
    ;({ useGestureRecognizer } = await import('./useGestureRecognizer'))
    const { stream, track } = fakeStream()
    getUserMedia.mockResolvedValue(stream)
    mocks.forVisionTasks.mockRejectedValueOnce(new Error('404'))
    const { result, rerender } = renderHook(({ enabled }) => useGestureRecognizer({ enabled, onGesture: vi.fn() }), {
      initialProps: { enabled: true },
    })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.message).toMatch(/gesture model/)
    expect(track.stop).toHaveBeenCalled()
    rerender({ enabled: false })
    rerender({ enabled: true })
    await waitFor(() => expect(result.current.status).toBe('on'))
  })

  describe('releasing the camera while the model is still loading', () => {
    async function coldHook() {
      vi.resetModules() // the model is a module-level singleton; start from a cold page
      const { useGestureRecognizer: freshHook } = await import('./useGestureRecognizer')
      // the model promise is never settled during the test
      mocks.createFromOptions.mockReturnValue(new Promise(() => {}))
      return freshHook
    }

    it('camera resolves first, then disable: tracks are stopped before the model settles', async () => {
      const freshHook = await coldHook()
      const { track } = fakeStream()
      const second = { stop: vi.fn() }
      const twoTracks = { getTracks: () => [track, second] } as unknown as MediaStream
      getUserMedia.mockResolvedValue(twoTracks)
      const { result, rerender } = renderHook(({ enabled }) => freshHook({ enabled, onGesture: vi.fn() }), {
        initialProps: { enabled: true },
      })
      await act(async () => {})
      expect(getUserMedia).toHaveBeenCalledTimes(1)
      expect(track.stop).not.toHaveBeenCalled()
      expect(result.current.status).toBe('starting')
      rerender({ enabled: false })
      await act(async () => {})
      expect(track.stop).toHaveBeenCalled()
      expect(second.stop).toHaveBeenCalled()
      expect(result.current.status).toBe('off')
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('disable first, then the camera resolves: tracks are stopped right away', async () => {
      const freshHook = await coldHook()
      const { stream, track } = fakeStream()
      let resolveCamera: (s: MediaStream) => void = () => {}
      getUserMedia.mockReturnValue(new Promise<MediaStream>((r) => (resolveCamera = r)))
      const { result, rerender } = renderHook(({ enabled }) => freshHook({ enabled, onGesture: vi.fn() }), {
        initialProps: { enabled: true },
      })
      await act(async () => {})
      rerender({ enabled: false })
      expect(track.stop).not.toHaveBeenCalled()
      await act(async () => resolveCamera(stream))
      expect(track.stop).toHaveBeenCalled()
      expect(result.current.status).toBe('off')
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    })
  })

  describe('silenceMediaPipeLogs', () => {
    const methods = ['log', 'info', 'warn', 'error'] as const
    const saved = Object.fromEntries(methods.map((m) => [m, console[m]])) as Record<(typeof methods)[number], (...a: unknown[]) => void>
    afterEach(() => {
      for (const m of methods) console[m] = saved[m]
    })

    it('drops MediaPipe native lines, passes everything else through, and is idempotent', () => {
      const originals = Object.fromEntries(methods.map((m) => [m, vi.fn()])) as Record<(typeof methods)[number], ReturnType<typeof vi.fn>>
      for (const m of methods) console[m] = originals[m] as unknown as typeof console.log
      silenceMediaPipeLogs()
      const afterFirst = console.error
      silenceMediaPipeLogs()
      expect(console.error).toBe(afterFirst)

      console.error('INFO: Created TensorFlow Lite XNNPACK delegate for CPU.')
      console.log('Graph successfully started running.')
      console.warn('W1022 12:14:58.366000 2191552 gl_context.cc:1135] OpenGL error checking is disabled')
      console.log('I1022 12:14:58.272000 2191552 hand_gesture_recognizer_graph.cc:257] Custom gesture classifier is not defined.')
      for (const m of methods) expect(originals[m]).not.toHaveBeenCalled()

      const detail = { a: 1 }
      console.error('real problem', detail)
      console.warn('Graph successfully started running. (but not exactly)')
      console.log(42)
      expect(originals.error).toHaveBeenCalledExactlyOnceWith('real problem', detail)
      expect(originals.warn).toHaveBeenCalledTimes(1)
      expect(originals.log).toHaveBeenCalledExactlyOnceWith(42)
    })
  })
})
