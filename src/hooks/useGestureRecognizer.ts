import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'
import { createGestureStabilizer, isGestureName, type GestureName } from '../lib/gestures'
import { describeMediaError, type MediaStatus } from '../lib/mediaErrors'
import type { GestureLive, GestureRecognizerApi, GestureRecognizerOptions } from './contracts'

const IDLE_LIVE: GestureLive = { gesture: null, progress: 0, handVisible: false }
const MIN_FRAME_GAP_MS = 60

function namedError(name: string, cause?: unknown): Error {
  const err = new Error(cause instanceof Error ? cause.message : name)
  err.name = name
  return err
}

function inIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

let modelPromise: Promise<GestureRecognizer> | null = null

/** Loads the model once per page and reuses it across enable/disable. A failure resets the cache so a retry can work. */
function loadModel(): Promise<GestureRecognizer> {
  if (!modelPromise) {
    const base = import.meta.env.BASE_URL
    const create = (fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: 'GPU' | 'CPU') =>
      GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${base}models/gesture_recognizer.task`, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    modelPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`)
      try {
        return await create(fileset, 'GPU')
      } catch {
        return await create(fileset, 'CPU')
      }
    })().catch((err: unknown) => {
      modelPromise = null
      throw namedError('ModelLoadError', err)
    })
  }
  return modelPromise
}

export function useGestureRecognizer({ enabled, onGesture }: GestureRecognizerOptions): GestureRecognizerApi {
  const [status, setStatus] = useState<MediaStatus>('off')
  const [message, setMessage] = useState<string | null>(null)
  const [live, setLive] = useState<GestureLive>(IDLE_LIVE)
  const videoRef = useRef<HTMLVideoElement>(null)
  const onGestureRef = useRef(onGesture)

  useEffect(() => {
    onGestureRef.current = onGesture
  }, [onGesture])

  useEffect(() => {
    if (!enabled) return
    // Everything below belongs to this run; `stopped` is its token. A stale run that finishes
    // late releases what it acquired and never sets state.
    let stopped = false
    let stream: MediaStream | null = null
    let raf = 0
    let videoEl: HTMLVideoElement | null = null
    const stabilizer = createGestureStabilizer()

    const release = () => {
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
      if (videoEl) videoEl.srcObject = null
      if (videoRef.current) videoRef.current.srcObject = null
      stabilizer.reset()
    }

    const fail = (err: unknown) => {
      release()
      const problem = describeMediaError('camera', err, { inIframe: inIframe() })
      setStatus(problem.status)
      setMessage(problem.message)
      setLive(IDLE_LIVE)
    }

    const run = async () => {
      setStatus('starting')
      setMessage(null)
      if (!navigator.mediaDevices?.getUserMedia) return fail(namedError('UnsupportedError'))
      const policy = (document as unknown as { featurePolicy?: { allowsFeature?: (feature: string) => boolean } }).featurePolicy
      if (policy?.allowsFeature?.('camera') === false) return fail(namedError('NotAllowedError'))

      const camera = (async () =>
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } },
        }))()
      const [modelResult, cameraResult] = await Promise.allSettled([loadModel(), camera])
      if (cameraResult.status === 'fulfilled') stream = cameraResult.value
      if (stopped) {
        release()
        return
      }
      if (cameraResult.status === 'rejected') return fail(cameraResult.reason)
      if (modelResult.status === 'rejected') return fail(modelResult.reason)

      const recognizer = modelResult.value
      const activeStream = cameraResult.value
      videoEl = document.createElement('video')
      videoEl.muted = true
      videoEl.playsInline = true
      videoEl.autoplay = true
      videoEl.srcObject = activeStream
      videoEl.play()?.catch(() => {})
      const internal = videoEl
      setStatus('on')

      let lastFrameT = Number.NEGATIVE_INFINITY
      let lastVideoTime = -1
      let lastLive: GestureLive = IDLE_LIVE
      let lastTenth = 0

      const tick = () => {
        raf = requestAnimationFrame(tick)
        try {
          const preview = videoRef.current
          if (preview && preview.srcObject !== activeStream) {
            preview.srcObject = activeStream
            preview.play()?.catch(() => {})
          }
          const t = performance.now()
          if (t - lastFrameT < MIN_FRAME_GAP_MS || internal.readyState < 2 || internal.currentTime === lastVideoTime) return
          lastFrameT = t
          lastVideoTime = internal.currentTime

          const result = recognizer.recognizeForVideo(internal, t)
          const top = result.gestures?.[0]?.[0]
          const handVisible = (result.gestures?.length ?? 0) > 0 || (result.landmarks?.length ?? 0) > 0
          const gesture: GestureName | null = top && isGestureName(top.categoryName) ? top.categoryName : null
          const out = stabilizer.push({ gesture, score: gesture ? top.score : 0, t })

          const tenth = Math.round(out.progress * 10)
          if (out.candidate !== lastLive.gesture || handVisible !== lastLive.handVisible || tenth !== lastTenth) {
            lastTenth = tenth
            lastLive = { gesture: out.candidate, progress: out.progress, handVisible }
            setLive(lastLive)
          }
          if (out.fired) onGestureRef.current(out.fired)
        } catch (err) {
          stopped = true
          fail(err)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    void run()

    return () => {
      stopped = true
      release()
      setStatus('off')
      setMessage(null)
      setLive(IDLE_LIVE)
    }
  }, [enabled])

  return { status, message, videoRef, live }
}
