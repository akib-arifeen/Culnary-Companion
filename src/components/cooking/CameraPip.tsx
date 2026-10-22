import { EyeOff, Hand } from 'lucide-react'
import type { RefObject } from 'react'
import type { GestureLive } from '../../hooks/contracts'
import type { MediaStatus } from '../../lib/mediaErrors'
import { Button, Label, Ticket } from '../ui/primitives'
import GestureReadout from './GestureReadout'
import type { PipMode } from './pipMode'
import ProgressRing from './ProgressRing'

interface CameraPipProps {
  mode: PipMode
  /** 'rail': a ticket in the rail (lg). 'float': a small ticket in the bottom-right corner above the control strip. */
  placement: 'rail' | 'float'
  status: MediaStatus
  live: GestureLive
  videoRef: RefObject<HTMLVideoElement>
  onHidePreview: () => void
  onShowPreview: () => void
}

function Video({
  status,
  live,
  videoRef,
  className,
  compact = false,
  readout = true,
}: Pick<CameraPipProps, 'status' | 'live' | 'videoRef'> & { className: string; compact?: boolean; readout?: boolean }) {
  return (
    <div className={`relative aspect-[4/3] overflow-hidden rounded-(--radius-ticket) bg-ink ${className}`}>
      <video ref={videoRef} muted playsInline autoPlay aria-hidden="true" className="size-full -scale-x-100 object-cover" />
      {status === 'starting' ? (
        <p className="absolute inset-0 grid place-items-center bg-ink px-2 text-center font-mono text-label font-semibold uppercase text-paper">Starting camera…</p>
      ) : readout ? (
        <GestureReadout live={live} compact={compact} className="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)]" />
      ) : null}
    </div>
  )
}

export default function CameraPip({ mode, placement, status, live, videoRef, onHidePreview, onShowPreview }: CameraPipProps) {
  if (mode === 'none') return null

  if (mode === 'pill') {
    return (
      <Button
        variant="secondary"
        onClick={onShowPreview}
        aria-label="Show camera preview"
        className={placement === 'float' ? 'absolute right-2 bottom-2' : 'w-full justify-start'}
      >
        <span className="relative grid size-7 place-items-center text-accent">
          <ProgressRing progress={live.gesture ? live.progress : 0} size={28} />
          <Hand className="absolute size-3.5 text-ink" strokeWidth={2} aria-hidden="true" />
        </span>
        {status === 'starting' ? 'Starting camera…' : 'Show camera'}
      </Button>
    )
  }

  const hide = (
    <button
      type="button"
      onClick={onHidePreview}
      aria-label="Hide camera preview"
      className={`grid shrink-0 ${placement === 'float' ? 'size-9 bg-paper/90' : 'size-11'} cursor-pointer place-items-center rounded-(--radius-control) text-ink hover:bg-paper-2`}
    >
      <EyeOff className="size-5" strokeWidth={2} aria-hidden="true" />
    </button>
  )

  if (placement === 'rail') {
    // Small and always near the HEARD strip: the video to check the hand is seen, the live read-out beside it.
    return (
      <Ticket as="section" bodyClassName="flex items-center gap-3 p-3">
        <Video status={status} live={live} videoRef={videoRef} className="w-36 shrink-0" readout={false} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <Label>Camera</Label>
          {status === 'on' ? <GestureReadout live={live} /> : null}
        </div>
        {hide}
      </Ticket>
    )
  }

  return (
    <div className="ticket absolute right-2 bottom-2 w-28 p-1 sm:w-36 short:w-28">
      <Video status={status} live={live} videoRef={videoRef} className="w-full" compact />
      <div className="absolute top-1.5 right-1.5">{hide}</div>
    </div>
  )
}
