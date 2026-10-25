import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Copy, X } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import Page from '../components/Page'
import { Button, Label, Ticket } from '../components/ui/primitives'
import { getRecipeById } from '../data/recipes'
import { useShoppingList } from '../hooks/useShoppingList'
import { copyText } from '../lib/clipboard'
import { groupShoppingList, shoppingKey, shoppingListText, type ShoppingEntry } from '../lib/shoppingList'

/**
 * Before cooking: one list, built from whole recipes at their stated quantities. Ticks are stored
 * separately from the cooking screen's checklist, so neither overwrites the other.
 */
export default function ShoppingListScreen() {
  const { items, toggleItem, removeItem, removeChecked } = useShoppingList()
  const [status, setStatus] = useState('')
  const [showPlain, setShowPlain] = useState(false)

  const titleRef = useRef<HTMLHeadingElement>(null)
  const plainRef = useRef<HTMLTextAreaElement>(null)
  /** Key of the row to focus once the removal has re-rendered ('title' when nothing is left). */
  const pendingFocus = useRef<string | null>(null)

  const groups = useMemo(() => groupShoppingList(items, getRecipeById), [items])
  const ordered = useMemo(
    () => groups.flatMap(({ entries }) => entries),
    [groups],
  )
  const total = items.length
  const checkedCount = items.filter((entry) => entry.checked).length
  const plainText = useMemo(() => shoppingListText(items, getRecipeById), [items])

  useEffect(() => {
    const key = pendingFocus.current
    if (!key) return
    pendingFocus.current = null
    if (key === 'title') titleRef.current?.focus()
    else document.querySelector<HTMLInputElement>(`[data-shopping-key="${key}"] input`)?.focus()
  }, [items])

  useEffect(() => {
    if (!showPlain) return
    plainRef.current?.focus()
    plainRef.current?.select()
  }, [showPlain])

  const remove = (entry: ShoppingEntry) => {
    const position = ordered.findIndex((item) => item.recipeId === entry.recipeId && item.index === entry.index)
    const next = ordered[position + 1] ?? ordered[position - 1]
    pendingFocus.current = next ? shoppingKey(next.recipeId, next.index) : 'title'
    const ingredient = getRecipeById(entry.recipeId)?.ingredients[entry.index]
    setStatus(ingredient ? `Removed ${ingredient.name} from the shopping list.` : '')
    removeItem(entry.recipeId, entry.index)
  }

  const onCopy = async () => {
    if (await copyText(plainText)) {
      setShowPlain(false)
      setStatus('Shopping list copied to the clipboard.')
    } else {
      setShowPlain(true)
      setStatus('Copying isn’t available here. The list is shown as plain text, ready to select and copy.')
    }
  }

  return (
    <Page>
      <div className="mx-auto max-w-3xl">
        <h1 id="shopping-title" ref={titleRef} tabIndex={-1} className="text-title font-extrabold tracking-tight text-ink">
          Shopping list
        </h1>
        <p className="mt-2 max-w-prose text-lg text-ink-2">
          Every ingredient at the quantity the recipe states. Tick items off as they go in the basket; the list stays
          on this device.
        </p>

        <p role="status" className={status ? 'mt-3 max-w-prose font-bold text-ink' : 'sr-only'}>
          {status}
        </p>

        {total === 0 ? (
          <div className="mt-6">
            <EmptyState strip="Shopping list" title="Nothing on the list yet" actionLabel="Browse recipes">
              Open a recipe and choose “Add all ingredients”. Ingredients keep the recipe’s exact names and quantities.
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={onCopy} className="whitespace-nowrap">
                <Copy size={18} aria-hidden="true" />
                Copy list
              </Button>
              {checkedCount > 0 ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    pendingFocus.current = 'title'
                    setStatus(
                      checkedCount === 1 ? 'Removed 1 checked item.' : `Removed ${checkedCount} checked items.`,
                    )
                    removeChecked()
                  }}
                  className="whitespace-nowrap"
                >
                  Remove checked
                </Button>
              ) : null}
              <Label>
                {checkedCount} of {total} checked
              </Label>
            </div>

            {showPlain ? (
              <div className="mt-4">
                <label htmlFor="shopping-plain-text" className="label-mono text-ink">
                  Plain text
                </label>
                <textarea
                  id="shopping-plain-text"
                  ref={plainRef}
                  readOnly
                  rows={12}
                  value={plainText}
                  spellCheck={false}
                  className="mt-2 w-full resize-y rounded-(--radius-control) border-2 border-ink-2 bg-paper p-3 font-mono text-base text-ink"
                />
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              {groups.map(({ recipe, entries }) => (
                <Ticket
                  key={recipe.id}
                  as="section"
                  header={
                    <>
                      <h2 className="label-mono min-w-0 text-ink">
                        <Link
                          to={`/recipe/${recipe.id}`}
                          className="underline underline-offset-3 decoration-2 hover:decoration-accent"
                        >
                          {recipe.title}
                        </Link>
                      </h2>
                      <Label className="whitespace-nowrap">
                        {entries.length} {entries.length === 1 ? 'item' : 'items'}
                      </Label>
                    </>
                  }
                  bodyClassName="p-2 sm:p-3"
                >
                  <ul>
                    {entries.map((entry) => {
                      const ingredient = recipe.ingredients[entry.index]
                      const key = shoppingKey(entry.recipeId, entry.index)
                      return (
                        <li
                          key={key}
                          data-shopping-key={key}
                          className="flex items-stretch border-b border-rule last:border-b-0"
                        >
                          <label className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-(--radius-control) px-2 py-1.5 hover:bg-paper-2">
                            <input
                              type="checkbox"
                              checked={entry.checked}
                              onChange={() => toggleItem(entry.recipeId, entry.index)}
                              className="size-7 shrink-0 cursor-pointer accent-ink"
                            />
                            <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                              <span className="min-w-0 flex-1 basis-28">
                                <span
                                  className={`block text-lg font-bold ${entry.checked ? 'text-ink-2 line-through' : 'text-ink'}`}
                                >
                                  {ingredient.name}
                                </span>
                                {ingredient.note ? (
                                  <span className="text-sm text-ink-2">{ingredient.note}</span>
                                ) : null}
                              </span>
                              {ingredient.quantity ? (
                                <span
                                  className={`ml-auto shrink-0 text-right font-mono text-base font-semibold ${entry.checked ? 'text-ink-2 line-through' : 'text-ink'}`}
                                >
                                  {ingredient.quantity}
                                </span>
                              ) : null}
                            </span>
                          </label>
                          <button
                            type="button"
                            aria-label={`Remove ${ingredient.name}${ingredient.quantity ? `, ${ingredient.quantity}` : ''} from the shopping list`}
                            onClick={() => remove(entry)}
                            className="flex w-14 shrink-0 cursor-pointer items-center justify-center text-ink-2 hover:text-ink"
                          >
                            <X size={20} aria-hidden="true" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </Ticket>
              ))}
            </div>

            <p className="mt-6 max-w-prose text-sm text-ink-2">
              Ingredients are copied from recipes adapted from the{' '}
              <a
                href="https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-3 decoration-2 hover:decoration-accent"
              >
                Wikibooks Cookbook
                <span className="sr-only"> (opens in a new tab)</span>
              </a>{' '}
              (CC BY-SA 4.0). Each recipe title links to its source, revision and photo credit.
            </p>
          </>
        )}
      </div>
    </Page>
  )
}
