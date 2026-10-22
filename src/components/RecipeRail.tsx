import type { Recipe } from '../data/types'
import RecipeTicket from './RecipeTicket'

/** The rail: 1 column on phones, 2 from sm, 3 from xl. Tracks are minmax(0,1fr) so long titles never widen the page. */
export default function RecipeRail({ recipes, label }: { recipes: readonly Recipe[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {recipes.map((recipe) => (
        <li key={recipe.id} className="min-w-0">
          <RecipeTicket recipe={recipe} />
        </li>
      ))}
    </ul>
  )
}
