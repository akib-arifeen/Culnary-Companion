import { Link } from 'react-router'
import { Heart } from 'lucide-react'
import Page from '../components/Page'
import RecipeCard from '../components/RecipeCard'
import { recipes } from '../data/recipes'
import { useRecipeContext } from '../context/RecipeContext'

const FavoritesScreen = () => {
  const { favorites } = useRecipeContext()
  const saved = recipes.filter((recipe) => favorites.includes(recipe.id))

  return (
    <Page title="Saved">
      {saved.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {saved.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Heart size={40} className="text-stone-500" aria-hidden="true" />
          <p className="font-semibold text-stone-900">No saved recipes yet</p>
          <p className="max-w-xs text-sm text-stone-600">
            Tap the heart on a recipe to keep it here for next time.
          </p>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Browse recipes
          </Link>
        </div>
      )}
    </Page>
  )
}

export default FavoritesScreen
