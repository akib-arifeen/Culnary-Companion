import { describe, expect, it } from 'vitest'
import { BARE, FULL } from '../screens/recipeFixtures'
import {
  addAllIngredients,
  cleanShoppingList,
  countForRecipe,
  groupShoppingList,
  removeCheckedItems,
  removeShoppingItem,
  restoreShoppingItems,
  setShoppingChecked,
  shoppingKey,
  shoppingListText,
  type ShoppingEntry,
} from './shoppingList'

const findRecipe = (id: string) => [FULL, BARE].find((recipe) => recipe.id === id)
const entry = (recipeId: string, index: number, checked = false): ShoppingEntry => ({ recipeId, index, checked })

describe('cleanShoppingList', () => {
  it('keeps valid entries and drops anything malformed or stale', () => {
    const raw = [
      entry('alpha-stew', 0, true),
      entry('alpha-stew', 0, false), // duplicate
      entry('alpha-stew', 9), // index past the end
      entry('gone', 0), // recipe no longer exists
      { recipeId: 'alpha-stew', index: 1, checked: 'yes' }, // wrong type
      { recipeId: 'alpha-stew', index: 1.5, checked: false },
      null,
      'nope',
    ]
    expect(cleanShoppingList(raw, findRecipe)).toEqual([entry('alpha-stew', 0, true)])
  })

  it('returns an empty list for anything that is not an array', () => {
    expect(cleanShoppingList(null, findRecipe)).toEqual([])
    expect(cleanShoppingList({ items: [] }, findRecipe)).toEqual([])
  })
})

describe('addAllIngredients', () => {
  it('adds every ingredient unchecked, in ingredient order', () => {
    expect(addAllIngredients([], 'alpha-stew', 2)).toEqual([entry('alpha-stew', 0), entry('alpha-stew', 1)])
  })

  it('keeps ticks already on the list and returns the same array when nothing is missing', () => {
    const list = [entry('alpha-stew', 0, true)]
    const next = addAllIngredients(list, 'alpha-stew', 2)
    expect(next).toEqual([entry('alpha-stew', 0, true), entry('alpha-stew', 1)])
    expect(addAllIngredients(next, 'alpha-stew', 2)).toBe(next)
  })

  it('does not touch another recipe on the list', () => {
    const list = [entry('beta-toast', 0, true)]
    expect(addAllIngredients(list, 'alpha-stew', 1)).toEqual([entry('beta-toast', 0, true), entry('alpha-stew', 0)])
  })
})

describe('setShoppingChecked', () => {
  it('sets only the matching entry', () => {
    const list = [entry('alpha-stew', 0), entry('alpha-stew', 1), entry('beta-toast', 0)]
    const next = setShoppingChecked(list, 'alpha-stew', 1, true)
    expect(next).toEqual([entry('alpha-stew', 0), entry('alpha-stew', 1, true), entry('beta-toast', 0)])
    expect(list[1].checked).toBe(false)
  })

  it('ignores an entry that is not on the list and an unchanged value', () => {
    const list = [entry('alpha-stew', 0)]
    expect(setShoppingChecked(list, 'alpha-stew', 1, true)).toBe(list)
    expect(setShoppingChecked(list, 'alpha-stew', 0, false)).toBe(list)
  })
})

describe('removeShoppingItem / removeCheckedItems', () => {
  it('removes one entry and leaves the rest', () => {
    const list = [entry('alpha-stew', 0), entry('alpha-stew', 1), entry('beta-toast', 0)]
    expect(removeShoppingItem(list, 'alpha-stew', 0)).toEqual([entry('alpha-stew', 1), entry('beta-toast', 0)])
    expect(removeShoppingItem(list, 'alpha-stew', 9)).toBe(list)
  })

  it('removes checked entries from every recipe', () => {
    const list = [entry('alpha-stew', 0, true), entry('alpha-stew', 1), entry('beta-toast', 0, true)]
    expect(removeCheckedItems(list)).toEqual([entry('alpha-stew', 1)])
    const none = [entry('alpha-stew', 0)]
    expect(removeCheckedItems(none)).toBe(none)
  })
})

