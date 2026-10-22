import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpeechSynthesisApi } from './contracts'

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  return en.find((v) => v.localService) ?? en.find((v) => v.default) ?? en[0]
}

export function useSpeechSynthesis({ rate = 1 }: { rate?: number } = {}): SpeechSynthesisApi {
  const supported = isSupported()
  const [speaking, setSpeaking] = useState(false)
  const rateRef = useRef(rate)
  const currentRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    rateRef.current = rate
  }, [rate])

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) clearTimeout(watchdogRef.current)
    watchdogRef.current = null
  }, [])

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const refresh = () => {
      voiceRef.current = pickVoice(synth.getVoices())
    }
    refresh()
    synth.addEventListener?.('voiceschanged', refresh)
    return () => {
      synth.removeEventListener?.('voiceschanged', refresh)
      // Unmount: stop talking and make late events from the old utterance harmless.
      currentRef.current = null
      clearWatchdog()
      synth.cancel()
    }
  }, [supported, clearWatchdog])

  const cancel = useCallback(() => {
    if (!isSupported()) return
    currentRef.current = null
    clearWatchdog()
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [clearWatchdog])

  const speak = useCallback(
    (text: string) => {
      if (!isSupported() || text.trim() === '') return
      const synth = window.speechSynthesis
      clearWatchdog()
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = rateRef.current
      if (voiceRef.current) utterance.voice = voiceRef.current
      const finish = () => {
        // Only the CURRENT utterance may end speaking; cancelling the previous one fires its
        // end/error ('interrupted' / 'canceled') after the new one has already started.
        if (currentRef.current !== utterance) return
        currentRef.current = null
        clearWatchdog()
        setSpeaking(false)
      }
      utterance.onend = finish
      utterance.onerror = finish
      currentRef.current = utterance
      // Immediately, so the microphone is muted before any audio is produced.
      setSpeaking(true)
      synth.speak(utterance)
      watchdogRef.current = setTimeout(finish, text.length * 90 + 4000)
    },
    [clearWatchdog],
  )

  return { supported, speaking, speak, cancel }
}
