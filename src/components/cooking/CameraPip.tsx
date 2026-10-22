import { EyeOff, Hand, TriangleAlert } from 'lucide-react'
import type { RefObject } from 'react'
import type { GestureLive } from '../../hooks/contracts'
import type { MediaStatus } from '../../lib/mediaErrors'
import GestureReadout from './GestureReadout'
import type { PipMode } from './pipMode'
import ProgressRing from './ProgressRing'

interface CameraPipProps {
  mode: PipMode
  status: MediaStatus
  live: GestureLive
  videoRef: RefObject<HTMLVideoElement>
  problemText: string
  onHidePreview: () => void
  onShowPreview: () => void
  onOpenHelp: () => void
}

const CORNER = 'absolute bottom-2 right-2'

export default function CameraPip({ mode, status, live, videoRef, problemText, onHidePreview, onShowPreview, onOpenHelp }: CameraPipProps) {
  if (mode === 'none') return null

  if (mode === 'problem') {
    return (
      <button
        type="button"
        onClick={onOpenHelp}
        className={`${CORNER} inline-flex h-10 max-w-[calc(100%-1rem)] cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 text-sm font-medium text-rose-700 shadow ring-1 ring-rose-300 hover:bg-rose-50`}
      >
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{problemText}</span>
      </button>
    )
  }

  if (mode === 'pill') {
    return (
      <button
        type="button"
        onClick={onShowPreview}
        aria-label="Show camera preview"
        className={`${CORNER} inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white py-1 pl-1.5 pr-3.5 text-sm font-medium text-stone-800 shadow ring-1 ring-stone-300 hover:bg-stone-50`}
      >
        <span className="relative grid size-7 place-items-center text-brand-600">
          <ProgressRing progress={live.gesture ? live.progress : 0} size={28} />
          <Hand className="absolute size-3.5 text-stone-700" aria-hidden="true" />
        </span>
        {status === 'starting' ? 'Starting camera…' : 'Gestures on'}
      </button>
    )
  }

  return (
    <div
      className={`${CORNER} aspect-[4/3] w-28 overflow-hidden rounded-xl bg-stone-900 shadow-lg ring-1 ring-black/10 sm:w-36 short:w-28`}
    >
      <video ref={videoRef} muted playsInline autoPlay aria-hidden="true" className="size-full -scale-x-100 object-cover" />
      {status === 'starting' ? (
        <p className="absolute inset-0 grid place-items-center bg-stone-900 px-2 text-center text-xs text-stone-200">Starting camera…</p>
      ) : (
        <GestureReadout live={live} className="absolute inset-x-1 bottom-1 max-w-[calc(100%-0.5rem)]" />
      )}
      <button
        type="button"
        onClick={onHidePreview}
        aria-label="Hide camera preview"
        className={`absolute right-1 top-1 grid size-8 cursor-pointer place-items-center rounded-full bg-black/55 text-white hover:bg-black/75`}
      >
        <EyeOff className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
