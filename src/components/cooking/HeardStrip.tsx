import { useEffect, useRef, type ReactNode } from 'react'
import { Hand, TriangleAlert } from 'lucide-react'
import type { CommandSource } from '../../lib/commands'
import type { MediaStatus } from '../../lib/mediaErrors'
import { Button, Label } from '../ui/primitives'

export interface HeardData {
  /** Changes on every new message, so a repeat of the same command still flashes. */
  key: number
  kind: CommandSource | 'info'
  /** What the app understood ("Next step") or a plain note. */
  text: string
  /** What the microphone heard, shown in quotes after the text. */
  heard?: string
}

/** A tap is never announced; voice is "HEARD", the rest name their source. */
const KIND_LABEL: Record<HeardData['kind'], string> = { voice: 'Heard', key: 'Key', gesture: 'Gesture', tap: 'Tap', info: 'Note' }

const FLASH_MS = 300 // ds-allow-hardcode: DESIGN.md § Motion, heard flash is 300 ms
/** Cooking-mode targets are 56 px (DESIGN.md). The strip's action is the control that turns voice on. */
const COOKING_TARGET = 'min-h-14!' // ds-allow-hardcode: DESIGN.md § Typography 56 px cooking target

function isFailed(status: MediaStatus): boolean {
  return status === 'denied' || status === 'unavailable' || status === 'error'
}

/** Mono state call-out, at least 0.95 rem so it reads from a metre away. */
function State({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Label className={`inline-flex items-center gap-2.5 text-lg! text-ink! ${className}`}>{children}</Label>
}

function Dot({ on }: { on: 'live' | 'solid' | 'hollow' }) {
  const look = on === 'live' ? 'live-pulse bg-accent' : on === 'solid' ? 'bg-ink' : 'border-2 border-ink-2'
  return <span aria-hidden="true" className={`size-3.5 shrink-0 rounded-full ${look}`} />
}

function Problem({ message, onRetry, canRetry }: { message: string | null; onRetry: () => void; canRetry: boolean }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-accent">
      <span className="flex min-w-0 items-start gap-2">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="min-w-0">{message ?? 'Something went wrong.'}</span>
      </span>
      {canRetry ? (
        <Button variant="secondary" onClick={onRetry} className={`${COOKING_TARGET} px-4!`}>
          Try again
        </Button>
      ) : null}
    </span>
  )
}

function TurnOn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="secondary" onClick={onClick} aria-label={label} className={`${COOKING_TARGET} px-4!`}>
      Turn on
    </Button>
  )
}

interface HeardStripProps {
  heard: HeardData | null
  voiceOn: boolean
  voiceStatus: MediaStatus
  voiceMessage: string | null
  /** The app is reading aloud, so the microphone is deliberately paused. */
  speaking: boolean
  gesturesOn: boolean
  gesturesStatus: MediaStatus
  gesturesMessage: string | null
  onTurnOnVoice: () => void
  onRetryVoice: () => void
  onRetryGestures: () => void
  /** Boxed as a ticket in the rail; an edge-to-edge bar everywhere else. */
  framed: boolean
  /** Phones: ONE 56 px line — state, last heard, and a full-height action at the right edge. */
  compact: boolean
  onFix: (section: 'voice' | 'gestures') => void
}

/**
 * The most prominent status element on the cooking screen: the mic state, the camera state and the last thing
 * understood, in call-and-response language ("HEARD  Next step  "next""). It is the only live region of the screen,
 * so it replaces the old toasts: one place to look. In the wide layout it carries a 2 px ink edge.
 */
