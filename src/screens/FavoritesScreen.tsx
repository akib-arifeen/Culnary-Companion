import EmptyState from '../components/EmptyState'
import Page from '../components/Page'
import RecipeRail from '../components/RecipeRail'
import { recipes } from '../data/recipes'
import { useRecipeContext } from '../context/RecipeContext'

const FavoritesScreen = () => {
  const { favorites } = useRecipeContext()
  const saved = recipes.filter((recipe) => favorites.includes(recipe.id))

  return (
    <Page>
      <h1 className="text-title font-extrabold tracking-tight text-ink">Saved</h1>
      <p className="mt-2 max-w-prose text-ink-2">The recipes you want within reach next time you cook.</p>
      <div className="mt-6">
        {saved.length > 0 ? (
          <RecipeRail recipes={saved} label="Saved recipes" />
        ) : (
          <EmptyState strip="Saved" title="Nothing saved yet" actionLabel="Browse recipes">
            Open a recipe and tap Save recipe; it waits here, one tap from the kitchen.
          </EmptyState>
        )}
      </div>
    </Page>
  )
}

export default FavoritesScreen
