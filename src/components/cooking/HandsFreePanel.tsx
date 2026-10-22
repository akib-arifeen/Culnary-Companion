import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { CircleCheck, ExternalLink, Hand, Mic, TriangleAlert, Volume2, X } from 'lucide-react'
import type { GestureLive, SpeechCommandsApi } from '../../hooks/contracts'
import { describeCommand } from '../../lib/commands'
import { GESTURE_GUIDE, type GestureName } from '../../lib/gestures'
import { KEY_GUIDE } from '../../lib/keyboard'
import type { MediaStatus } from '../../lib/mediaErrors'
import { parseVoiceCommand } from '../../lib/voiceParser'
import { buttonClass } from '../ui/buttonClass'
import { Button, Label } from '../ui/primitives'
import GestureIcon from './GestureIcon'
import GestureReadout from './GestureReadout'
import ProgressRing from './ProgressRing'
import { useDialogFocus } from './useDialogFocus'

interface HandsFreePanelProps {
  /** Not yet onboarded: the footer button says "Start cooking" instead of "Back to cooking". */
  firstTime: boolean
  onClose: () => void
  gesturesOn: boolean
  onToggleGestures: () => void
  onRetryGestures: () => void
  gesturesStatus: MediaStatus
  gesturesMessage: string | null
  live: GestureLive
  videoRef: RefObject<HTMLVideoElement>
  /** Gestures the user has performed while the panel was open. */
  learned: ReadonlySet<GestureName>
  voiceOn: boolean
  onToggleVoice: () => void
  onRetryVoice: () => void
  voice: SpeechCommandsApi
  /** The app is speaking; the microphone is paused until it finishes. */
  speaking: boolean
  speakSteps: boolean
  onToggleSpeakSteps: () => void
  /** Lower-case name of the recipe's first ingredient, for the "check ..." example. */
  ingredientExample: string
  inIframe: boolean
  /** Open scrolled to this part (the HEARD strip's FIX button). */
  focusSection?: 'voice' | 'gestures' | null
}

