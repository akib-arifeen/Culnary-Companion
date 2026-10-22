import { Link, useNavigate, useParams } from 'react-router'
import { ChefHat, Clock, Flame, Globe, Heart, Timer, Users } from 'lucide-react'
import Page from '../components/Page'
import { getRecipeById } from '../data/recipes'
import { useRecipeContext } from '../context/RecipeContext'

const RecipeOverviewScreen = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const recipe = id ? getRecipeById(id) : undefined
  const { isFavorite, toggleFavorite, getCurrentStep, setInProgress } = useRecipeContext()

  if (!recipe) {
    return (
      <Page title="Recipe not found">
        <div className="py-16 text-center">
          <p className="mb-4 text-stone-700">We could not find that recipe.</p>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Browse all recipes
          </Link>
        </div>
      </Page>
    )
  }

  const saved = isFavorite(recipe.id)
  const progress = getCurrentStep(recipe.id)
  const resumeStep = progress === undefined ? undefined : Math.min(progress, recipe.steps.length - 1)
  const cookingPath = `/cooking/${recipe.id}`

  const meta = [
    { icon: Clock, label: 'Prep', value: `${recipe.prepTime} min` },
    { icon: Flame, label: 'Cook', value: `${recipe.cookTime} min` },
    { icon: Users, label: 'Servings', value: String(recipe.servings) },
    { icon: ChefHat, label: 'Difficulty', value: recipe.difficulty },
    { icon: Globe, label: 'Cuisine', value: recipe.cuisine },
  ]

  return (
    <Page title={recipe.title} withActionBar>
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="space-y-4">
          <img
            src={recipe.image}
            alt=""
            width={960}
            height={720}
            className="aspect-16/10 w-full rounded-2xl object-cover short:aspect-16/7"
          />
          <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {meta.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg bg-white p-2 text-center ring-1 ring-stone-200">
                <Icon size={16} className="mx-auto mb-0.5 text-brand-700" aria-hidden="true" />
                <dt className="text-xs text-stone-600">{label}</dt>
                <dd className="text-sm font-semibold text-stone-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-2xl font-bold text-stone-900">{recipe.title}</h2>
            <button
              type="button"
              onClick={() => toggleFavorite(recipe.id)}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from saved' : 'Save recipe'}
              className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border ${
                saved
                  ? 'border-brand-700 bg-brand-50 text-brand-700'
                  : 'border-stone-300 bg-white text-stone-700 hover:border-brand-700 hover:text-brand-700'
              }`}
            >
              <Heart size={20} className={saved ? 'fill-current' : ''} aria-hidden="true" />
            </button>
          </div>
          <p className="text-stone-700">{recipe.description}</p>

          <div className="fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-stone-200 bg-white p-3 short:bottom-11 md:static md:z-auto md:border-0 md:bg-transparent md:p-0">
            <Link
              to={cookingPath}
              onClick={() => {
                if (resumeStep === undefined) setInProgress(recipe.id, 0)
              }}
              className="inline-flex min-h-12 grow items-center justify-center rounded-lg bg-brand-700 px-5 py-2 font-semibold text-white hover:bg-brand-800 md:grow-0"
            >
              {resumeStep === undefined ? 'Start cooking' : `Resume at step ${resumeStep + 1}`}
            </Link>
            {resumeStep !== undefined && (
              <button
                type="button"
                onClick={() => {
                  setInProgress(recipe.id, 0)
                  navigate(cookingPath)
                }}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-2 font-semibold text-stone-800 hover:bg-stone-50"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[2fr_3fr]">
        <section aria-labelledby="ingredients-title">
          <h2 id="ingredients-title" className="mb-3 text-lg font-semibold text-stone-900">
            Ingredients
          </h2>
          <ul className="divide-y divide-stone-200 rounded-xl bg-white ring-1 ring-stone-200">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.name} className="flex justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-medium text-stone-900">{ingredient.name}</span>
                <span className="text-stone-600">
                  {ingredient.amount} {ingredient.unit ?? ''}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title" className="mb-3 text-lg font-semibold text-stone-900">
            Steps
          </h2>
          <ol className="space-y-3">
            {recipe.steps.map((step) => (
              <li key={step.stepNumber} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white"
                >
                  {step.stepNumber}
                </span>
                <div className="min-w-0">
                  <p className="text-stone-800">{step.instruction}</p>
                  {step.duration !== undefined && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                      <Timer size={12} aria-hidden="true" />
                      {step.duration} min
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Page>
  )
}

export default RecipeOverviewScreen
