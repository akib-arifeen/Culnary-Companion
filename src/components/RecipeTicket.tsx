import { Link } from 'react-router'
import type { Recipe } from '../data/types'
import { shortServes, shortTime } from '../lib/recipeMeta'
import { Label, Ticket } from './ui/primitives'

interface RecipeTicketProps {
  recipe: Recipe
  /** Optional mono line above the title, e.g. "STEP 3 OF 7". */
  note?: string
}

/** Rendered photo width per breakpoint, so the browser picks the 600px or 1200px file. Mirrors RecipeRail's grid. */
const PHOTO_SIZES = '(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw' // ds-allow-hardcode: responsive-image hints, not design values

/** Every photo also ships as a 600px-wide "-600.webp" variant for phones (asserted in src/data/recipes.test.ts). */
function smallVariant(src: string): string {
  return src.replace(/\.webp$/, '-600.webp')
}

/** One order on the rail: mono header strip, perforation, then photo, title, summary. */
export default function RecipeTicket({ recipe, note }: RecipeTicketProps) {
  const left = [
    `${recipe.steps.length} ${recipe.steps.length === 1 ? 'step' : 'steps'}`,
    shortServes(recipe.servings) ? `serves ${shortServes(recipe.servings)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const time = shortTime(recipe.time)
  const n = recipe.ingredients.length
  return (
    <Link to={`/recipe/${recipe.id}`} className="group block h-full">
      <Ticket
        className="flex h-full flex-col group-hover:border-ink group-focus-visible:border-ink"
        bodyClassName="flex grow flex-col gap-3 p-4"
        header={
          <>
            <Label className="whitespace-nowrap">{left}</Label>
            {time ? <Label className="shrink-0 whitespace-nowrap text-ink">{time}</Label> : null}
          </>
        }
      >
        <img
          src={recipe.photo.src}
          srcSet={`${smallVariant(recipe.photo.src)} 600w, ${recipe.photo.src} 1200w`}
          sizes={PHOTO_SIZES}
          alt={recipe.photo.alt}
          width={recipe.photo.width}
          height={recipe.photo.height}
          loading="lazy"
          className="aspect-4/3 w-full rounded-ticket border border-rule bg-paper-2 object-cover"
        />
        <div className="flex grow flex-col gap-1.5">
          {note ? <Label className="text-ink">{note}</Label> : null}
          <h3 className="text-ticket font-extrabold text-ink">{recipe.title}</h3>
          <p className="line-clamp-2 text-ink-2">{recipe.summary}</p>
          <Label className="mt-auto pt-1 text-ink">
            {n} {n === 1 ? 'ingredient' : 'ingredients'}
          </Label>
        </div>
        <Label
          as="p"
          className="flex min-w-0 gap-1 whitespace-nowrap normal-case! tracking-normal!"
        >
          <span className="shrink-0">Photo:</span>
          <span className="min-w-0 truncate" title={recipe.photo.author}>
            {recipe.photo.author}
          </span>
          <span className="shrink-0">· {recipe.photo.license}</span>
        </Label>
      </Ticket>
    </Link>
  )
}