export default function HeardStrip({
  heard,
  voiceOn,
  voiceStatus,
  voiceMessage,
  speaking,
  gesturesOn,
  gesturesStatus,
  gesturesMessage,
  onTurnOnVoice,
  onRetryVoice,
  onRetryGestures,
  framed,
  compact,
  onFix,
}: HeardStripProps) {
  const flashRef = useRef<HTMLSpanElement>(null)
  const heardKey = heard?.key
  useEffect(() => {
    if (heardKey === undefined) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    // Web Animations: opacity only, no state, and absent in jsdom.
    flashRef.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: FLASH_MS, easing: 'ease-out' })
  }, [heardKey])

  if (compact) {
    const micBad = voiceOn && isFailed(voiceStatus)
    const camBad = gesturesOn && isFailed(gesturesStatus)
    const bad = micBad ? 'voice' : camBad ? 'gestures' : null
    const word = (status: MediaStatus) => (status === 'denied' ? 'blocked' : status === 'unavailable' ? 'unavailable' : 'error')
    let state: ReactNode
    if (micBad) {
      state = <><TriangleAlert className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />Mic {word(voiceStatus)}</>
    } else if (camBad) {
      state = <><TriangleAlert className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />Camera {word(gesturesStatus)}</>
    } else if (!voiceOn) {
      state = <><Dot on="hollow" />Voice off</>
    } else if (voiceStatus === 'on' && speaking) {
      state = <><Dot on="hollow" />Mic paused</>
    } else if (voiceStatus === 'on') {
      state = <><Dot on="live" />Listening</>
    } else {
      state = <><Dot on="hollow" />Starting mic…</>
    }
    const action = bad
      ? { label: 'Fix', name: `Fix ${bad === 'voice' ? 'microphone' : 'camera'}`, onClick: () => onFix(bad) }
      : !voiceOn
        ? { label: 'Turn on', name: 'Turn on voice', onClick: onTurnOnVoice }
        : null
    return (
      <div
        role="status"
        aria-live="polite"
        data-compact="true"
        className="relative flex min-h-14 shrink-0 items-stretch overflow-hidden border-b border-rule bg-paper"
      >
        <span ref={flashRef} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-accent-soft opacity-0" />
        <div className="relative flex min-w-0 flex-1 items-center gap-3 px-3">
          <State className={`shrink-0 ${bad ? 'text-accent!' : ''}`}>{state}</State>
          {/* Camera state the one-line strip cannot carry; a screen reader still hears it. */}
          <span className="sr-only">
            {speaking && voiceOn && voiceStatus === 'on' ? 'Mic paused while I read. ' : ''}
            {gesturesOn ? (gesturesStatus === 'on' ? 'Camera on.' : '') : 'Gestures off.'}
          </span>
          <span className="relative flex min-w-0 flex-1 items-baseline gap-2">
            {heard ? (
              <>
                <Label className="shrink-0 text-base! text-ink!">{KIND_LABEL[heard.kind]}</Label>
                <span key={heard.key} className="min-w-0 truncate text-lg font-bold text-ink">
                  {heard.text}
                  {heard.heard ? <span className="ml-2 font-normal text-ink-2">“{heard.heard}”</span> : null}
                </span>
              </>
            ) : (
              <span className="min-w-0 truncate text-base text-ink-2">Say “next”.</span>
            )}
          </span>
        </div>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            aria-label={action.name}
            className="label-mono relative shrink-0 cursor-pointer border-l-2 border-rule bg-paper px-4 text-ink hover:bg-paper-2"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    )
  }

  let mic: ReactNode
  if (!voiceOn) {
    mic = (
      <>
        <State>
          <Dot on="hollow" />
          Voice off
        </State>
        <TurnOn onClick={onTurnOnVoice} label="Turn on voice" />
      </>
    )
  } else if (isFailed(voiceStatus)) {
    mic = <Problem message={voiceMessage} onRetry={onRetryVoice} canRetry={voiceStatus !== 'unavailable'} />
  } else if (voiceStatus === 'on' && speaking) {
    mic = (
      <State>
        <Dot on="hollow" />
        Mic paused while I read
      </State>
    )
  } else if (voiceStatus === 'on') {
    mic = (
      <State>
        <Dot on="live" />
        Listening
      </State>
    )
  } else {
    mic = (
      <State>
        <Dot on="hollow" />
        Starting mic…
      </State>
    )
  }

  let camera: ReactNode
  if (!gesturesOn) {
    // No "Turn on" here: gestures are a secondary channel and switch on in the help sheet; the strip stays one row.
    camera = (
      <State>
        <Hand className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        Gestures off
      </State>
    )
  } else if (isFailed(gesturesStatus)) {
    camera = <Problem message={gesturesMessage} onRetry={onRetryGestures} canRetry={gesturesStatus !== 'unavailable'} />
  } else {
    camera = (
      <State>
        <Hand className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        {gesturesStatus === 'on' ? 'Camera on' : 'Starting camera…'}
      </State>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative shrink-0 overflow-hidden bg-paper ${framed ? 'ticket border-2! border-ink!' : 'border-b border-rule'}`}
    >
      <span ref={flashRef} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-accent-soft opacity-0" />
      <div className="relative flex flex-col gap-1.5 px-3 py-2 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">{mic}</div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">{camera}</div>
        </div>
        <p className="flex min-w-0 items-baseline gap-3">
          <Label className="shrink-0 text-lg! text-ink!">{heard ? KIND_LABEL[heard.kind] : 'Heard'}</Label>
          {heard ? (
            <span key={heard.key} className="line-clamp-2 min-w-0 text-xl font-bold break-words text-ink">
              {heard.text}
              {heard.heard ? <span className="ml-3 font-normal text-ink-2">“{heard.heard}”</span> : null}
            </span>
          ) : (
            <span className="line-clamp-2 min-w-0 text-xl text-ink-2">
              {voiceOn ? 'Say “next”, “back” or “repeat”.' : 'Turn voice on to call the steps out.'}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
