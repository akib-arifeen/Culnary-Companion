import type { Ingredient } from '../../data/types'
import { Button, Label, Ticket } from '../ui/primitives'

interface IngredientsPanelProps {
  ingredients: readonly Ingredient[]
  checked: ReadonlySet<number>
  /** Indices of ingredients the CURRENT step mentions; they get the "THIS STEP" highlight. */
  usedNow: ReadonlySet<number>
  onToggle: (index: number) => void
  onCheckAll: (checked: boolean) => void
}

/** The mise en place checklist: mono quantities, strike-through when checked, a highlight for this step's ingredients. */
export default function IngredientsPanel({ ingredients, checked, usedNow, onToggle, onCheckAll }: IngredientsPanelProps) {
  const allChecked = ingredients.length > 0 && checked.size === ingredients.length
  return (
    <Ticket
      as="section"
      header={
        <>
          <Label as="h2">Ingredients</Label>
          <Label>
            {checked.size} of {ingredients.length} checked
          </Label>
        </>
      }
      bodyClassName="p-2 sm:p-3"
    >
      <ul>
        {ingredients.map((ingredient, index) => {
          const isChecked = checked.has(index)
          const thisStep = usedNow.has(index)
          return (
            <li key={`${ingredient.name}-${index}`} className="border-b border-rule last:border-b-0">
              <label
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-(--radius-control) px-2 py-1.5 ${thisStep ? 'bg-accent-soft' : 'hover:bg-paper-2'}`}
              >
                <input type="checkbox" checked={isChecked} onChange={() => onToggle(index)} className="size-7 shrink-0 cursor-pointer accent-ink" />
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="min-w-0 flex-1 basis-28">
                    <span className={`block text-lg font-bold ${isChecked ? 'text-ink-2 line-through' : 'text-ink'}`}>
                      {ingredient.name}
                    </span>
                    {ingredient.note ? <span className="line-clamp-2 text-sm text-ink-2">{ingredient.note}</span> : null}
                    {thisStep ? <Label className="block text-ink!">This step</Label> : null}
                  </span>
                  {ingredient.quantity ? (
                    <span className={`ml-auto shrink-0 text-right font-mono text-base font-semibold ${isChecked ? 'text-ink-2 line-through' : 'text-ink'}`}>{ingredient.quantity}</span>
                  ) : null}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <Button variant="secondary" size="lg" onClick={() => onCheckAll(!allChecked)} className="mt-3 w-full">
        {allChecked ? 'Uncheck all' : 'Check all'}
      </Button>
    </Ticket>
  )
}
