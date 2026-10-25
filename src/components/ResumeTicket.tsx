import { Link } from 'react-router'
import type { Recipe } from '../data/types'
import RecipePhoto from './RecipePhoto'
import { Button, ButtonLink, Label, Ticket } from './ui/primitives'

/**
 * A recipe you started: step strip, thumbnail and title, then a perforation and an action footer
 * (right-aligned from sm up, full-width buttons on phones). One layout for Home and In progress.
 */
export default function ResumeTicket({
  recipe,
  step,
  onDiscard,
}: {
  recipe: Recipe
  /** 0-based step you stopped on. */
  step: number
  onDiscard?: () => void
}) {
  return (
    <Ticket
      className="flex h-full flex-col"
      bodyClassName="flex grow flex-col p-0"
      header={
        <Label className="whitespace-nowrap text-ink">
          Step {step + 1} of {recipe.steps.length}
        </Label>
      }
    >
      <div className="flex grow items-center gap-4 p-4">
        <RecipePhoto
          photo={recipe.photo}
          loading="lazy"
          compact
          className="size-16 shrink-0 rounded-ticket border border-rule bg-paper-2 object-cover"
        />
        <Link to={`/recipe/${recipe.id}`} className="min-w-0 text-ticket font-extrabold text-ink underline-offset-3 hover:underline">
          {recipe.title}
        </Link>
      </div>
      <div className="perforation" aria-hidden="true" />
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-end">
        {onDiscard ? (
          <Button
            variant="secondary"
            onClick={onDiscard}
            aria-label={`Discard progress on ${recipe.title}`}
            className="w-full whitespace-nowrap sm:w-auto"
          >
            Discard
          </Button>
        ) : null}
        <ButtonLink to={`/cooking/${recipe.id}`} aria-label={`Resume ${recipe.title}`} className="w-full whitespace-nowrap sm:w-auto">
          Resume
        </ButtonLink>
      </div>
    </Ticket>
  )
}
