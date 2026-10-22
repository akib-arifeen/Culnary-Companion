import { Check, ChevronLeft, ChevronRight, Square, Volume2 } from 'lucide-react'
import { Button } from '../ui/primitives'

interface ControlStripProps {
  isFirst: boolean
  isLast: boolean
  /** The app is reading aloud: the read button becomes a stop button. */
  speaking: boolean
  onStopReading: () => void
  onBack: () => void
  onRead: () => void
  onNext: () => void
}

/** Bottom strip: Back · Read it again / Stop reading · NEXT STEP at the right edge. Every target is 56 px or more. */
export default function ControlStrip({ isFirst, isLast, speaking, onStopReading, onBack, onRead, onNext }: ControlStripProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-rule bg-paper px-3 py-2 sm:gap-3 sm:px-5 short:py-1.5">
      <Button variant="secondary" size="lg" onClick={onBack} aria-disabled={isFirst} aria-label="Back to previous step" className="px-4 sm:px-6">
        <ChevronLeft className="size-6" strokeWidth={2} aria-hidden="true" />
        <span className="max-sm:sr-only">Back</span>
      </Button>
      <Button variant="secondary" size="lg" onClick={speaking ? onStopReading : onRead} className="px-4 sm:px-6">
        {speaking ? <Square className="size-5 fill-current" strokeWidth={2} aria-hidden="true" /> : <Volume2 className="size-6" strokeWidth={2} aria-hidden="true" />}
        <span className="max-md:sr-only">{speaking ? 'Stop reading' : 'Read it again'}</span>
      </Button>
      <Button size="lg" onClick={onNext} aria-label={isLast ? 'Finish recipe' : 'Next step'} className="ml-auto w-1/2 text-base sm:w-auto sm:min-w-64">
        {isLast ? (
          <>
            Finish
            <Check className="size-6" strokeWidth={2} aria-hidden="true" />
          </>
        ) : (
          <>
            Next step
            <ChevronRight className="size-6" strokeWidth={2} aria-hidden="true" />
          </>
        )}
      </Button>
    </div>
  )
}
