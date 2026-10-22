/**
 * Turn camera / microphone / speech failures into a status plus one actionable,
 * human sentence. Expected failures (denied, no device) are product states, not bugs:
 * callers show the message and must NOT console.error them.
 */

export type MediaStatus = 'off' | 'starting' | 'on' | 'denied' | 'unavailable' | 'error'

export interface MediaProblem {
  status: Exclude<MediaStatus, 'off' | 'starting' | 'on'>
  message: string
}

export interface MediaContext {
  /** window.self !== window.top */
  inIframe: boolean
}

/**
 * For getUserMedia / model-loading failures. Match on `err.name` (DOMException or Error):
 *  - NotAllowedError, SecurityError, PermissionDeniedError ->
 *      denied. inIframe: "Camera access is blocked for this embedded page. Open the app in its own tab to use gestures."
 *               else:     "Camera access was blocked. Allow the camera in your browser's site settings, then try again."
 *  - NotFoundError, DevicesNotFoundError, OverconstrainedError ->
 *      unavailable: "No camera found. You can still cook with taps, keys or voice."
 *  - NotReadableError, TrackStartError, AbortError ->
 *      error: "The camera is busy in another app or tab. Close it there, then try again."
 *  - name 'UnsupportedError' (we throw this when navigator.mediaDevices is missing / insecure context) ->
 *      unavailable: "This browser can't use the camera here. Try Chrome, Edge or Safari over HTTPS."
 *  - name 'ModelLoadError' (we throw this when the gesture model / WASM fails to load) ->
 *      error: "The gesture model couldn't load. Check your connection and try again."
 *  - anything else -> error: "Gestures stopped unexpectedly. Try turning them off and on again."
 * For kind 'microphone' the same mapping applies with "microphone" instead of "camera",
 * "voice" instead of "gestures", the no-device text "No microphone found. You can still cook with taps, keys or gestures.",
 * the busy text "The microphone is busy in another app or tab. Close it there, then try again.",
 * and the unsupported text "Voice commands need Chrome, Edge or Safari."
 * (ModelLoadError never applies to microphone; treat as 'anything else'.)
 */
export function describeMediaError(kind: 'camera' | 'microphone', err: unknown, ctx: MediaContext): MediaProblem {
  const name = typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: unknown }).name) : ''
  const mic = kind === 'microphone'
  const noun = mic ? 'microphone' : 'camera'
  const Noun = mic ? 'Microphone' : 'Camera'
  const feature = mic ? 'voice' : 'gestures'
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return {
        status: 'denied',
        message: ctx.inIframe
          ? `${Noun} access is blocked for this embedded page. Open the app in its own tab to use ${feature}.`
          : `${Noun} access was blocked. Allow the ${noun} in your browser's site settings, then try again.`,
      }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return {
        status: 'unavailable',
        message: mic
          ? 'No microphone found. You can still cook with taps, keys or gestures.'
          : 'No camera found. You can still cook with taps, keys or voice.',
      }
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return { status: 'error', message: `The ${noun} is busy in another app or tab. Close it there, then try again.` }
    case 'UnsupportedError':
      return {
        status: 'unavailable',
        message: mic
          ? 'Voice commands need Chrome, Edge or Safari.'
          : "This browser can't use the camera here. Try Chrome, Edge or Safari over HTTPS.",
      }
    case 'ModelLoadError':
      if (!mic) {
        return { status: 'error', message: "The gesture model couldn't load. Check your connection and try again." }
      }
      break
    default:
      break
  }
  return { status: 'error', message: `${mic ? 'Voice' : 'Gestures'} stopped unexpectedly. Try turning them off and on again.` }
}

/**
 * For SpeechRecognition `error` event codes. Returns null for codes that are NOT problems
 * and must be silently recovered from by restarting: 'no-speech', 'aborted'.
 *  - 'not-allowed' -> same as describeMediaError('microphone', {name:'NotAllowedError'}, ctx)
 *  - 'service-not-allowed' -> denied: "Voice recognition is turned off in this browser. Use taps, keys or gestures instead."
 *  - 'audio-capture' -> same as describeMediaError('microphone', {name:'NotFoundError'}, ctx)
 *  - 'network' -> error: "Voice recognition needs an internet connection. Reconnect, then turn voice on again."
 *  - 'language-not-supported' -> unavailable: "Voice recognition doesn't support English here."
 *  - anything else -> error: "Voice commands stopped unexpectedly. Try turning them off and on again."
 */
export function describeSpeechError(code: string, ctx: MediaContext): MediaProblem | null {
  switch (code) {
    case 'no-speech':
    case 'aborted':
      return null
    case 'not-allowed':
      return describeMediaError('microphone', { name: 'NotAllowedError' }, ctx)
    case 'service-not-allowed':
      return {
        status: 'denied',
        message: 'Voice recognition is turned off in this browser. Use taps, keys or gestures instead.',
      }
    case 'audio-capture':
      return describeMediaError('microphone', { name: 'NotFoundError' }, ctx)
    case 'network':
      return {
        status: 'error',
        message: 'Voice recognition needs an internet connection. Reconnect, then turn voice on again.',
      }
    case 'language-not-supported':
      return { status: 'unavailable', message: "Voice recognition doesn't support English here." }
    default:
      return { status: 'error', message: 'Voice commands stopped unexpectedly. Try turning them off and on again.' }
  }
}
