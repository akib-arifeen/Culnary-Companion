import EmptyState from '../components/EmptyState'
import Page from '../components/Page'
import RecipeTicket from '../components/RecipeTicket'
import { Button, ButtonLink } from '../components/ui/primitives'
import { getRecipeById } from '../data/recipes'
import { useRecipeContext } from '../context/RecipeContext'

/** "In progress": the rail, each ticket with the step you stopped on. */
const RecentsScreen = () => {
  const { inProgress, clearInProgress } = useRecipeContext()
  const items = Object.entries(inProgress).flatMap(([id, step]) => {
    const recipe = getRecipeById(id)
    return recipe ? [{ recipe, step: Math.min(step, recipe.steps.length - 1) }] : []
  })

  return (
    <Page>
      <h1 className="text-title font-extrabold tracking-tight text-ink">In progress</h1>
      <div className="mt-6">
        {items.length > 0 ? (
          <ul aria-label="Recipes in progress" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(({ recipe, step }) => (
              <li key={recipe.id} className="flex min-w-0 flex-col gap-2">
                <div className="grow">
                  <RecipeTicket recipe={recipe} note={`Step ${step + 1} of ${recipe.steps.length}`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink to={`/cooking/${recipe.id}`} aria-label={`Resume ${recipe.title}`} className="whitespace-nowrap">
                    Resume
                  </ButtonLink>
                  <Button
                    variant="secondary"
                    onClick={() => clearInProgress(recipe.id)}
                    aria-label={`Discard progress on ${recipe.title}`}
                    className="whitespace-nowrap"
                  >
                    Discard
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing in progress" actionLabel="Pick a recipe">
            When you start cooking, the recipe waits here on the step where you stopped.
          </EmptyState>
        )}
      </div>
    </Page>
  )
}

export default RecentsScreen
