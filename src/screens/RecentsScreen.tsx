import EmptyState from '../components/EmptyState'
import Page from '../components/Page'
import ResumeTicket from '../components/ResumeTicket'
import { getRecipeById } from '../data/recipes'
import { useRecipeContext } from '../context/RecipeContext'

/** "In progress": a rail of resume tickets, each with the step you stopped on. */
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
              <li key={recipe.id} className="min-w-0">
                <ResumeTicket recipe={recipe} step={step} onDiscard={() => clearInProgress(recipe.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState strip="In progress · 0" actionLabel="Pick a recipe">
            Recipes you start cooking appear here with the step you reached.
          </EmptyState>
        )}
      </div>
    </Page>
  )
}

export default RecentsScreen
