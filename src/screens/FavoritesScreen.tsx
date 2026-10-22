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
          <EmptyState title="Nothing saved yet" actionLabel="Browse recipes">
            Recipes you save are kept here, so tonight's dinner is one tap away next time.
          </EmptyState>
        )}
      </div>
    </Page>
  )
}

export default FavoritesScreen
