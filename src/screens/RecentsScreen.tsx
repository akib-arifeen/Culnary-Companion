import { Link } from 'react-router'
import { CookingPot } from 'lucide-react'
import Page from '../components/Page'
import { getRecipeById } from '../data/recipes'
import { useRecipeContext } from '../context/RecipeContext'

const RecentsScreen = () => {
  const { inProgress, clearInProgress } = useRecipeContext()
  const items = Object.entries(inProgress).flatMap(([id, step]) => {
    const recipe = getRecipeById(id)
    return recipe ? [{ recipe, step: Math.min(step, recipe.steps.length - 1) }] : []
  })

  return (
    <Page title="In progress">
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map(({ recipe, step }) => (
            <li key={recipe.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
              <img
                src={recipe.image}
                alt=""
                width={96}
                height={96}
                loading="lazy"
                className="size-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 grow">
                <Link to={`/recipe/${recipe.id}`} className="block truncate rounded font-semibold text-stone-900">
                  {recipe.title}
                </Link>
                <p className="text-sm text-stone-600">
                  Step {step + 1} of {recipe.steps.length}
                </p>
                <div
                  role="progressbar"
                  aria-label={`${recipe.title} progress`}
                  aria-valuemin={0}
                  aria-valuemax={recipe.steps.length}
                  aria-valuenow={step + 1}
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200"
                >
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${((step + 1) / recipe.steps.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <Link
                  to={`/cooking/${recipe.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Resume
                </Link>
                <button
                  type="button"
                  onClick={() => clearInProgress(recipe.id)}
                  aria-label={`Discard progress on ${recipe.title}`}
                  className="min-h-10 cursor-pointer rounded-lg px-3 text-sm font-medium text-stone-700 hover:bg-stone-100"
                >
                  Discard
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <CookingPot size={40} className="text-stone-500" aria-hidden="true" />
          <p className="font-semibold text-stone-900">Nothing in progress</p>
          <p className="max-w-xs text-sm text-stone-600">
            Start cooking a recipe and it will wait here, on the step where you stopped.
          </p>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Pick a recipe
          </Link>
        </div>
      )}
    </Page>
  )
}

export default RecentsScreen
