/**
 * Three short sine beeps for "timer done". Autoplay policy may block audio before any user
 * gesture; that is expected, so every failure is swallowed (no sound, no console output).
 */
let ctx: AudioContext | null = null

export function playChime(): void {
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
    const Ctor = w.AudioContext ?? w.webkitAudioContext
    if (!Ctor) return
    if (!ctx) ctx = new Ctor()
    const audio = ctx
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
