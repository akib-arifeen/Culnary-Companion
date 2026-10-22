import { Hand, HandFist, HandMetal, Pointer, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { GestureName } from '../../lib/gestures'

/** lucide has no V-sign, so it is drawn here in the same 24x24 / 2px round-stroke style. */
function VictoryIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 3.5 11 11" />
      <path d="M15 3.5 13 11" />
      <path d="M11 11H8.5a2 2 0 0 0-2 2v3.5A4.5 4.5 0 0 0 11 21h2a4.5 4.5 0 0 0 4.5-4.5V13a2 2 0 0 0-2-2H13" />
    </svg>
  )
}

export default function GestureIcon({ gesture, className = 'size-5' }: { gesture: GestureName; className?: string }) {
  switch (gesture) {
    case 'Thumb_Up':
      return <ThumbsUp className={className} aria-hidden="true" />
    case 'Thumb_Down':
      return <ThumbsDown className={className} aria-hidden="true" />
    case 'Open_Palm':
      return <Hand className={className} aria-hidden="true" />
    case 'Closed_Fist':
      return <HandFist className={className} aria-hidden="true" />
    case 'Pointing_Up':
      return <Pointer className={className} aria-hidden="true" />
    case 'Victory':
      return <VictoryIcon className={className} />
    case 'ILoveYou':
      return <HandMetal className={className} aria-hidden="true" />
  }
}
