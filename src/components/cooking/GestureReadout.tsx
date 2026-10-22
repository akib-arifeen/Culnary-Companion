import { Hand } from 'lucide-react'
import type { GestureLive } from '../../hooks/contracts'
import { GESTURE_GUIDE } from '../../lib/gestures'
import GestureIcon from './GestureIcon'
import ProgressRing from './ProgressRing'

/** Live read-out of the gesture being held: icon inside an accent hold ring, plus its name. */
export default function GestureReadout({ live, className = '', compact = false }: { live: GestureLive; className?: string; compact?: boolean }) {
  const entry = live.gesture ? GESTURE_GUIDE.find((g) => g.gesture === live.gesture) : undefined
  const label = live.gesture ? (entry?.title ?? live.gesture) : live.handVisible ? 'Hand seen' : 'Show a hand'
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-rule bg-paper py-0.5 pl-0.5 ${compact ? 'pr-0.5' : 'pr-3'} font-mono text-label font-semibold uppercase tracking-wider text-ink ${className}`}
    >
      <span className="relative grid size-8 shrink-0 place-items-center text-accent">
        <ProgressRing progress={live.gesture ? live.progress : 0} size={32} />
        <span className="absolute text-ink">
          {live.gesture ? <GestureIcon gesture={live.gesture} className="size-4" /> : <Hand className="size-4 opacity-70" strokeWidth={2} aria-hidden="true" />}
        </span>
      </span>
      <span className={compact ? 'sr-only' : ''}>{label}</span>
    </span>
  )
}