/** A real switch: role=switch, a visible On/Off word (colour is never the only cue), 56 px tall. */
function Switch({ on, onToggle, icon, children }: { on: boolean; onToggle: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-(--radius-control) border-2 px-4 text-left ${
        on ? 'border-ink bg-ink text-paper' : 'border-ink-2 bg-paper text-ink hover:bg-paper-2'
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 text-lg font-bold">{children}</span>
      <span className="label-mono shrink-0 text-base!">{on ? 'On' : 'Off'}</span>
    </button>
  )
}

function StatusLine({
  status,
  message,
  messages,
  inIframe,
  onRetry,
}: {
  status: MediaStatus
  message: string | null
  messages: { off: string; starting: string; on: ReactNode }
  inIframe: boolean
  onRetry: () => void
}) {
  if (status === 'denied' || status === 'unavailable' || status === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-accent">
        <p className="flex min-w-0 flex-1 basis-60 items-start gap-2 text-base font-semibold">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>{message}</span>
        </p>
        {status !== 'unavailable' ? (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        {inIframe && status === 'denied' ? (
          <a href={window.location.href} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary', 'md')}>
            Open in a new tab
            <ExternalLink className="size-4" strokeWidth={2} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    )
  }
  const text = status === 'starting' ? messages.starting : status === 'on' ? messages.on : messages.off
  return <p className="text-base text-ink-2">{text}</p>
}

function GestureTile({
  gesture,
  title,
  action,
  hint,
  state,
  progress,
}: {
  gesture: GestureName
  title: string
  action: string
  hint: string
  state: 'idle' | 'holding' | 'learned'
  progress: number
}) {
  return (
    <li
      className={`flex items-center gap-2.5 rounded-(--radius-ticket) border-2 bg-paper p-2 ${
        state === 'holding' ? 'border-accent' : state === 'learned' ? 'border-ink' : 'border-rule'
      }`}
    >
      <span className="relative grid size-11 shrink-0 place-items-center text-accent">
        {state === 'holding' ? <ProgressRing progress={progress} size={44} strokeWidth={4} className="absolute" /> : null}
        <span className="grid size-9 place-items-center text-ink">
          {state === 'learned' ? <CircleCheck className="size-7" strokeWidth={2} aria-hidden="true" /> : <GestureIcon gesture={gesture} className="size-6" />}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-base leading-tight font-bold text-ink">
          {title} · {action}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-ink-2">{hint}</span>
        <span className="sr-only">{state === 'learned' ? 'Learned' : state === 'holding' ? 'Holding' : 'Not tried yet'}</span>
      </span>
    </li>
  )
}

/** Numbered block of the "Before service" sheet. */
function Part({ n, id, title, className = '', children }: { n: number; id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`flex flex-col gap-3 rounded-(--radius-ticket) border border-rule bg-paper-2 p-4 ${className}`}>
      <h3 id={id} className="flex items-baseline gap-3 text-xl font-extrabold text-ink">
        <span aria-hidden="true" className="font-mono text-title leading-none tabular-nums text-ink-2">
          {n}
        </span>
        <span className="uppercase tracking-wider">{title}</span>
      </h3>
      {children}
    </section>
  )
}

/**
 * "Before service": the hands-free setup sheet. Voice first (what it does, its switch, a live "say next" test),
 * then gestures (switch, live preview, six practice tiles), then touch and keys. One ink button closes it.
 */
export default function HandsFreePanel({
  firstTime,
  onClose,
  gesturesOn,
  onToggleGestures,
  onRetryGestures,
  gesturesStatus,
  gesturesMessage,
  live,
  videoRef,
  learned,
  voiceOn,
  onToggleVoice,
  onRetryVoice,
  voice,
  speaking,
  speakSteps,
  onToggleSpeakSteps,
  ingredientExample,
  inIframe,
  focusSection = null,
}: HandsFreePanelProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  useDialogFocus(dialogRef, headingRef, onClose)
  useEffect(() => {
    if (focusSection) document.getElementById(`${titleId}-${focusSection}`)?.scrollIntoView?.({ block: 'start' })
  }, [focusSection, titleId])

  const practised = GESTURE_GUIDE.filter((g) => learned.has(g.gesture)).length
  const phrases = ['next', 'back', 'repeat', 'ingredients', 'timer for 5 minutes', ingredientExample ? `check ${ingredientExample}` : '', 'stop', 'help'].filter(Boolean)
  const showPreview = gesturesOn && (gesturesStatus === 'on' || gesturesStatus === 'starting')
  const understood = voice.heard ? parseVoiceCommand(voice.heard, { ingredientNames: [] }) : null

  return (
    <div className="fixed inset-0 z-40 flex bg-ink/60 sm:items-center sm:justify-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ticket flex h-full w-full flex-col max-sm:rounded-none! max-sm:border-0! sm:h-auto sm:max-h-[min(100%,56rem)] sm:max-w-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="flex min-w-0 flex-col outline-hidden">
            <Label>Hands-free setup</Label>
            <span className="text-title font-extrabold text-ink">Before service</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="grid size-14 shrink-0 cursor-pointer place-items-center rounded-(--radius-control) text-ink hover:bg-paper-2"
          >
            <X className="size-7" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="perforation shrink-0" aria-hidden="true" />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          <Part n={1} id={`${titleId}-voice`} title="Voice">
            <p className="text-base text-ink">Say what you want and the recipe follows. Hands stay on the food.</p>
            <Switch on={voiceOn} onToggle={onToggleVoice} icon={<Mic className="size-6 shrink-0" strokeWidth={2} aria-hidden="true" />}>
              Voice commands
            </Switch>
            <StatusLine
              status={voice.status}
              message={voice.message}
              inIframe={inIframe}
              onRetry={onRetryVoice}
              messages={{
                off: 'The microphone is off. Turn voice on to use it.',
                starting: 'Starting microphone…',
                on: 'Listening. Uses your browser’s speech service.',
              }}
            />
            {voiceOn ? (
              <div className="rounded-(--radius-ticket) border-2 border-ink-2 bg-paper p-3">
                <Label>Test it</Label>
                <p className="mt-1 text-xl font-bold text-ink">Say “next” to test</p>
                <p className="mt-1 min-h-6 text-base text-ink">
                  {voice.heard ? (
                    <>
                      Heard: “{voice.heard}”{understood ? <span className="font-bold"> Understood: {describeCommand(understood)}</span> : null}
                    </>
                  ) : (
                    <span className="text-ink-2">Heard: nothing yet</span>
                  )}
                </p>
              </div>
            ) : (
              <div aria-disabled="true" className="rounded-(--radius-ticket) border-2 border-dashed border-rule bg-paper p-3 opacity-60">
                <Label>Test it</Label>
                <p className="mt-1 text-xl font-bold text-ink-2">Turn voice on first</p>
              </div>
            )}
            <p aria-live="polite" className="text-base text-ink-2">
              {speaking ? 'Listening resumes when I finish speaking.' : null}
            </p>
            <p className="text-sm text-ink-2">I stop listening while I read a step aloud. Speak after I finish, or tap Stop reading.</p>
            <ul className="flex flex-wrap gap-2">
              {phrases.map((phrase) => (
                <li key={phrase} className="rounded-full border-2 border-ink-2 bg-paper px-3 py-1 text-base font-semibold text-ink">
                  “{phrase}”
                </li>
              ))}
            </ul>
            <button
              type="button"
              role="switch"
              aria-checked={speakSteps}
              onClick={onToggleSpeakSteps}
              className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-(--radius-control) border-2 border-ink-2 bg-paper px-4 text-left text-ink hover:bg-paper-2"
            >
              <Volume2 className="size-6 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="min-w-0 flex-1 text-lg font-bold">Read steps aloud</span>
              <span className="label-mono shrink-0 text-base! text-ink!">{speakSteps ? 'On' : 'Off'}</span>
            </button>
          </Part>

          <Part n={2} id={`${titleId}-gestures`} title="Gestures">
            <p className="text-base text-ink">Show a hand to the camera and hold it. Video never leaves your device.</p>
            <Switch on={gesturesOn} onToggle={onToggleGestures} icon={<Hand className="size-6 shrink-0" strokeWidth={2} aria-hidden="true" />}>
              Hand gestures
            </Switch>
            <StatusLine
              status={gesturesStatus}
              message={gesturesMessage}
              inIframe={inIframe}
              onRetry={onRetryGestures}
              messages={{
                off: 'The camera is off. Turn gestures on to use it.',
                starting: 'Starting camera…',
                on: 'Camera on. Try a gesture below.',
              }}
            />
            {showPreview ? (
              <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-(--radius-ticket) bg-ink short:max-w-48">
                <video ref={videoRef} muted playsInline autoPlay aria-hidden="true" className="size-full -scale-x-100 object-cover" />
                {gesturesStatus === 'on' ? <GestureReadout live={live} className="absolute bottom-1 left-1" /> : null}
              </div>
            ) : null}
            <p aria-live="polite" className="label-mono text-base! text-ink!">
              Practised {practised} of {GESTURE_GUIDE.length}
            </p>
            <ul className="grid grid-cols-1 gap-2 min-[30rem]:grid-cols-2">
              {GESTURE_GUIDE.map((entry) => {
                const holding = gesturesOn && live.gesture === entry.gesture
                const state = learned.has(entry.gesture) ? 'learned' : holding ? 'holding' : 'idle'
                return <GestureTile key={entry.gesture} gesture={entry.gesture} title={entry.title} action={entry.action} hint={entry.hint} state={state} progress={live.progress} />
              })}
            </ul>
          </Part>

          <Part n={3} id={`${titleId}-keys`} title="Touch and keys">
            <p className="text-base text-ink">The big buttons at the bottom work with a wet thumb. A keyboard works too.</p>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {KEY_GUIDE.map((entry) => (
                <li key={entry.action} className="flex items-center justify-between gap-3 text-base text-ink">
                  <span>{entry.action}</span>
                  <span className="flex shrink-0 gap-1">
                    {entry.keys.map((key) => (
                      <kbd
                        key={key}
                        className="min-w-9 rounded-(--radius-ticket) border-2 border-ink-2 bg-paper px-2 py-0.5 text-center font-mono text-base font-semibold text-ink"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Part>
        </div>

        <div className="flex shrink-0 border-t border-rule px-4 py-3 sm:justify-end sm:px-6">
          <Button size="lg" onClick={onClose} className="w-full text-base sm:w-auto sm:min-w-64">
            {firstTime ? 'Start cooking' : 'Back to cooking'}
          </Button>
        </div>
      </div>
    </div>
  )
}
