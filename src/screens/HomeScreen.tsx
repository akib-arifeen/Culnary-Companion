import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Search, X } from 'lucide-react'
import { Button, Ticket } from '../components/ui/primitives'
import Page from '../components/Page'
import ResumeTicket from '../components/ResumeTicket'
import RecipeRail from '../components/RecipeRail'
import { getRecipeById, recipes } from '../data/recipes'
import type { Recipe } from '../data/types'
import { useRecipeContext } from '../context/RecipeContext'
import { PREF_DEFAULTS, PREF_KEYS, usePref } from '../lib/storage'

/** Every word typed must appear in the title, category or an ingredient name. */
function matches(recipe: Recipe, words: readonly string[]): boolean {
  const haystack = [recipe.title, recipe.category ?? '', ...recipe.ingredients.map((i) => i.name)].join(' ').toLowerCase()
  return words.every((word) => haystack.includes(word))
}

/** Recipes ("The Rail"). `/search` renders this with the filter focused. */
const HomeScreen = ({ focusFilter = false }: { focusFilter?: boolean }) => {
  const { inProgress } = useRecipeContext()
  const [voiceOn] = usePref<boolean>(PREF_KEYS.voice, PREF_DEFAULTS[PREF_KEYS.voice])
  const [gesturesOn] = usePref<boolean>(PREF_KEYS.gestures, PREF_DEFAULTS[PREF_KEYS.gestures])
  const [query, setQuery] = useState('')
  const filterRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (focusFilter) filterRef.current?.focus()
  }, [focusFilter])

  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const results = words.length === 0 ? recipes : recipes.filter((recipe) => matches(recipe, words))
  const count =
    words.length === 0
      ? `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`
      : `${results.length} of ${recipes.length} match “${query.trim()}”`
  const handsFree = `${voiceOn ? 'Voice on' : 'Voice off'} · ${gesturesOn ? 'Gestures on' : 'Gestures off'}`

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

      <div className="mt-6">
        <label htmlFor="recipe-filter" className="label-mono block text-ink-2">
          Filter<span className="sr-only"> by title, ingredient or category</span>
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="relative w-full max-w-md">
            <Search size={20} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-2" />
            <input
              id="recipe-filter"
              ref={filterRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Soup, lentils, flatbread…"
              autoComplete="off"
              className="h-12 w-full rounded-control border-2 border-ink-2 bg-paper pl-12 pr-12 text-lg text-ink placeholder:text-ink-2"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => {
                  setQuery('')
                  filterRef.current?.focus()
                }}
                className="absolute right-0 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center text-ink"
              >
                <X size={20} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <p aria-live="polite" className="label-mono text-ink-2">
            {count}
          </p>
        </div>
        <p className="label-mono mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-2">
          <span>Hands-free</span>
          <span aria-hidden="true">·</span>
          <span className={voiceOn || gesturesOn ? 'text-ink' : undefined}>{handsFree}</span>
          <Link to="/settings" className="text-ink underline decoration-2 underline-offset-3 hover:decoration-accent">
            Set up
          </Link>
        </p>
      </div>

      {resuming.length > 0 && (
        <section className="mt-8" aria-labelledby="resume-title">
          <h2 id="resume-title" className="label-mono mb-3 text-ink">
            Pick up where you left off
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resuming.map(({ recipe, step }) => (
              <li key={recipe.id} className="min-w-0">
                <ResumeTicket recipe={recipe} step={step} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-labelledby="rail-title">
        <h2 id="rail-title" className="sr-only">
          All recipes
        </h2>
        {results.length > 0 ? (
          <RecipeRail recipes={results} label="Recipes" />
        ) : (
          <Ticket className="max-w-xl" bodyClassName="flex flex-col items-start gap-3 p-5 sm:p-6">
            <h2 className="text-ticket font-extrabold text-ink">No recipe matches that</h2>
            <p className="text-ink-2">Try one ingredient or a category, or clear the filter to see every recipe.</p>
            <Button onClick={() => setQuery('')} className="whitespace-nowrap">
              Show all recipes
            </Button>
          </Ticket>
        )}
      </section>
    </Page>
  )
}

export default HomeScreen
