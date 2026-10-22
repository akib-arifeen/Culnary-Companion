import { ChevronLeft, CircleHelp, Hand, Mic } from 'lucide-react'
import { Link } from 'react-router'
import type { MediaStatus } from '../../lib/mediaErrors'

const STATUS_WORDS: Record<MediaStatus, string> = {
  off: 'off',
  starting: 'starting',
  on: 'on',
  denied: 'blocked',
  unavailable: 'unavailable',
  error: 'not working',
}

function StatusDot({ status, paused = false }: { status: MediaStatus; paused?: boolean }) {
  const colour =
    status === 'on' && paused
      ? 'bg-amber-500'
      : status === 'on'
      ? 'bg-green-600'
      : status === 'starting'
        ? 'bg-amber-500 motion-safe:animate-pulse'
        : status === 'off'
          ? 'bg-stone-300'
          : 'bg-rose-600'
  return <span aria-hidden="true" className={`size-2.5 rounded-full ${colour}`} />
}

interface CookingHeaderProps {
  recipeId: string
  title: string
  voiceStatus: MediaStatus
  gesturesStatus: MediaStatus
  /** Last thing the microphone heard; shown next to the title on wide screens when voice is on. */
  heard: string | null
  voiceOn: boolean
  /** The app is speaking, so the microphone is deliberately paused. */
  voicePaused: boolean
  onOpenHelp: () => void
}

const ICON_BUTTON = `grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-stone-700 hover:bg-stone-200/60`

export default function CookingHeader({
  recipeId,
  title,
  voiceStatus,
  gesturesStatus,
  heard,
  voiceOn,
  voicePaused,
  onOpenHelp,
}: CookingHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-stone-200 px-1.5 sm:px-3">
      <Link to={`/recipe/${recipeId}`} aria-label="Back to recipe overview" className={ICON_BUTTON}>
        <ChevronLeft className="size-6" aria-hidden="true" />
      </Link>
      <h1 className="min-w-0 truncate text-base font-semibold text-stone-900 sm:text-lg">{title}</h1>
      {voiceOn && heard ? (
        <p className="ml-2 hidden min-w-0 max-w-[40%] shrink truncate rounded-full bg-white px-3 py-1 text-sm text-stone-700 ring-1 ring-stone-200 md:block">
          Heard: “{heard}”
        </p>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center">
        <button
          type="button"
          onClick={onOpenHelp}
          aria-label={`Hands-free: voice ${voiceStatus === 'on' && voicePaused ? 'paused while speaking' : STATUS_WORDS[voiceStatus]}, gestures ${STATUS_WORDS[gesturesStatus]}`}
          className={`flex h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-stone-700 hover:bg-stone-200/60`}
        >
          <span className="flex items-center gap-1">
            <Mic className="size-5" aria-hidden="true" />
            <StatusDot status={voiceStatus} paused={voicePaused} />
          </span>
          <span className="flex items-center gap-1">
            <Hand className="size-5" aria-hidden="true" />
            <StatusDot status={gesturesStatus} />
          </span>
        </button>
        <button type="button" onClick={onOpenHelp} aria-label="Help and gestures" className={ICON_BUTTON}>
          <CircleHelp className="size-6" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

/** Thin segmented bar: done = brand-500, current = brand-700, rest = stone-200. */
export function StepProgress({ stepIndex, stepCount }: { stepIndex: number; stepCount: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Recipe progress"
      aria-valuemin={1}
      aria-valuemax={stepCount}
      aria-valuenow={stepIndex + 1}
      className="flex h-1.5 shrink-0 gap-1 px-3 pt-0.5 sm:px-5"
    >
      {Array.from({ length: stepCount }, (_, i) => (
        <span
          key={i}
          className={`h-1 min-w-0 flex-1 rounded-full ${i < stepIndex ? 'bg-brand-500' : i === stepIndex ? 'bg-brand-700' : 'bg-stone-200'}`}
        />
      ))}
    </div>
  )
}
