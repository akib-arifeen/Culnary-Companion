import { describe, it, expect } from 'vitest'
import {
  GESTURE_COMMANDS,
  GESTURE_GUIDE,
  GESTURE_NAMES,
  DEFAULT_STABILIZER_OPTIONS,
  createGestureStabilizer,
  isGestureName,
  type GestureName,
  type StabilizerOptions,
} from './gestures'

describe('GESTURE_COMMANDS', () => {
  it('maps each gesture to its command', () => {
    expect(GESTURE_COMMANDS.Thumb_Up).toEqual({ type: 'next' })
    expect(GESTURE_COMMANDS.Thumb_Down).toEqual({ type: 'previous' })
    expect(GESTURE_COMMANDS.Open_Palm).toEqual({ type: 'repeat' })
    expect(GESTURE_COMMANDS.Pointing_Up).toEqual({ type: 'startTimer' })
    expect(GESTURE_COMMANDS.Victory).toEqual({ type: 'toggleIngredients' })
    expect(GESTURE_COMMANDS.Closed_Fist).toEqual({ type: 'toggleTimer' })
  })

  it('leaves ILoveYou deliberately unbound', () => {
    expect(GESTURE_COMMANDS.ILoveYou).toBeNull()
  })

  it('has an entry for every gesture name', () => {
    expect(Object.keys(GESTURE_COMMANDS).sort()).toEqual([...GESTURE_NAMES].sort())
  })

  it('GESTURE_GUIDE covers exactly the bound gestures', () => {
    const bound = GESTURE_NAMES.filter((g) => GESTURE_COMMANDS[g] !== null).sort()
    expect(GESTURE_GUIDE.map((g) => g.gesture).sort()).toEqual(bound)
    for (const g of GESTURE_GUIDE) {
      expect(g.title).not.toBe('')
      expect(g.action).not.toBe('')
      expect(g.hint).not.toBe('')
    }
  })
})

describe('isGestureName', () => {
  it.each(GESTURE_NAMES)('accepts %s', (name) => {
    expect(isGestureName(name)).toBe(true)
  })

  it.each(['None', '', 'thumb_up', 'Thumb Up', 'Wave', 'ILoveYou ', 'constructor', 'toString'])('rejects %j', (value) => {
    expect(isGestureName(value)).toBe(false)
  })
})

// --- stabilizer helpers -----------------------------------------------------

type Frame = { g: GestureName | null; t: number; score?: number }

function run(options: Partial<StabilizerOptions>, frames: Frame[]) {
  const s = createGestureStabilizer(options)
  return frames.map((f) => ({ t: f.t, out: s.push({ gesture: f.g, score: f.score ?? 0.9, t: f.t }) }))
}

/** Frames of one gesture (or null) every `step` ms over [from, to] inclusive. */
function span(g: GestureName | null, from: number, to: number, step = 50, score?: number): Frame[] {
  const frames: Frame[] = []
  for (let t = from; t <= to; t += step) frames.push({ g, t, score })
  return frames
}

const firedAt = (results: ReturnType<typeof run>) =>
  results.filter((r) => r.out.fired !== null).map((r) => [r.out.fired, r.t] as const)

