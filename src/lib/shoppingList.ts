import type { Recipe } from '../data/types'

/**
 * The shopping list holds ingredient references, never edited copies: a row is rendered from the
 * current recipe data, so names and quantities stay exactly as the source states them.
 */
export interface ShoppingEntry {
  recipeId: string
  /** Index in that recipe's `ingredients` array. */
  index: number
  checked: boolean
}

export type RecipeLookup = (recipeId: string) => Recipe | undefined

export function shoppingKey(recipeId: string, index: number): string {
  return `${recipeId}:${index}`
}

/**
 * Storage is user-editable and may hold anything: keep only entries that name a real recipe and a
 * real ingredient index, and drop duplicates.
 */
export function cleanShoppingList(raw: unknown, findRecipe: RecipeLookup): ShoppingEntry[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const entries: ShoppingEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { recipeId, index, checked } = item as Record<string, unknown>
    if (typeof recipeId !== 'string' || typeof index !== 'number' || !Number.isInteger(index)) continue
    if (typeof checked !== 'boolean') continue
    const recipe = findRecipe(recipeId)
    if (!recipe || index < 0 || index >= recipe.ingredients.length) continue
    const key = shoppingKey(recipeId, index)
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({ recipeId, index, checked })
  }
  return entries
}

/** Adds every ingredient of the recipe that is not on the list yet. Existing ticks are kept. */
export function addAllIngredients(list: readonly ShoppingEntry[], recipeId: string, ingredientCount: number): ShoppingEntry[] {
  const present = new Set(list.filter((entry) => entry.recipeId === recipeId).map((entry) => entry.index))
  if (present.size === ingredientCount) return list as ShoppingEntry[]
  const next = [...list]
  for (let index = 0; index < ingredientCount; index += 1) {
    if (!present.has(index)) next.push({ recipeId, index, checked: false })
  }
  return next
}

/** No-op for an entry that is not on the list, so a stale click cannot invent a row. */
export function setShoppingChecked(
  list: readonly ShoppingEntry[],
  recipeId: string,
  index: number,
  checked: boolean,
): ShoppingEntry[] {
  if (!list.some((entry) => entry.recipeId === recipeId && entry.index === index && entry.checked !== checked)) {
    return list as ShoppingEntry[]
  }
  return list.map((entry) =>
    entry.recipeId === recipeId && entry.index === index ? { ...entry, checked } : entry,
  )
}

export function removeShoppingItem(list: readonly ShoppingEntry[], recipeId: string, index: number): ShoppingEntry[] {
  const next = list.filter((entry) => !(entry.recipeId === recipeId && entry.index === index))
  return next.length === list.length ? (list as ShoppingEntry[]) : next
}

export function removeCheckedItems(list: readonly ShoppingEntry[]): ShoppingEntry[] {
  const next = list.filter((entry) => !entry.checked)
  return next.length === list.length ? (list as ShoppingEntry[]) : next
}

/** Ingredients of one recipe that are on the list (checked or not). */
export function countForRecipe(list: readonly ShoppingEntry[], recipeId: string): number {
  return list.filter((entry) => entry.recipeId === recipeId).length
}

interface Group {
  recipe: Recipe
  entries: ShoppingEntry[]
}

/** Entries grouped in the order their recipe was first added, each group in ingredient order. */
export function groupShoppingList(list: readonly ShoppingEntry[], findRecipe: RecipeLookup): Group[] {
  const byRecipe = new Map<string, ShoppingEntry[]>()
  for (const entry of list) {
    const group = byRecipe.get(entry.recipeId)
    if (group) group.push(entry)
    else byRecipe.set(entry.recipeId, [entry])
  }
  return [...byRecipe].flatMap(([recipeId, entries]) => {
    const recipe = findRecipe(recipeId)
    if (!recipe) return []
    return [{ recipe, entries: [...entries].sort((a, b) => a.index - b.index) }]
  })
}

function ingredientLine(recipe: Recipe, entry: ShoppingEntry): string {
  const ingredient = recipe.ingredients[entry.index]
  const quantity = ingredient.quantity ? `${ingredient.quantity} ` : ''
  const note = ingredient.note ? ` (${ingredient.note})` : ''
  return `[${entry.checked ? 'x' : ' '}] ${quantity}${ingredient.name}${note}`
}

/**
 * The plain-text view, for the clipboard or manual copying. Ingredient text is copied verbatim
 * from the recipe; the source credit travels with it because the recipes are CC BY-SA 4.0.
 */
export function shoppingListText(list: readonly ShoppingEntry[], findRecipe: RecipeLookup): string {
  const groups = groupShoppingList(list, findRecipe)
  if (groups.length === 0) return ''
  const blocks = groups.map(({ recipe, entries }) =>
    [recipe.title, ...entries.map((entry) => ingredientLine(recipe, entry))].join('\n'),
  )
  return [
    'SHOPPING LIST',
    ...blocks,
    'Recipes adapted from the Wikibooks Cookbook (https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents), CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).',
  ].join('\n\n')
}
