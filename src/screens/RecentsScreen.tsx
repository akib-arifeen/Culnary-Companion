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
      <p className="mt-2 max-w-prose text-ink-2">Recipes you started, holding the step you reached.</p>
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
          <EmptyState strip="In progress" title="Nothing on the pass yet" actionLabel="Pick a recipe">
            Start cooking any recipe and the step you reached is kept here, ready to resume.
          </EmptyState>
        )}
      </div>
    </Page>
  )
}

export default RecentsScreen
