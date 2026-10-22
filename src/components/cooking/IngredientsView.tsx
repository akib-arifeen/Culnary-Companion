import type { Ingredient } from '../../data/recipes'
import { BTN_SECONDARY } from './ui'

interface IngredientsViewProps {
  ingredients: readonly Ingredient[]
  checked: ReadonlySet<number>
  onToggle: (index: number) => void
  onCheckAll: (checked: boolean) => void
}

export default function IngredientsView({ ingredients, checked, onToggle, onCheckAll }: IngredientsViewProps) {
  const allChecked = ingredients.length > 0 && checked.size === ingredients.length
  return (
    <div className="h-full overflow-y-auto px-5 py-4 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">
            {checked.size} of {ingredients.length} checked
          </h2>
          <button type="button" onClick={() => onCheckAll(!allChecked)} className={`${BTN_SECONDARY} h-11 px-4`}>
            {allChecked ? 'Uncheck all' : 'Check all'}
          </button>
        </div>
        <ul className="grid gap-x-8 md:grid-cols-2 short:grid-cols-2">
          {ingredients.map((ingredient, index) => {
            const isChecked = checked.has(index)
            const amount = `${ingredient.amount}${ingredient.unit ? ` ${ingredient.unit}` : ''}`
            return (
              <li key={`${ingredient.name}-${index}`} className="border-b border-stone-200 last:border-b-0">
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-white">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(index)}
                    className={`size-6 shrink-0 cursor-pointer accent-brand-700`}
                  />
                  <span className={`min-w-0 flex-1 text-lg font-medium ${isChecked ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                    {ingredient.name}
                  </span>
                  <span className={`shrink-0 text-base ${isChecked ? 'text-stone-500 line-through' : 'text-stone-600'}`}>{amount}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
