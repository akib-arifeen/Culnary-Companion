import { useEffect, useRef, useState } from 'react'
import { describeMediaError, describeSpeechError, type MediaProblem, type MediaStatus } from '../lib/mediaErrors'
import type { SpeechCommandsApi, SpeechCommandsOptions } from './contracts'

// The DOM lib does not ship SpeechRecognition typings; this is the slice we use.
interface RecognitionAlternative {
  transcript: string
}
interface RecognitionResult {
  isFinal: boolean
  0: RecognitionAlternative
}
interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<RecognitionResult>
}
interface Recognition {
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: RecognitionEvent) => void) | null
  start(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function inIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

const BASE_BACKOFF_MS = 300
const MAX_BACKOFF_MS = 5000
const MAX_CONSECUTIVE_ERRORS = 3
const POST_MUTE_GRACE_MS = 600
const HEARD_MS = 4000

export function useSpeechCommands({ enabled, muted, onTranscript, lang = 'en-US' }: SpeechCommandsOptions): SpeechCommandsApi {
  const supported = !!getCtor()
  const [status, setStatus] = useState<MediaStatus>('off')
  const [message, setMessage] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)

  const onTranscriptRef = useRef(onTranscript)
  const mutedRef = useRef(muted)
  const mutedFalseAtRef = useRef(Number.NEGATIVE_INFINITY)
  // Registered by the running session so a mute change can abort / schedule a restart of it.
  const muteChangeRef = useRef<((muted: boolean) => void) | null>(null)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    if (mutedRef.current && !muted) mutedFalseAtRef.current = Date.now()
    mutedRef.current = muted
    muteChangeRef.current?.(muted)
  }, [muted])

  useEffect(() => {
    if (!enabled) return
    const ctx = { inIframe: inIframe() }
    const surface = (problem: MediaProblem) => {
      setStatus(problem.status)
      setMessage(problem.message)
    }

    const Ctor = getCtor()
    if (!Ctor) {
      surface(describeMediaError('microphone', { name: 'UnsupportedError' }, ctx))
      return () => {
        setStatus('off')
        setMessage(null)
      }
    }

    let disabled = false
    let fatal = false
    let isListening = false
    let startedAt = 0
    let backoff = BASE_BACKOFF_MS
    let consecutiveErrors = 0
    let restartTimer: ReturnType<typeof setTimeout> | null = null
    let heardTimer: ReturnType<typeof setTimeout> | null = null
    let rec: Recognition | null = null

    const clearRestart = () => {
      if (restartTimer !== null) clearTimeout(restartTimer)
      restartTimer = null
    }

    const startRecognition = () => {
      if (disabled || fatal || !rec || mutedRef.current) return
      try {
        rec.start()
      } catch {
        // Already started (InvalidStateError): the running session will deliver events.
      }
    }

    const scheduleRestart = () => {
      if (disabled || fatal || mutedRef.current || restartTimer !== null) return
      restartTimer = setTimeout(() => {
        restartTimer = null
        startRecognition()
      }, backoff)
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
    }

    const fail = (problem: MediaProblem) => {
      fatal = true
      clearRestart()
      isListening = false
      setListening(false)
      surface(problem)
      try {
        rec?.abort()
      } catch {
        // nothing to abort
      }
    }

    const onVisibility = () => {
      if (document.hidden || disabled || fatal || isListening) return
      clearRestart()
      startRecognition()
    }

    // Muting aborts the engine: audio captured while the app speaks is discarded, so an echo of
    // our own speech can never be finalised late (Chrome may finalise >600 ms after the audio).
    // Unmuting restarts after the grace period; at most one restart is ever pending.
    const onMuteChange = (isMuted: boolean) => {
      if (disabled || fatal || !rec) return
      clearRestart()
      if (isMuted) {
        isListening = false
        setListening(false)
        try {
          rec.abort()
        } catch {
          // nothing to abort
        }
      } else if (!document.hidden) {
        restartTimer = setTimeout(() => {
          restartTimer = null
          startRecognition()
        }, POST_MUTE_GRACE_MS)
      }
    }
    muteChangeRef.current = onMuteChange

    const begin = async () => {
      setStatus('starting')
      setMessage(null)
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          // Gives a clean permission prompt and a precise error before the engine starts.
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach((track) => track.stop())
        } catch (err) {
          if (!disabled) surface(describeMediaError('microphone', err, ctx))
          return
        }
        if (disabled) return
      }
      rec = new Ctor()
      rec.continuous = true
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.lang = lang
      rec.onstart = () => {
        if (disabled || fatal) return
        isListening = true
        startedAt = Date.now()
        setListening(true)
        setStatus('on')
        setMessage(null)
      }
      rec.onend = () => {
        isListening = false
        if (disabled) return
        setListening(false)
        if (fatal || document.hidden) return
        if (Date.now() - startedAt >= 1000) backoff = BASE_BACKOFF_MS
        scheduleRestart()
      }
      rec.onerror = (event) => {
        if (disabled || fatal) return
        const problem = describeSpeechError(event.error, ctx)
        if (!problem) return // no-speech / aborted: onend restarts
        if (problem.status === 'error') {
          consecutiveErrors += 1
          if (consecutiveErrors < MAX_CONSECUTIVE_ERRORS) return // transient: onend retries with backoff
        }
        fail(problem)
      }
      rec.onresult = (event) => {
        if (disabled) return
        backoff = BASE_BACKOFF_MS
        consecutiveErrors = 0
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (!result.isFinal) continue
          const transcript = result[0]?.transcript?.trim() ?? ''
          if (!transcript) continue
          if (mutedRef.current || Date.now() - mutedFalseAtRef.current < POST_MUTE_GRACE_MS) continue
          onTranscriptRef.current(transcript)
          setHeard(transcript)
          if (heardTimer !== null) clearTimeout(heardTimer)
          heardTimer = setTimeout(() => {
            heardTimer = null
            setHeard(null)
          }, HEARD_MS)
        }
      }
      startRecognition()
    }

    document.addEventListener('visibilitychange', onVisibility)
    void begin()

    return () => {
      disabled = true
      muteChangeRef.current = null
      document.removeEventListener('visibilitychange', onVisibility)
      clearRestart()
      if (heardTimer !== null) clearTimeout(heardTimer)
      try {
        rec?.abort()
      } catch {
        // already stopped
      }
      setListening(false)
      setHeard(null)
      setStatus('off')
      setMessage(null)
    }
  }, [enabled, lang])

  return { status, message, supported, listening, heard }
}