describe('restoreShoppingItems', () => {
  const key = (e: ShoppingEntry) => shoppingKey(e.recipeId, e.index)

  it('puts one removed entry back in its original position, with its tick', () => {
    const snapshot = [entry('alpha-stew', 0, true), entry('alpha-stew', 1), entry('beta-toast', 0)]
    const afterRemoval = removeShoppingItem(snapshot, 'alpha-stew', 0)
    expect(restoreShoppingItems(afterRemoval, snapshot, new Set([key(snapshot[0])]))).toEqual(snapshot)
  })

  it('puts every checked entry back in place after a bulk removal', () => {
    const snapshot = [entry('alpha-stew', 0, true), entry('alpha-stew', 1), entry('beta-toast', 0, true)]
    const afterRemoval = removeCheckedItems(snapshot)
    expect(restoreShoppingItems(afterRemoval, snapshot, new Set([key(snapshot[0]), key(snapshot[2])]))).toEqual(snapshot)
  })

  it('keeps entries added and ticks changed after the removal', () => {
    const snapshot = [entry('alpha-stew', 0), entry('alpha-stew', 1)]
    const afterRemoval = [entry('alpha-stew', 1, true), entry('beta-toast', 0)]
    expect(restoreShoppingItems(afterRemoval, snapshot, new Set([key(snapshot[0])]))).toEqual([
      entry('alpha-stew', 0),
      entry('alpha-stew', 1, true),
      entry('beta-toast', 0),
    ])
  })

  it('is a no-op when nothing to restore is missing', () => {
    const list = [entry('alpha-stew', 0)]
    expect(restoreShoppingItems(list, list, new Set([key(list[0])]))).toBe(list)
    expect(restoreShoppingItems(list, list, new Set())).toBe(list)
  })
})

describe('countForRecipe', () => {
  it('counts only that recipe’s entries, checked or not', () => {
    const list = [entry('alpha-stew', 0, true), entry('alpha-stew', 1), entry('beta-toast', 0)]
    expect(countForRecipe(list, 'alpha-stew')).toBe(2)
    expect(countForRecipe(list, 'beta-toast')).toBe(1)
    expect(countForRecipe([], 'alpha-stew')).toBe(0)
  })
})

describe('groupShoppingList', () => {
  it('groups in first-added recipe order and sorts each group by ingredient order', () => {
    const list = [entry('beta-toast', 0), entry('alpha-stew', 1, true), entry('alpha-stew', 0)]
    const groups = groupShoppingList(list, findRecipe)
    expect(groups.map((group) => group.recipe.id)).toEqual(['beta-toast', 'alpha-stew'])
    expect(groups[1].entries.map((item) => item.index)).toEqual([0, 1])
  })

  it('drops a group whose recipe is gone', () => {
    expect(groupShoppingList([entry('gone', 0), entry('beta-toast', 0)], findRecipe).map((g) => g.recipe.id)).toEqual([
      'beta-toast',
    ])
  })
})

describe('shoppingListText', () => {
  it('copies names, quantities and notes exactly, with the source credit', () => {
    const list = [entry('alpha-stew', 0), entry('alpha-stew', 1, true), entry('beta-toast', 0)]
    expect(shoppingListText(list, findRecipe)).toBe(
      [
        'SHOPPING LIST',
        'Alpha Stew\n[ ] 400 g Chickpeas (drained)\n[x] Salt\nSource: Cookbook:Alpha_Stew — https://en.wikibooks.org/wiki/Cookbook:Alpha_Stew (revision: https://en.wikibooks.org/w/index.php?oldid=111) · CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/) · Changes: adapted into step-by-step format',
        'Beta Toast\n[ ] 2 slices Bread\nSource: Cookbook:Beta_Toast — https://en.wikibooks.org/wiki/Cookbook:Beta_Toast (revision: https://en.wikibooks.org/w/index.php?oldid=111) · CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/) · Changes: adapted into step-by-step format',
        'Recipes adapted from the Wikibooks Cookbook (https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents), CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).',
      ].join('\n\n'),
    )
  })

  it('attributes each recipe to its own source, revision, licence and changes', () => {
    const text = shoppingListText([entry('alpha-stew', 0), entry('beta-toast', 0)], findRecipe)
    const [alpha, beta] = text.split('\n\n').slice(1, 3)
    for (const [block, recipe] of [
      [alpha, FULL],
      [beta, BARE],
    ] as const) {
      expect(block).toContain(recipe.source.page)
      expect(block).toContain(`Source: ${recipe.source.page} — ${recipe.source.url}`)
      expect(block).toContain(`revision: ${recipe.source.revisionUrl}`)
      expect(block).toContain(`${recipe.source.license} (${recipe.source.licenseUrl})`)
      expect(block).toContain(`Changes: ${recipe.source.changes}`)
    }
    // Each group names only its own page, not the other one.
    expect(alpha).toContain(FULL.source.url)
    expect(alpha).not.toContain(BARE.source.url)
    expect(beta).toContain(BARE.source.url)
    expect(beta).not.toContain(FULL.source.url)
  })

  it('is empty when there is nothing to copy', () => {
    expect(shoppingListText([], findRecipe)).toBe('')
  })

  it('builds stable row keys', () => {
    expect(shoppingKey('alpha-stew', 1)).toBe('alpha-stew:1')
  })
})
