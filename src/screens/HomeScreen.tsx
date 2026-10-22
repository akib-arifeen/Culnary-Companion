import { Link } from 'react-router'
import { Clock, Hand, Mic, Volume2, type LucideIcon } from 'lucide-react'
import Page from '../components/Page'
import RecipeCard from '../components/RecipeCard'
import { getRecipeById, recipes } from '../data/recipes'
import { useRecipeContext } from '../context/RecipeContext'

const HANDS_FREE: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Hand, title: 'Gestures', text: 'Thumb up for the next step, open palm to hear it again.' },
  { icon: Mic, title: 'Voice', text: 'Say "next", "back" or "timer for five minutes".' },
  { icon: Volume2, title: 'Read aloud', text: 'Each step is spoken as you move through the recipe.' },
]

const primaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800'
const secondaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50'

const HomeScreen = () => {
  const { inProgress } = useRecipeContext()
  const featured = recipes[0]

  const continuing = Object.entries(inProgress)
    .map(([id, step]) => ({ recipe: getRecipeById(id), step }))
    .filter((entry): entry is { recipe: NonNullable<typeof entry.recipe>; step: number } => entry.recipe !== undefined)

  return (
    <Page>
      <div className="space-y-6 short:space-y-4">
        <section
          aria-labelledby="featured-title"
          className="grid overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs md:grid-cols-2"
        >
          <img
            src={featured.image}
            alt=""
            width={960}
            height={720}
            className="aspect-16/10 size-full object-cover md:aspect-auto short:aspect-16/6"
          />
          <div className="flex flex-col justify-center gap-3 p-4 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Featured</p>
            <h2 id="featured-title" className="text-xl font-bold text-stone-900 md:text-2xl">
              {featured.title}
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-stone-600">
              <Clock size={16} aria-hidden="true" />
              {featured.prepTime + featured.cookTime} min · {featured.difficulty} · {featured.cuisine}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to={`/cooking/${featured.id}`} className={primaryButton}>
                Start cooking
              </Link>
              <Link to={`/recipe/${featured.id}`} className={secondaryButton}>
                View recipe
              </Link>
            </div>
          </div>
        </section>

        {continuing.length > 0 && (
          <section aria-labelledby="continue-title">
            <h2 id="continue-title" className="mb-2 text-lg font-semibold text-stone-900">
              Continue cooking
            </h2>
            <ul className="space-y-2">
              {continuing.slice(0, 2).map(({ recipe, step }) => (
                <li
                  key={recipe.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
                >
                  <img
                    src={recipe.image}
                    alt=""
                    width={96}
                    height={96}
                    loading="lazy"
                    className="size-14 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 grow">
                    <p className="truncate font-semibold text-stone-900">{recipe.title}</p>
                    <p className="text-sm text-stone-600">
                      Step {Math.min(step + 1, recipe.steps.length)} of {recipe.steps.length}
                    </p>
                  </div>
                  <Link to={`/cooking/${recipe.id}`} className={primaryButton}>
                    Resume
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="handsfree-title" className="rounded-2xl bg-brand-50 p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 id="handsfree-title" className="text-lg font-semibold text-stone-900">
              Cook hands-free
            </h2>
            <Link to={`/cooking/${featured.id}`} className="rounded text-sm font-semibold text-brand-800 underline">
              Try it with {featured.title}
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {HANDS_FREE.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <Icon size={22} className="mt-0.5 shrink-0 text-brand-700" aria-hidden="true" />
                <p className="text-sm text-stone-700">
                  <span className="font-semibold text-stone-900">{title}.</span> {text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="all-title">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 id="all-title" className="text-lg font-semibold text-stone-900">
              All recipes
            </h2>
            <Link to="/recents" className="rounded text-sm font-semibold text-brand-800 underline">
              In progress
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Page>
  )
}

export default HomeScreen
