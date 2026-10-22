import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  state = 'suspended'
  currentTime = 0
  destination = {}
  resume = vi.fn(() => Promise.resolve())
  createOscillator = vi.fn(() => ({ type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }))
  createGain = vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }))
  constructor() {
    FakeAudioContext.instances.push(this)
  }
}

describe('chime', () => {
  beforeEach(() => {
    vi.resetModules()
    FakeAudioContext.instances = []
    vi.stubGlobal('AudioContext', FakeAudioContext)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('creates no AudioContext on import, only on the first gesture, then stops listening', async () => {
    await import('./chime')
    expect(FakeAudioContext.instances).toHaveLength(0)
    window.dispatchEvent(new Event('pointerdown'))
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].resume).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('keydown'))
    window.dispatchEvent(new Event('pointerdown'))
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].resume).toHaveBeenCalledTimes(1)
  })

  it('a keydown also unlocks', async () => {
    await import('./chime')
    window.dispatchEvent(new Event('keydown'))
    expect(FakeAudioContext.instances).toHaveLength(1)
    window.dispatchEvent(new Event('pointerdown'))
    expect(FakeAudioContext.instances).toHaveLength(1)
  })

  it('primeAudio is repeatable and shares one context with playChime', async () => {
    const { primeAudio, playChime } = await import('./chime')
    primeAudio()
    primeAudio()
    playChime()
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].createOscillator).toHaveBeenCalledTimes(3)
  })

  it('swallows every error', async () => {
    const { primeAudio, playChime } = await import('./chime')
    vi.stubGlobal('AudioContext', function Broken() {
      throw new Error('blocked')
    })
    expect(() => primeAudio()).not.toThrow()
    expect(() => playChime()).not.toThrow()
  })
})
