import { useRef } from 'react'
import type { RecipeSource } from '../../data/types'
import { Button, Label } from '../ui/primitives'
import { useDialogFocus } from './useDialogFocus'

interface CompletionDialogProps {
  recipeTitle: string
  source: RecipeSource
  onHome: () => void
  onReview: () => void
}

/** The last ticket off the printer: plain words, two buttons, and the source credit. */
export default function CompletionDialog({ recipeTitle, source, onHome, onReview }: CompletionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useDialogFocus(dialogRef, headingRef, onReview)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/60 p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="completion-title" className="ticket w-full max-w-lg">
        <div className="flex min-h-11 items-center px-5 py-2.5">
          <Label>Finished</Label>
        </div>
        <div className="perforation" aria-hidden="true" />
        <div className="p-5 sm:p-8 short:p-4">
          <h2 id="completion-title" ref={headingRef} tabIndex={-1} className="text-title font-extrabold text-ink outline-hidden">
            Done. Nicely cooked.
          </h2>
          <p className="mt-2 text-xl font-bold text-ink-2">{recipeTitle}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse short:mt-3">
            <Button size="lg" onClick={onHome} className="sm:flex-1">
              Back to recipes
            </Button>
            <Button variant="secondary" size="lg" onClick={onReview} className="sm:flex-1">
              Review steps
            </Button>
          </div>
          <p className="mt-5 text-sm text-ink-2">
            Recipe adapted from{' '}
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-3 hover:decoration-accent">
              {source.page}
            </a>{' '}
            on Wikibooks, {source.license}.
          </p>
        </div>
      </div>
    </div>
  )
}
