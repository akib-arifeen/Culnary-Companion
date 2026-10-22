import { useId, useRef, type ReactNode, type RefObject } from 'react'
import { CircleCheck, ExternalLink, Hand, Mic, TriangleAlert, Volume2, X } from 'lucide-react'
import type { GestureLive, SpeechCommandsApi } from '../../hooks/contracts'
import { GESTURE_GUIDE, type GestureName } from '../../lib/gestures'
import { KEY_GUIDE } from '../../lib/keyboard'
import type { MediaStatus } from '../../lib/mediaErrors'
import GestureReadout from './GestureReadout'
import GestureIcon from './GestureIcon'
import ProgressRing from './ProgressRing'
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from './ui'
import { useDialogFocus } from './useDialogFocus'

interface HandsFreePanelProps {
  /** Not yet onboarded: the footer button says "Start cooking" instead of "Done". */
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
  /** Lower-case name of the recipe's first ingredient, for the "check …" example. */
  ingredientExample: string
  inIframe: boolean
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-rose-700">
        <p className="flex min-w-0 flex-1 basis-60 items-start gap-2 text-base">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </p>
        {status !== 'unavailable' ? (
          <button type="button" onClick={onRetry} className={`${BTN_SECONDARY} h-10 px-4 text-sm`}>
            Try again
          </button>
        ) : null}
        {inIframe && status === 'denied' ? (
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BTN_SECONDARY} h-10 px-4 text-sm`}
          >
            Open in a new tab
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    )
  }
  const text = status === 'starting' ? messages.starting : status === 'on' ? messages.on : messages.off
  return <p className="text-base text-stone-700">{text}</p>
}

function Toggle({ pressed, onClick, children, icon }: { pressed: boolean; onClick: () => void; children: ReactNode; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-xl px-4 text-base font-semibold ${
        pressed ? 'bg-brand-700 text-white hover:bg-brand-800' : 'bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-50'
      }`}
    >
      {icon}
      {children}
      <span className="rounded-full bg-black/10 px-2 py-0.5 text-sm">{pressed ? 'On' : 'Off'}</span>
    </button>
  )
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
      className={`${CARD} flex items-start gap-3 p-3 ${state === 'holding' ? 'ring-2 ring-brand-500' : ''} ${
        state === 'learned' ? 'ring-green-700/40' : ''
      }`}
    >
      <span className="relative grid size-12 shrink-0 place-items-center text-brand-500">
        {state === 'holding' ? <ProgressRing progress={progress} size={48} strokeWidth={4} className="absolute" /> : null}
        <span className={`grid size-10 place-items-center rounded-full ${state === 'learned' ? 'bg-green-50 text-green-700' : 'bg-brand-50 text-brand-700'}`}>
          {state === 'learned' ? <CircleCheck className="size-6" aria-hidden="true" /> : <GestureIcon gesture={gesture} className="size-6" />}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-stone-900">{title}</span>
        <span className="block text-sm font-medium text-stone-800">{action}</span>
        <span className="block text-sm text-stone-600">{hint}</span>
        <span className="sr-only">{state === 'learned' ? 'Learned' : state === 'holding' ? 'Holding' : 'Not tried yet'}</span>
      </span>
    </li>
  )
}

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
}: HandsFreePanelProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  useDialogFocus(dialogRef, headingRef, onClose)

  const practised = GESTURE_GUIDE.filter((g) => learned.has(g.gesture)).length
  const phrases = ['next', 'back', 'repeat', 'ingredients', 'timer for 5 minutes', ingredientExample ? `check ${ingredientExample}` : '', 'stop', 'help'].filter(Boolean)
  const showPreview = gesturesOn && (gesturesStatus === 'on' || gesturesStatus === 'starting')

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/50 sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-cream shadow-xl ring-1 ring-stone-200 sm:max-w-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 sm:px-6">
          <div>
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-stone-900 outline-hidden">
              Hands-free cooking
            </h2>
            <p className="mt-1 text-base text-stone-700">Messy hands? Follow the recipe with gestures, your voice, or the keyboard.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className={`grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-stone-700 hover:bg-stone-200/60`}
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <section aria-labelledby={`${titleId}-gestures`} className="space-y-3">
            <h3 id={`${titleId}-gestures`} className="text-lg font-semibold text-stone-900">
              Hand gestures
            </h3>
            <Toggle pressed={gesturesOn} onClick={onToggleGestures} icon={<Hand className="size-5" aria-hidden="true" />}>
              Use hand gestures
            </Toggle>
            <StatusLine
              status={gesturesStatus}
              message={gesturesMessage}
              inIframe={inIframe}
              onRetry={onRetryGestures}
              messages={{
                off: 'The camera is off. Turn gestures on to use it.',
                starting: 'Starting camera…',
                on: 'Camera on — try a gesture below. Video never leaves your device.',
              }}
            />
            {showPreview ? (
              <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl bg-stone-900 ring-1 ring-black/10 short:max-w-48">
                <video ref={videoRef} muted playsInline autoPlay aria-hidden="true" className="size-full -scale-x-100 object-cover" />
                {gesturesStatus === 'on' ? <GestureReadout live={live} className="absolute bottom-2 left-2" /> : null}
              </div>
            ) : null}
            <p aria-live="polite" className="text-sm font-semibold text-stone-800">
              Practised {practised} of {GESTURE_GUIDE.length}
            </p>
            <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
              {GESTURE_GUIDE.map((entry) => {
                const holding = gesturesOn && live.gesture === entry.gesture
                const state = learned.has(entry.gesture) ? 'learned' : holding ? 'holding' : 'idle'
                return <GestureTile key={entry.gesture} {...entry} state={state} progress={live.progress} />
              })}
            </ul>
          </section>

          <section aria-labelledby={`${titleId}-voice`} className="space-y-3">
            <h3 id={`${titleId}-voice`} className="text-lg font-semibold text-stone-900">
              Voice commands
            </h3>
            <Toggle pressed={voiceOn} onClick={onToggleVoice} icon={<Mic className="size-5" aria-hidden="true" />}>
              Use voice commands
            </Toggle>
            <StatusLine
              status={voice.status}
              message={voice.message}
              inIframe={inIframe}
              onRetry={onRetryVoice}
              messages={{
                off: 'The microphone is off. Turn voice on to use it.',
                starting: 'Starting microphone…',
                on: 'Listening — say a command.',
              }}
            />
            <p className="text-sm text-stone-600">Uses your browser’s speech service.</p>
            <p aria-live="polite" className="min-h-6 text-base text-stone-800">
              {speaking ? <span className="text-stone-700">Listening resumes when I finish speaking.</span> : voice.heard ? <>Heard: “{voice.heard}”</> : <span className="text-stone-600">Heard: nothing yet</span>}
            </p>
            <ul className="flex flex-wrap gap-2">
              {phrases.map((phrase) => (
                <li key={phrase} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-stone-800 ring-1 ring-stone-300">
                  “{phrase}”
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby={`${titleId}-speech`} className="space-y-3">
            <h3 id={`${titleId}-speech`} className="sr-only">
              Spoken steps
            </h3>
            <div className={`${CARD} flex items-center justify-between gap-4 p-4`}>
              <span className="flex min-w-0 items-center gap-3">
                <Volume2 className="size-6 shrink-0 text-brand-700" aria-hidden="true" />
                <span id={`${titleId}-speak-label`} className="text-base font-semibold text-stone-900">
                  Read steps aloud
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={speakSteps}
                aria-labelledby={`${titleId}-speak-label`}
                onClick={onToggleSpeakSteps}
                className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full ${speakSteps ? 'bg-brand-700' : 'bg-stone-300'}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-1 top-1 size-6 rounded-full bg-white shadow motion-safe:transition-transform ${speakSteps ? 'translate-x-6' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </section>

          <section aria-labelledby={`${titleId}-keys`} className="space-y-3">
            <h3 id={`${titleId}-keys`} className="text-lg font-semibold text-stone-900">
              Keyboard
            </h3>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {KEY_GUIDE.map((entry) => (
                <li key={entry.action} className="flex items-center justify-between gap-3 text-base text-stone-800">
                  <span>{entry.action}</span>
                  <span className="flex shrink-0 gap-1">
                    {entry.keys.map((key) => (
                      <kbd key={key} className="min-w-8 rounded-md bg-white px-2 py-0.5 text-center text-sm font-semibold text-stone-800 ring-1 ring-stone-300">
                        {key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="shrink-0 border-t border-stone-200 px-5 py-3 sm:px-6">
          <button type="button" onClick={onClose} className={`${BTN_PRIMARY} h-12 w-full text-lg`}>
            {firstTime ? 'Start cooking' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
