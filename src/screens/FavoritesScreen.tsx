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
      <div className="mt-6">
        {saved.length > 0 ? (
          <RecipeRail recipes={saved} label="Saved recipes" />
        ) : (
          <EmptyState strip="Saved · 0" actionLabel="Browse recipes">
            Tap SAVE RECIPE on any recipe to keep it here.
          </EmptyState>
        )}
      </div>
    </Page>
  )
}

export default FavoritesScreen
