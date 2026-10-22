/**
 * Three short sine beeps for "timer done". Autoplay policy may block audio before any user
 * gesture; that is expected, so every failure is swallowed (no sound, no console output).
 */
let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (ctx) return ctx
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
  const Ctor = w.AudioContext ?? w.webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

/**
 * Creates and resumes the shared AudioContext. Call it from a user gesture: iOS only unlocks
 * audio inside one, so a context first created in a timer callback stays silent. Safe to repeat.
 */
export function primeAudio(): void {
  try {
    const audio = getContext()
    if (audio && audio.state === 'suspended') void audio.resume().catch(() => {})
  } catch {
    // Audio is a nicety.
  }
}

export function playChime(): void {
  try {
    const audio = getContext()
    if (!audio) return
    if (audio.state === 'suspended') void audio.resume().catch(() => {})
    const start = audio.currentTime
    for (let i = 0; i < 3; i++) {
      const t0 = start + i * 0.27 // 150 ms beep + 120 ms gap
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      // Quick attack/release so the beep does not click.
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.25, t0 + 0.01)
      gain.gain.setValueAtTime(0.25, t0 + 0.13)
      gain.gain.linearRampToValueAtTime(0, t0 + 0.15)
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(t0)
      osc.stop(t0 + 0.16)
    }
  } catch {
    // Audio is a nicety; the visual and spoken completion still happen.
  }
}

// Unlock audio on the first user gesture. The context is deliberately NOT created before one,
// so Chrome does not log "The AudioContext was not allowed to start".
if (typeof window !== 'undefined') {
  const unlock = () => {
    window.removeEventListener('pointerdown', unlock, true)
    window.removeEventListener('keydown', unlock, true)
    primeAudio()
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
}
