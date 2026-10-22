import { ChevronLeft, CircleHelp } from 'lucide-react'
import { Link } from 'react-router'

const ICON_BUTTON =
  'grid size-14 shrink-0 cursor-pointer place-items-center rounded-(--radius-control) text-ink hover:bg-paper-2 active:bg-rule/40'

/** Cooking mode has no app nav: back arrow, recipe title, help. The segmented progress hangs under it. */
export default function TopBar({
  recipeId,
  title,
  stepIndex,
  stepCount,
  onOpenHelp,
}: {
  recipeId: string
  title: string
  stepIndex: number
  stepCount: number
  onOpenHelp: () => void
}) {
  return (
    <div className="shrink-0 border-b border-rule bg-paper">
      <header className="flex h-14 items-center gap-1 px-1 sm:px-3">
        <Link to={`/recipe/${recipeId}`} aria-label="Back to recipe" className={ICON_BUTTON}>
          <ChevronLeft className="size-7" strokeWidth={2} aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-ticket font-extrabold text-ink sm:text-2xl">{title}</h1>
        <button type="button" onClick={onOpenHelp} aria-label="Help and hands-free setup" className={ICON_BUTTON}>
          <CircleHelp className="size-7" strokeWidth={2} aria-hidden="true" />
        </button>
      </header>
      <StepProgress stepIndex={stepIndex} stepCount={stepCount} />
    </div>
  )
}

/** Segmented bar: done = ink, current = accent, rest = rule. */
function StepProgress({ stepIndex, stepCount }: { stepIndex: number; stepCount: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Recipe progress"
      aria-valuemin={1}
      aria-valuemax={stepCount}
      aria-valuenow={stepIndex + 1}
      className="flex h-3 gap-1 px-3 pb-1.5 sm:px-5"
    >
      {Array.from({ length: stepCount }, (_, i) => (
        <span key={i} className={`h-1.5 min-w-0 flex-1 rounded-full ${i < stepIndex ? 'bg-ink' : i === stepIndex ? 'bg-accent' : 'bg-rule'}`} />
      ))}
    </div>
  )
}
