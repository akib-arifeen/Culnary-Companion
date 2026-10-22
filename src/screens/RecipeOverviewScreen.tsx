import { Link, useNavigate, useParams } from 'react-router'
import { Check } from 'lucide-react'
import Page from '../components/Page'
import { Button, ButtonLink, Label, Ticket } from '../components/ui/primitives'
import { getRecipeById } from '../data/recipes'
import { shortServes, shortTime } from '../lib/recipeMeta'
import { useRecipeContext } from '../context/RecipeContext'

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

  // Strip: short forms and computed counts. The full source-stated strings are shown once, under the summary.
  const serves = shortServes(recipe.servings)
  const time = shortTime(recipe.time)
  const meta = [
    time,
    serves ? `Serves ${serves}` : null,
    `${recipe.steps.length} ${recipe.steps.length === 1 ? 'step' : 'steps'}`,
  ].filter(Boolean)
  const stated = [recipe.servings ? `Serves ${recipe.servings}` : null, recipe.time, recipe.category].filter(Boolean).join(' · ')
  const revision = source.revisionUrl.match(/oldid=(\d+)/)?.[1]

  return (
    <Page withActionBar>
      <Link to="/" className="label-mono inline-flex min-h-11 items-center text-ink underline underline-offset-3 decoration-2">
        ← All recipes
      </Link>
      <h1 className="mt-2 max-w-3xl text-title font-extrabold tracking-tight text-ink">{recipe.title}</h1>

      <Ticket className="mt-5" header={<Label className="whitespace-nowrap text-ink">{meta.join(' · ')}</Label>} bodyClassName="p-4 sm:p-5">
        <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-start">
          <figure className="min-w-0">
            <img
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              className="aspect-4/3 w-full rounded-ticket border border-rule bg-paper-2 object-cover"
            />
            <figcaption className="mt-2 text-sm text-ink-2">
              Photo: {photo.author},{' '}
              {photo.licenseUrl ? <External href={photo.licenseUrl}>{photo.license}</External> : photo.license}, via{' '}
              <External href={photo.filePage}>Wikimedia Commons</External>
            </figcaption>
          </figure>

          <div className="flex min-w-0 flex-col gap-4">
            <p className="max-w-prose text-xl text-ink">{recipe.summary}</p>
            {stated ? <p className="max-w-prose text-ink-2">{stated}</p> : null}
            <div>
              <Button
                variant="secondary"
                aria-pressed={saved}
                onClick={() => toggleFavorite(recipe.id)}
                className={`whitespace-nowrap ${saved ? 'bg-ink! text-paper!' : ''}`}
              >
                {saved ? <Check size={18} aria-hidden="true" /> : null}
                Save recipe
              </Button>
            </div>
          </div>
        </div>
      </Ticket>

      <Ticket className="mt-6" bodyClassName="grid p-0 md:grid-cols-[2fr_3fr]">
        <section aria-labelledby="mise-title" className="min-w-0 p-4 sm:p-5">
          <h2 id="mise-title" className="label-mono text-ink">Mise en place</h2>
          <ul className="mt-3 divide-y divide-dashed divide-rule">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.name} className="flex items-baseline justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{ingredient.name}</p>
                  {ingredient.note ? <p className="text-sm text-ink-2">{ingredient.note}</p> : null}
                </div>
                {ingredient.quantity ? (
                  <p className="shrink-0 text-right font-mono font-semibold text-ink">{ingredient.quantity}</p>
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
