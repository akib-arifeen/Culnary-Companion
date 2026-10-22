import { Check, ChevronLeft, ChevronRight, Square, Volume2 } from 'lucide-react'
import { BTN_PRIMARY, BTN_SECONDARY } from './ui'

interface ControlBarProps {
  isFirst: boolean
  isLast: boolean
  /** The app is reading aloud: the read button becomes a stop button. */
  speaking: boolean
  onStopReading: () => void
  onBack: () => void
  onRead: () => void
  onNext: () => void
}

export default function ControlBar({ isFirst, isLast, speaking, onStopReading, onBack, onRead, onNext }: ControlBarProps) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-t border-stone-200 px-3 sm:gap-3 sm:px-5">
      <button
        type="button"
        onClick={onBack}
        aria-disabled={isFirst}
        aria-label="Back to previous step"
        className={`${BTN_SECONDARY} h-12 min-w-12 px-3 sm:px-5 ${isFirst ? 'opacity-40' : ''}`}
      >
        <ChevronLeft className="size-6" aria-hidden="true" />
        <span className="hidden sm:inline">Back</span>
      </button>
      <button
        type="button"
        onClick={speaking ? onStopReading : onRead}
        aria-label={speaking ? 'Stop reading' : 'Read step again'}
        className={`${BTN_SECONDARY} h-12 min-w-12 px-3`}
      >
        {speaking ? <Square className="size-5 fill-current" aria-hidden="true" /> : <Volume2 className="size-6" aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label={isLast ? 'Finish recipe' : 'Next step'}
        className={`${BTN_PRIMARY} h-12 min-w-0 flex-1 text-lg`}
      >
        {isLast ? (
          <>
            Finish
            <Check className="size-6" aria-hidden="true" />
          </>
        ) : (
          <>
            Next
            <ChevronRight className="size-6" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  )
}
