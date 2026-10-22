import type { Command } from './commands'

/** MediaPipe GestureRecognizer canned labels we act on ("None" is mapped to null by the caller). */
export type GestureName = 'Thumb_Up' | 'Thumb_Down' | 'Open_Palm' | 'Closed_Fist' | 'Pointing_Up' | 'Victory' | 'ILoveYou'

export const GESTURE_NAMES: readonly GestureName[] = [
  'Thumb_Up',
  'Thumb_Down',
  'Open_Palm',
  'Closed_Fist',
  'Pointing_Up',
  'Victory',
  'ILoveYou',
]

export function isGestureName(value: string): value is GestureName {
  return (GESTURE_NAMES as readonly string[]).includes(value)
}

/**
 * Context-free mapping: a gesture means the same thing on every tab, so it can be
 * learned once. ILoveYou is recognised but deliberately unbound (too easy to make by accident).
 */
export const GESTURE_COMMANDS: Readonly<Record<GestureName, Command | null>> = {
  Thumb_Up: { type: 'next' },
  Thumb_Down: { type: 'previous' },
  Open_Palm: { type: 'repeat' },
  Pointing_Up: { type: 'startTimer' },
  Victory: { type: 'toggleIngredients' },
  Closed_Fist: { type: 'toggleTimer' },
  ILoveYou: null,
}

/** Onboarding / help order, with plain-language copy. */
export const GESTURE_GUIDE: ReadonlyArray<{ gesture: GestureName; title: string; action: string; hint: string }> = [
  { gesture: 'Thumb_Up', title: 'Thumb up', action: 'Next step', hint: 'Thumb pointing to the ceiling, fingers curled.' },
  { gesture: 'Thumb_Down', title: 'Thumb down', action: 'Previous step', hint: 'Thumb pointing to the floor.' },
  { gesture: 'Open_Palm', title: 'Open palm', action: 'Read the step again', hint: 'All five fingers spread, palm to the camera.' },
  { gesture: 'Victory', title: 'Victory', action: 'Show / hide ingredients', hint: 'Index and middle finger in a V.' },
  { gesture: 'Pointing_Up', title: 'Point up', action: 'Start the step timer', hint: 'Index finger straight up.' },
  { gesture: 'Closed_Fist', title: 'Fist', action: 'Pause / resume the timer', hint: 'Close all fingers.' },
]

export interface StabilizerOptions {
  /** A gesture must be held this long before it fires. */
  holdMs: number
  /** Frames below this score count as "no gesture". */
  minScore: number
  /** Non-matching frames are ignored (flicker) until this long after the last matching frame. */
  maxGapMs: number
  /** After any fire, nothing fires again until this long has passed. */
  cooldownMs: number
}

export const DEFAULT_STABILIZER_OPTIONS: StabilizerOptions = {
  holdMs: 450,
  minScore: 0.6,
  maxGapMs: 200,
  cooldownMs: 700,
}

export interface StabilizerFrame {
  /** null = no hand / "None" / unknown label. */
  gesture: GestureName | null
  score: number
  /** Monotonic timestamp in ms (performance.now()). */
  t: number
}

export interface StabilizerOutput {
  /** Set on exactly the frame where a held gesture fires; null on every other frame. */
  fired: GestureName | null
  /** The gesture currently being held (after flicker tolerance), or null. */
  candidate: GestureName | null
  /**
   * 0..1 hold progress of `candidate` toward firing, for a progress ring.
   * 1 while the gesture that just fired is still being held; 0 when no candidate.
   */
  progress: number
  /** False after a fire until the candidate changes or disappears (no auto-repeat while holding). */
  armed: boolean
}

/**
 * Debounces raw per-frame recognitions into deliberate gestures. Exact semantics,
 * applied to each pushed frame in order (good(f) = f.gesture !== null && f.score >= minScore):
 *  1. candidate === null: if good(f) then candidate = f.gesture, since = t, lastMatchT = t, armed = true.
 *  2. good(f) && f.gesture === candidate: lastMatchT = t.
 *  3. otherwise (f does not match the candidate: null, low score, or another gesture):
 *       if t - lastMatchT <= maxGapMs: ignore the frame (flicker), candidate kept.
 *       else: candidate = null, armed = true; then if good(f), apply step 1 to f.
 *  4. Fire when candidate !== null && armed && t - since >= holdMs && t >= cooldownUntil:
 *      fired = candidate, armed = false, cooldownUntil = t + cooldownMs.
 *  - Holding the same gesture after it fired never fires again; the hand must change
 *    gesture or leave (candidate becomes null) to re-arm.
 *  - progress = armed ? clamp((t - since) / holdMs, 0, 1) : 1, or 0 when candidate is null.
 *  - reset() returns to the initial state (no candidate, armed, no cooldown).
 */
export function createGestureStabilizer(options: Partial<StabilizerOptions> = {}): {
  push(frame: StabilizerFrame): StabilizerOutput
  reset(): void
} {
  const { holdMs, minScore, maxGapMs, cooldownMs } = { ...DEFAULT_STABILIZER_OPTIONS, ...options }
  let candidate: GestureName | null = null
  let since = 0
  let lastMatchT = 0
  let armed = true
  let cooldownUntil = 0

  function reset(): void {
    candidate = null
    since = 0
    lastMatchT = 0
    armed = true
    cooldownUntil = 0
  }

  function push(frame: StabilizerFrame): StabilizerOutput {
    const { t } = frame
    const good = frame.gesture !== null && frame.score >= minScore
    if (candidate === null) {
      if (good) {
        candidate = frame.gesture
        since = t
        lastMatchT = t
        armed = true
      }
    } else if (good && frame.gesture === candidate) {
      lastMatchT = t
    } else if (t - lastMatchT > maxGapMs) {
      candidate = null
      armed = true
      if (good) {
        candidate = frame.gesture
        since = t
        lastMatchT = t
      }
    }

    let fired: GestureName | null = null
    if (candidate !== null && armed && t - since >= holdMs && t >= cooldownUntil) {
      fired = candidate
      armed = false
      cooldownUntil = t + cooldownMs
    }

    const progress = candidate === null ? 0 : armed ? Math.min(1, Math.max(0, (t - since) / holdMs)) : 1
    return { fired, candidate, progress, armed }
  }

  return { push, reset }
}
