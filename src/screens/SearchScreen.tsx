import { useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import Page from '../components/Page'
import RecipeCard from '../components/RecipeCard'
import { recipes, type Recipe } from '../data/recipes'

/** Every word typed must appear in the title, cuisine, difficulty or an ingredient name. */
function matches(recipe: Recipe, words: readonly string[]): boolean {
  const haystack = [recipe.title, recipe.cuisine, recipe.difficulty, ...recipe.ingredients.map((i) => i.name)]
    .join(' ')
    .toLowerCase()
  return words.every((word) => haystack.includes(word))
}

const SearchScreen = () => {
  const [query, setQuery] = useState('')
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const results = words.length === 0 ? recipes : recipes.filter((recipe) => matches(recipe, words))

  return (
    <Page title="Search">
      <label htmlFor="recipe-search" className="sr-only">
        Search recipes
      </label>
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
          aria-hidden="true"
        />
        <input
          id="recipe-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Title, cuisine, difficulty or ingredient"
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3 text-base text-stone-900 placeholder:text-stone-500"
        />
      </div>

      <p aria-live="polite" className="my-3 text-sm text-stone-600">
        {words.length === 0
          ? `${recipes.length} recipes`
          : `${results.length} ${results.length === 1 ? 'result' : 'results'} for "${query.trim()}"`}
      </p>

      {results.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {results.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <SearchX size={40} className="text-stone-500" aria-hidden="true" />
          <p className="font-semibold text-stone-900">No recipes match your search</p>
          <p className="text-sm text-stone-600">Try an ingredient like chicken, or a cuisine like Italian.</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="min-h-11 cursor-pointer rounded-lg border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Clear search
          </button>
        </div>
      )}
    </Page>
  )
}

export default SearchScreen
