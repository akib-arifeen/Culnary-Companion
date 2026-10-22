import type { RefObject } from 'react'
import type { GestureName } from '../lib/gestures'
import type { MediaStatus } from '../lib/mediaErrors'

/**
 * Public interfaces of the media hooks. UI code depends only on these shapes.
 *
 * Status lifecycle for both camera and microphone:
 *   'off' --enable--> 'starting' --> 'on'
 *                               \--> 'denied' | 'unavailable' | 'error'   (with `message`)
 *   any --disable--> 'off' (message cleared, devices released, model kept in memory)
 * Re-enabling after a failure retries from 'starting'.
 */
export interface ModalityState {
  status: MediaStatus
  /** User-facing, actionable sentence when status is denied/unavailable/error; else null. */
  message: string | null
}

export interface SpeechCommandsOptions {
  /** Start listening when true; stop and release the mic when false. Never requests the mic while false. */
  enabled: boolean
  /** While true (e.g. the app is speaking), final results are DROPPED, plus 600 ms after it turns false. */
  muted: boolean
  /** Called once per final, non-empty transcript (trimmed), never while muted. */
  onTranscript: (transcript: string) => void
  /** BCP-47, default 'en-US'. */
  lang?: string
}

export interface SpeechCommandsApi extends ModalityState {
  /** SpeechRecognition exists in this browser. When false, status is 'unavailable' once enabled. */
  supported: boolean
  /** The engine is currently capturing audio (between onstart and onend). */
  listening: boolean
  /** Last final transcript that was delivered (for the "Heard: ..." chip), cleared after 4 s. */
  heard: string | null
}

export interface GestureRecognizerOptions {
  /** Start camera + model when true; stop camera tracks when false. Never touches the camera while false. */
  enabled: boolean
  /** Called once each time the stabilizer fires (see lib/gestures createGestureStabilizer). */
  onGesture: (gesture: GestureName) => void
}

export interface GestureLive {
  /** Gesture currently held (stabilizer candidate), or null. */
  gesture: GestureName | null
  /** 0..1 hold progress (stabilizer progress). */
  progress: number
  /** A hand is visible in the latest frames. */
  handVisible: boolean
}

export interface GestureRecognizerApi extends ModalityState {
  /**
   * Attach to a <video muted playsInline> element to show the camera preview. The hook owns
   * the stream and sets srcObject itself; the element may mount/unmount at any time.
   * Recognition must keep working when no preview element is mounted.
   */
  videoRef: RefObject<HTMLVideoElement>
  /** Updated at most ~10x/s and only when a value changes, so subscribers stay cheap. */
  live: GestureLive
}

export interface SpeechSynthesisApi {
  supported: boolean
  /** True from utterance start until it ends / errors / is cancelled. */
  speaking: boolean
  /** Cancels anything in progress, then speaks. No-op (no throw) when unsupported. */
  speak: (text: string) => void
  cancel: () => void
}
