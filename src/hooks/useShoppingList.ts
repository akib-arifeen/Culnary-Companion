import { useCallback, useMemo } from 'react'
import { getRecipeById } from '../data/recipes'
import {
  addAllIngredients,
  cleanShoppingList,
  removeCheckedItems,
  removeShoppingItem,
  restoreShoppingItems,
  setShoppingChecked,
  type ShoppingEntry,
} from '../lib/shoppingList'
import { PREF_KEYS, readJSON, usePref, writeJSON } from '../lib/storage'

/**
 * The pre-cooking shopping list, stored in this browser. It is deliberately its own storage key and
 * its own hook: the cooking screen's ingredient ticks are session state and must never overwrite it
 * (or be overwritten by it).
 */
export function useShoppingList() {
  const [raw] = usePref<unknown>(PREF_KEYS.shoppingList, [])
  const items = useMemo(() => cleanShoppingList(raw, getRecipeById), [raw])

  // Writers read the stored value again, so quick taps in one tick both apply.
  const current = useCallback(() => cleanShoppingList(readJSON<unknown>(PREF_KEYS.shoppingList, []), getRecipeById), [])

  const addRecipe = useCallback(
    (recipeId: string) => {
      const recipe = getRecipeById(recipeId)
      if (!recipe) return
      const stored = current()
      const next = addAllIngredients(stored, recipeId, recipe.ingredients.length)
      if (next !== stored) writeJSON(PREF_KEYS.shoppingList, next)
    },
    [current],
  )

  const toggleItem = useCallback(
    (recipeId: string, index: number) => {
      const stored = current()
      const entry = stored.find((item) => item.recipeId === recipeId && item.index === index)
      if (!entry) return
      const next = setShoppingChecked(stored, recipeId, index, !entry.checked)
      if (next !== stored) writeJSON(PREF_KEYS.shoppingList, next)
    },
    [current],
  )

  const removeItem = useCallback(
    (recipeId: string, index: number) => {
      const stored = current()
      const next = removeShoppingItem(stored, recipeId, index)
      if (next !== stored) writeJSON(PREF_KEYS.shoppingList, next)
    },
    [current],
  )

  const removeChecked = useCallback(() => {
    const stored = current()
    const next = removeCheckedItems(stored)
    if (next !== stored) writeJSON(PREF_KEYS.shoppingList, next)
  }, [current])

  /** Puts removed entries back; false when there was nothing to restore (so callers do not move focus for nothing). */
  const restoreRemoved = useCallback(
    (snapshot: readonly ShoppingEntry[], removedKeys: readonly string[]) => {
      const stored = current()
      const next = restoreShoppingItems(stored, snapshot, new Set(removedKeys))
      if (next === stored) return false
      writeJSON(PREF_KEYS.shoppingList, next)
      return true
    },
    [current],
  )

  return { items, addRecipe, toggleItem, removeItem, removeChecked, restoreRemoved }
}

export type ShoppingListState = ReturnType<typeof useShoppingList>
export type { ShoppingEntry }
