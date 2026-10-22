import { useEffect, useRef, useState } from 'react'
import { Button, ButtonLink, Label, Ticket } from '../components/ui/primitives'
import Page from '../components/Page'
import RecipeRail from '../components/RecipeRail'
import { getRecipeById, recipes } from '../data/recipes'
import type { Recipe } from '../data/types'
import { useRecipeContext } from '../context/RecipeContext'

/** Every word typed must appear in the title, category or an ingredient name. */
function matches(recipe: Recipe, words: readonly string[]): boolean {
  const haystack = [recipe.title, recipe.category ?? '', ...recipe.ingredients.map((i) => i.name)].join(' ').toLowerCase()
  return words.every((word) => haystack.includes(word))
}

/** Recipes ("The Rail"). `/search` renders this with the filter focused. */
const HomeScreen = ({ focusFilter = false }: { focusFilter?: boolean }) => {
  const { inProgress } = useRecipeContext()
  const [query, setQuery] = useState('')
  const filterRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (focusFilter) filterRef.current?.focus()
  }, [focusFilter])

  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const results = words.length === 0 ? recipes : recipes.filter((recipe) => matches(recipe, words))

  const resuming = Object.entries(inProgress).flatMap(([id, step]) => {
    const recipe = getRecipeById(id)
    return recipe ? [{ recipe, step: Math.min(step, recipe.steps.length - 1) }] : []
  })

  return (
    <Page>
      <h1 className="text-title font-extrabold tracking-tight text-ink">Recipes</h1>
      <p className="mt-2 max-w-prose text-lg text-ink-2">
        Recipes you can follow from across the kitchen, by voice, hand gesture or tap.
      </p>

      <div className="mt-6 max-w-xl">
        <label htmlFor="recipe-filter" className="label-mono mb-2 block text-ink-2">
          Filter by title, ingredient or category
        </label>
        <input
          id="recipe-filter"
          ref={filterRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          className="h-12 w-full rounded-control border-2 border-ink-2 bg-paper px-4 text-lg text-ink"
        />
        <p aria-live="polite" className="label-mono mt-2 text-ink-2">
          {words.length === 0
            ? `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`
            : `${results.length} of ${recipes.length} match “${query.trim()}”`}
        </p>
      </div>

      {resuming.length > 0 && (
        <Ticket
          className="mt-8"
          header={<Label as="h2" className="text-ink">Pick up where you left off</Label>}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-dashed divide-rule">
            {resuming.map(({ recipe, step }) => (
              <li key={recipe.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="text-ticket font-extrabold text-ink">{recipe.title}</p>
                  <Label>
                    Step {step + 1} of {recipe.steps.length}
                  </Label>
                </div>
                <ButtonLink to={`/cooking/${recipe.id}`} aria-label={`Resume ${recipe.title}`} className="whitespace-nowrap">
                  Resume
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Ticket>
      )}

      <section className="mt-8" aria-labelledby="rail-title">
        <h2 id="rail-title" className="sr-only">
          All recipes
        </h2>
        {results.length > 0 ? (
          <RecipeRail recipes={results} label="Recipes" />
        ) : (
          <Ticket className="max-w-xl" bodyClassName="flex flex-col items-start gap-3 p-5 sm:p-6">
            <h3 className="text-ticket font-extrabold text-ink">No recipe matches that</h3>
            <p className="text-ink-2">Try one ingredient or a category, or clear the filter to see every recipe.</p>
            <Button onClick={() => setQuery('')} className="whitespace-nowrap">
              Clear filter
            </Button>
          </Ticket>
        )}
      </section>
    </Page>
  )
}

export default HomeScreen
