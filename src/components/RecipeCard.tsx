import { Link } from 'react-router'
import { Clock } from 'lucide-react'
import type { Recipe } from '../data/recipes'

interface RecipeCardProps {
  recipe: Recipe
  /** Optional line under the meta row, e.g. "Step 3 of 7". */
  note?: string
}

export default function RecipeCard({ recipe, note }: RecipeCardProps) {
  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="aspect-4/3 overflow-hidden bg-stone-100">
        <img
          src={recipe.image}
          alt=""
          width={960}
          height={720}
          loading="lazy"
          className="size-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-stone-900">{recipe.title}</h3>
        <p className="flex items-center gap-1 text-xs text-stone-600">
          <Clock size={12} aria-hidden="true" />
          <span>
            {recipe.prepTime + recipe.cookTime} min · {recipe.difficulty}
          </span>
        </p>
        {note && <p className="text-xs font-medium text-brand-800">{note}</p>}
      </div>
    </Link>
  )
}
