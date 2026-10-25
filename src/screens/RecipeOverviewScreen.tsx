import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Check, ShoppingBasket } from 'lucide-react'
import Page from '../components/Page'
import RecipePhoto from '../components/RecipePhoto'
import { Button, ButtonLink, Label, Ticket } from '../components/ui/primitives'
import { getRecipeById } from '../data/recipes'
import { countForRecipe } from '../lib/shoppingList'
import { bodyCounts, extraFacts, shortServes, shortTime } from '../lib/recipeMeta'
import { useRecipeContext } from '../context/RecipeContext'
import { useShoppingList } from '../hooks/useShoppingList'

const linkClass = 'underline underline-offset-3 decoration-2 hover:decoration-accent'

function External({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/** Recipe ("Full ticket"): header, photo + CTA, Mise en place | Method, Credits. */
const RecipeOverviewScreen = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const recipe = id ? getRecipeById(id) : undefined
  const { isFavorite, toggleFavorite, getCurrentStep, setInProgress } = useRecipeContext()
  const { items: shoppingItems, addRecipe } = useShoppingList()
  const [shoppingStatus, setShoppingStatus] = useState('')

  if (!recipe) {
    return (
      <Page>
        <h1 className="text-title font-extrabold tracking-tight text-ink">Recipe not found</h1>
        <p className="mt-3 max-w-prose text-lg text-ink-2">That recipe isn't on the rail.</p>
        <ButtonLink to="/" className="mt-6 whitespace-nowrap">
          Browse all recipes
        </ButtonLink>
      </Page>
    )
  }

  const saved = isFavorite(recipe.id)
  const progress = getCurrentStep(recipe.id)
  const resumeStep = progress === undefined ? undefined : Math.min(progress, recipe.steps.length - 1)
  const cookingPath = `/cooking/${recipe.id}`
  const { photo, source } = recipe

  // Strip: short forms and computed counts. The body adds only facts the strip cannot carry (DESIGN.md).
  const serves = shortServes(recipe.servings)
  const time = shortTime(recipe.time)
  const meta = [
    time,
    serves ? `Serves ${serves}` : null,
    `${recipe.steps.length} ${recipe.steps.length === 1 ? 'step' : 'steps'}`,
  ].filter(Boolean)
  const more = extraFacts(recipe)
  const counts = bodyCounts(recipe)
  const revision = source.revisionUrl.match(/oldid=(\d+)/)?.[1]

  const onShoppingList = countForRecipe(shoppingItems, recipe.id)
  const allOnShoppingList = recipe.ingredients.length > 0 && onShoppingList === recipe.ingredients.length
  const addAllToShoppingList = () => {
    const missing = recipe.ingredients.length - onShoppingList
    addRecipe(recipe.id)
    if (missing === 0) {
      setShoppingStatus(
        recipe.ingredients.length === 1
          ? 'The ingredient is already on the shopping list.'
          : `All ${recipe.ingredients.length} ingredients are already on the shopping list.`,
      )
    } else {
      setShoppingStatus(`Added ${missing} ${missing === 1 ? 'ingredient' : 'ingredients'} to the shopping list.`)
    }
  }

  return (
    <Page withActionBar>
      <Link to="/" className="label-mono inline-flex min-h-11 items-center text-ink underline underline-offset-3 decoration-2">
        ← All recipes
      </Link>
      <h1 className="mt-2 max-w-3xl text-title font-extrabold tracking-tight text-ink">{recipe.title}</h1>

      <Ticket className="mt-5" header={<Label className="whitespace-nowrap text-ink">{meta.join(' · ')}</Label>} bodyClassName="p-4 sm:p-5">
        <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-stretch">
          <figure className="flex min-w-0 flex-col">
            <RecipePhoto
              photo={photo}
              className="aspect-4/3 w-full rounded-ticket border border-rule bg-paper-2 object-cover md:max-h-80"
            />
            <figcaption className="mt-2 text-sm text-ink-2">
              Photo: {photo.author},{' '}
              {photo.licenseUrl ? <External href={photo.licenseUrl}>{photo.license}</External> : photo.license}, via{' '}
              <External href={photo.filePage}>Wikimedia Commons</External>
            </figcaption>
          </figure>

          <div className="flex min-w-0 flex-col gap-5 md:justify-center">
            <div className="space-y-3">
              <p className="max-w-prose text-xl text-ink">{recipe.summary}</p>
              {more.length > 0 ? <p className="max-w-prose text-ink-2">{more.join(' · ')}</p> : null}
              <p className="label-mono text-ink-2">{counts}</p>
            </div>
            <div className="flex flex-col items-start gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  aria-pressed={saved}
                  onClick={() => toggleFavorite(recipe.id)}
                  className={`whitespace-nowrap ${saved ? 'bg-ink! text-paper!' : ''}`}
                >
                  {saved ? <Check size={18} aria-hidden="true" /> : null}
                  Save recipe
                </Button>
                {allOnShoppingList ? (
                  <ButtonLink to="/shopping" variant="secondary" className="whitespace-nowrap">
                    <ShoppingBasket size={18} aria-hidden="true" />
                    Open shopping list
                  </ButtonLink>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={addAllToShoppingList}
                    aria-label={`${onShoppingList === 0 ? 'Add all ingredients' : 'Add remaining ingredients'} from ${recipe.title} to the shopping list`}
                  >
                    <ShoppingBasket size={18} aria-hidden="true" />
                    {onShoppingList === 0 ? 'Add all ingredients' : 'Add remaining ingredients'}
                  </Button>
                )}
              </div>
              {shoppingItems.length > 0 && !allOnShoppingList ? (
                <Link to="/shopping" className={`${linkClass} label-mono inline-flex min-h-11 items-center`}>
                  Shopping list · {shoppingItems.length} {shoppingItems.length === 1 ? 'item' : 'items'}
                </Link>
              ) : null}
              <p role="status" className={shoppingStatus ? 'max-w-prose font-bold text-ink' : 'sr-only'}>
                {shoppingStatus}
              </p>
            </div>
          </div>
        </div>
      </Ticket>

      <Ticket className="mt-6" bodyClassName="grid p-0 md:grid-cols-[2fr_3fr]">
        <section aria-labelledby="mise-title" className="min-w-0 p-4 sm:p-5">
          <h2 id="mise-title" className="label-mono text-ink">Mise en place</h2>
          <ul className="mt-3 divide-y divide-dashed divide-rule">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.name} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-bold text-ink">{ingredient.name}</p>
                  {ingredient.note ? <p className="text-sm text-ink-2">{ingredient.note}</p> : null}
                </div>
                {ingredient.quantity ? (
                  <p className="ml-auto shrink-0 text-right font-mono font-semibold text-ink">{ingredient.quantity}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="method-title"
          className="min-w-0 border-t-2 border-dashed border-rule p-4 sm:p-5 md:border-t-0 md:border-l-2"
        >
          <h2 id="method-title" className="label-mono text-ink">Method</h2>
          <ol className="mt-3 divide-y divide-dashed divide-rule">
            {recipe.steps.map((step) => (
              <li key={step.stepNumber} className="flex gap-4 py-3">
                <span aria-hidden="true" className="w-9 shrink-0 font-mono text-3xl font-bold leading-none text-ink">
                  {step.stepNumber}
                </span>
                <div className="min-w-0">
                  <p className="max-w-prose text-lg text-ink">{step.instruction}</p>
                  {step.duration !== undefined && (
                    <p className="label-mono mt-2 inline-block rounded-full border-2 border-ink-2 px-3 py-0.5 text-ink">
                      {step.duration} min
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </Ticket>

      <section aria-labelledby="credits-title" className="mt-8 max-w-3xl space-y-2 text-sm text-ink-2">
        <h2 id="credits-title" className="label-mono text-ink">Credits</h2>
        <p>
          Adapted from <External href={source.url}>{source.page}</External> (Wikibooks contributors),{' '}
          <External href={source.licenseUrl}>{source.license}</External>. Changes: {source.changes.replace(/\.$/, '')}. Revision:{' '}
          <a href={source.revisionUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {revision ? `revision ${revision}` : source.revisionUrl}
          </a>
          .
        </p>
        <p>
          Photo: {photo.author},{' '}
          {photo.licenseUrl ? <External href={photo.licenseUrl}>{photo.license}</External> : photo.license}, via{' '}
          <External href={photo.filePage}>Wikimedia Commons</External>.
        </p>
      </section>

      {/* Ticket stub: sticky at every width; above the phone bottom nav, flush to the edge from md. */}
      <section
        aria-label="Cooking actions"
        className="fixed inset-x-0 bottom-14 z-30 border-t-2 border-dashed border-rule bg-paper md:bottom-0"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <p aria-hidden="true" className="hidden min-w-0 grow truncate text-ticket font-extrabold text-ink md:block">
            {recipe.title}
          </p>
          <div className="flex grow items-center gap-3 md:grow-0">
            {resumeStep !== undefined && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setInProgress(recipe.id, 0)
                  navigate(cookingPath)
                }}
                className="order-first shrink-0 whitespace-nowrap px-4! sm:px-6!"
              >
                Start over
              </Button>
            )}
            <ButtonLink
              to={cookingPath}
              size="lg"
              onClick={() => {
                if (resumeStep === undefined) setInProgress(recipe.id, 0)
              }}
              className="grow whitespace-nowrap px-4! sm:px-6! md:grow-0"
            >
              {resumeStep === undefined ? 'Start cooking' : `Resume at step ${resumeStep + 1}`}
            </ButtonLink>
          </div>
        </div>
      </section>
    </Page>
  )
}

export default RecipeOverviewScreen