describe('createGestureStabilizer', () => {
  it('exposes the documented defaults', () => {
    expect(DEFAULT_STABILIZER_OPTIONS).toEqual({ holdMs: 450, minScore: 0.6, maxGapMs: 200, cooldownMs: 700 })
  })

  it('fires exactly once, at holdMs, and not before', () => {
    const r = run({}, span('Thumb_Up', 1000, 1449, 1).concat(span('Thumb_Up', 1450, 1450)))
    expect(firedAt(r)).toEqual([['Thumb_Up', 1450]])
  })

  it('fires on the first frame at or after holdMs when frames are sparse', () => {
    const r = run({}, [
      { g: 'Victory', t: 0 },
      { g: 'Victory', t: 300 },
      { g: 'Victory', t: 460 },
      { g: 'Victory', t: 500 },
    ])
    expect(firedAt(r)).toEqual([['Victory', 460]])
  })

  it('one frame never fires', () => {
    expect(firedAt(run({}, [{ g: 'Thumb_Up', t: 0 }]))).toEqual([])
  })

  it('a score below minScore never fires and never creates a candidate', () => {
    const r = run({}, span('Thumb_Up', 0, 3000, 50, 0.59))
    expect(firedAt(r)).toEqual([])
    for (const x of r) {
      expect(x.out.candidate).toBeNull()
      expect(x.out.progress).toBe(0)
    }
  })

  it('a score exactly at minScore counts', () => {
    const r = run({}, span('Thumb_Up', 0, 500, 50, 0.6))
    expect(firedAt(r)).toEqual([['Thumb_Up', 450]])
  })

  it('null gestures never fire', () => {
    expect(firedAt(run({}, span(null, 0, 3000)))).toEqual([])
  })

  it('flicker within maxGapMs does not reset the hold', () => {
    const frames: Frame[] = [
      { g: 'Thumb_Up', t: 0 },
      { g: null, t: 100 },
      { g: 'Thumb_Up', t: 200 },
      { g: null, t: 300 },
      { g: 'Thumb_Up', t: 400 },
      { g: 'Thumb_Up', t: 450 },
    ]
    const r = run({}, frames)
    expect(firedAt(r)).toEqual([['Thumb_Up', 450]])
    // the flicker frame keeps the candidate
    expect(r[1].out.candidate).toBe('Thumb_Up')
    expect(r[3].out.candidate).toBe('Thumb_Up')
  })

  it('a low-score frame inside the gap is also just flicker', () => {
    const r = run({}, [
      { g: 'Thumb_Up', t: 0 },
      { g: 'Thumb_Up', t: 150, score: 0.2 },
      { g: 'Thumb_Up', t: 300 },
      { g: 'Thumb_Up', t: 450 },
    ])
    expect(firedAt(r)).toEqual([['Thumb_Up', 450]])
  })

  it('a gap of exactly maxGapMs is still tolerated', () => {
    const r = run({}, [
      { g: 'Thumb_Up', t: 0 },
      { g: null, t: 200 },
      { g: 'Thumb_Up', t: 450 },
    ])
    expect(firedAt(r)).toEqual([['Thumb_Up', 450]])
  })

  it('a gap longer than maxGapMs resets the hold', () => {
    const r = run({}, [
      { g: 'Thumb_Up', t: 0 },
      { g: null, t: 250 },
      { g: 'Thumb_Up', t: 300 },
      { g: 'Thumb_Up', t: 450 },
      { g: 'Thumb_Up', t: 700 },
      { g: 'Thumb_Up', t: 750 },
    ])
    // new hold started at 300 -> fires at 750, not at 450
    expect(firedAt(r)).toEqual([['Thumb_Up', 750]])
    expect(r[1].out.candidate).toBeNull()
  })

  it('holding after the fire never re-fires', () => {
    const r = run({}, span('Thumb_Up', 0, 10_000))
    expect(firedAt(r)).toEqual([['Thumb_Up', 450]])
  })

  it('releasing then showing the gesture again fires again (after cooldown)', () => {
    const r = run({}, [...span('Thumb_Up', 0, 450), ...span(null, 500, 700), ...span('Thumb_Up', 750, 1500)])
    expect(firedAt(r)).toEqual([
      ['Thumb_Up', 450],
      ['Thumb_Up', 1200],
    ])
  })

  it('switching gesture mid-hold restarts the hold', () => {
    const r = run({}, [...span('Thumb_Up', 0, 200), ...span('Thumb_Down', 250, 1000)])
    // Thumb_Up never reached 450 ms; Thumb_Down is taken over at t=450 (gap > 200) and fires 450 ms later
    expect(firedAt(r)).toEqual([['Thumb_Down', 900]])
  })

  it('a different gesture fired too soon waits out the cooldown', () => {
    const opts = { holdMs: 100, maxGapMs: 50, cooldownMs: 500 }
    const r = run(opts, [...span('Victory', 0, 100), ...span('Open_Palm', 150, 800)])
    expect(firedAt(r)).toEqual([
      ['Victory', 100],
      ['Open_Palm', 600],
    ])
  })

  it('the same gesture re-shown during cooldown also waits', () => {
    const opts = { holdMs: 100, maxGapMs: 50, cooldownMs: 500 }
    const r = run(opts, [...span('Victory', 0, 100), ...span(null, 150, 250), ...span('Victory', 300, 800)])
    expect(firedAt(r)).toEqual([
      ['Victory', 100],
      ['Victory', 600],
    ])
  })

  describe('progress / candidate / armed', () => {
    it('is 0 with no candidate', () => {
      const out = run({}, [{ g: null, t: 0 }])[0].out
      expect(out.progress).toBe(0)
      expect(out.candidate).toBeNull()
      expect(out.fired).toBeNull()
    })

    it('grows mid-hold', () => {
      const r = run({}, [
        { g: 'Closed_Fist', t: 0 },
        { g: 'Closed_Fist', t: 225 },
        { g: 'Closed_Fist', t: 360 },
      ])
      expect(r[0].out.progress).toBe(0)
      expect(r[0].out.candidate).toBe('Closed_Fist')
      expect(r[0].out.armed).toBe(true)
      expect(r[1].out.progress).toBeCloseTo(0.5, 5)
      expect(r[2].out.progress).toBeCloseTo(0.8, 5)
      expect(r[2].out.fired).toBeNull()
    })

    it('is 1 on the firing frame and stays 1 while the gesture is held', () => {
      const r = run({}, span('Closed_Fist', 0, 1500))
      const fireIdx = r.findIndex((x) => x.out.fired)
      expect(r[fireIdx].out.progress).toBe(1)
      expect(r[fireIdx].out.armed).toBe(false)
      for (const x of r.slice(fireIdx)) {
        expect(x.out.progress).toBe(1)
        expect(x.out.candidate).toBe('Closed_Fist')
        expect(x.out.armed).toBe(false)
      }
    })

    it('with holdMs 1000: held frames after the fire report progress exactly 1 and armed false', () => {
      const r = run({ holdMs: 1000 }, [...span('Thumb_Up', 0, 1000, 100), { g: 'Thumb_Up', t: 1100 }, { g: 'Thumb_Up', t: 1300 }])
      expect(firedAt(r)).toEqual([['Thumb_Up', 1000]])
      for (const x of r.slice(-2)) {
        expect(x.out.fired).toBeNull()
        expect(x.out.progress).toBe(1)
        expect(x.out.armed).toBe(false)
        expect(x.out.candidate).toBe('Thumb_Up')
      }
    })

    it('never exceeds 1 and is armed before firing', () => {
      const r = run({}, span('Victory', 0, 449))
      for (const x of r) {
        expect(x.out.progress).toBeLessThanOrEqual(1)
        expect(x.out.armed).toBe(true)
      }
    })

    it('drops to 0 and re-arms once the hand has left', () => {
      const r = run({}, [...span('Thumb_Up', 0, 450), ...span(null, 500, 700)])
      const last = r[r.length - 1].out
      expect(last.candidate).toBeNull()
      expect(last.progress).toBe(0)
      expect(last.armed).toBe(true)
    })

    it('`fired` is null on every frame except the firing one', () => {
      const r = run({}, span('Thumb_Up', 0, 2000))
      expect(r.filter((x) => x.out.fired !== null)).toHaveLength(1)
    })
  })

  describe('reset()', () => {
    it('forgets a partial hold', () => {
      const s = createGestureStabilizer()
      for (const f of span('Thumb_Up', 0, 400)) s.push({ gesture: f.g, score: 0.9, t: f.t })
      s.reset()
      const fired: number[] = []
      for (const f of span('Thumb_Up', 450, 1000)) {
        if (s.push({ gesture: f.g, score: 0.9, t: f.t }).fired) fired.push(f.t)
      }
      // hold starts again at 450, so it fires at 900 and not at 450
      expect(fired).toEqual([900])
    })

    it('clears the cooldown and the disarmed state', () => {
      const s = createGestureStabilizer()
      const fired: number[] = []
      for (const f of span('Thumb_Up', 0, 450)) {
        if (s.push({ gesture: f.g, score: 0.9, t: f.t }).fired) fired.push(f.t)
      }
      s.reset()
      for (const f of span('Thumb_Up', 500, 1000)) {
        if (s.push({ gesture: f.g, score: 0.9, t: f.t }).fired) fired.push(f.t)
      }
      // without reset: held gesture never re-fires; with reset and cooldown cleared it fires 450 ms after 500
      expect(fired).toEqual([450, 950])
    })

    it('puts the output back to idle', () => {
      const s = createGestureStabilizer()
      s.push({ gesture: 'Victory', score: 0.9, t: 0 })
      s.reset()
      const out = s.push({ gesture: null, score: 0, t: 10 })
      expect(out).toEqual({ fired: null, candidate: null, progress: 0, armed: true })
    })
  })

  describe('custom options', () => {
    it('holdMs', () => {
      const r = run({ holdMs: 100 }, span('Thumb_Up', 0, 300))
      expect(firedAt(r)).toEqual([['Thumb_Up', 100]])
    })

    it('minScore', () => {
      expect(firedAt(run({ minScore: 0.9 }, span('Thumb_Up', 0, 1000, 50, 0.8)))).toEqual([])
      expect(firedAt(run({ minScore: 0.9 }, span('Thumb_Up', 0, 1000, 50, 0.95)))).toEqual([['Thumb_Up', 450]])
    })

    it('maxGapMs', () => {
      const frames: Frame[] = [
        { g: 'Thumb_Up', t: 0 },
        { g: null, t: 100 },
        { g: 'Thumb_Up', t: 200 },
        { g: 'Thumb_Up', t: 450 },
      ]
      // gap tolerance 50: the null at 100 is a real release, so the hold restarts at 200
      expect(firedAt(run({ maxGapMs: 50 }, frames))).toEqual([])
      expect(firedAt(run({ maxGapMs: 50 }, [...frames, { g: 'Thumb_Up', t: 650 }]))).toEqual([['Thumb_Up', 650]])
    })

    it('cooldownMs', () => {
      const frames = [...span('Victory', 0, 450), ...span('Open_Palm', 500, 1500)]
      // default cooldown 700 keeps Open_Palm (held from 700) waiting until 1150
      expect(firedAt(run({}, frames)).map(([, t]) => t)).toEqual([450, 1150])
      // cooldown 0: Open_Palm fires as soon as its own hold completes (700 + 450)
      expect(firedAt(run({ cooldownMs: 0 }, frames)).map(([, t]) => t)).toEqual([450, 1150])
      // long cooldown pushes it out
      expect(firedAt(run({ cooldownMs: 1000 }, frames)).map(([, t]) => t)).toEqual([450, 1450])
    })

    it('partial options keep the other defaults', () => {
      // default minScore 0.6 still applies when only holdMs is overridden
      expect(firedAt(run({ holdMs: 100 }, span('Thumb_Up', 0, 300, 50, 0.5)))).toEqual([])
      expect(firedAt(run({ holdMs: 100 }, span('Thumb_Up', 0, 300, 50, 0.7)))).toEqual([['Thumb_Up', 100]])
    })
  })

  it('instances do not share state', () => {
    const a = createGestureStabilizer()
    const b = createGestureStabilizer()
    for (const f of span('Thumb_Up', 0, 400)) a.push({ gesture: f.g, score: 0.9, t: f.t })
    expect(b.push({ gesture: 'Thumb_Up', score: 0.9, t: 450 }).fired).toBeNull()
  })
})
