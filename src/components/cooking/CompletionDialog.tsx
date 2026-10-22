import { useRef } from 'react'
import { CircleCheck } from 'lucide-react'
import { BTN_PRIMARY, BTN_SECONDARY } from './ui'
import { useDialogFocus } from './useDialogFocus'

interface CompletionDialogProps {
  recipeTitle: string
  onHome: () => void
  onReview: () => void
}

export default function CompletionDialog({ recipeTitle, onHome, onReview }: CompletionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useDialogFocus(dialogRef, headingRef, onReview)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-stone-200 short:p-4"
      >
        <CircleCheck className="mx-auto size-12 text-green-700 short:size-9" aria-hidden="true" />
        <h2 id="completion-title" ref={headingRef} tabIndex={-1} className="mt-3 text-3xl font-semibold text-stone-900 outline-hidden short:mt-1 short:text-2xl">
          Nicely done!
        </h2>
        <p className="mt-1 text-lg text-stone-600">{recipeTitle}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse short:mt-3">
          <button type="button" onClick={onHome} className={`${BTN_PRIMARY} h-12 flex-1`}>
            Back to recipes
          </button>
          <button type="button" onClick={onReview} className={`${BTN_SECONDARY} h-12 flex-1`}>
            Review steps
          </button>
        </div>
      </div>
    </div>
  )
}
