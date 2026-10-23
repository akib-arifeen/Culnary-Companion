/** Short, one-line forms of source-stated servings and time for ticket header strips. Pure; the full strings stay in the body. */

/** Leading number or range of a servings string ("3 (12–14 pancakes)" -> "3"); null when it doesn't start with one. */
export function shortServes(servings?: string): string | null {
  const m = servings?.trim().match(/^(\d+(?:\s*[–-]\s*\d+)?)/)
  return m ? m[1].replace(/\s*[–-]\s*/, '–') : null
}

const AMOUNT = /(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|h|minutes?|mins?)\b/gi

function minutesIn(text: string): number | null {
  let total = 0
  let found = false
  for (const m of text.matchAll(AMOUNT)) {
    const n = parseFloat((m[2] ?? m[1]).replace(',', '.')) // upper bound of a range
    total += /^h/i.test(m[3]) ? n * 60 : n
    found = true
  }
  return found ? Math.round(total) : null
}

/** "32 MIN", "2 HR", "1 HR 20 MIN", "~1 HR 20 MIN"; a stated total wins, otherwise stated amounts are summed. */
export function shortTime(time?: string): string | null {
  if (!time) return null
  const totalAt = time.search(/total\s*:?/i)
  const minutes =
    (totalAt >= 0 ? minutesIn(time.slice(totalAt).replace(/^total\s*:?/i, '')) : null) ?? minutesIn(time)
  if (minutes === null) return null
  const approx = /~|about|approx/i.test(time) ? '~' : ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const body = h === 0 ? `${m} MIN` : m === 0 ? `${h} HR` : `${h} HR ${m} MIN`
  return approx + body
}

/** Parenthetical addendum in a servings string ("10 (makes 56 cookies)" -> "Makes 56 cookies"). */
function servingAddendum(servings?: string): string | null {
  const inner = servings?.match(/\(([^)]+)\)/)?.[1]?.trim()
  if (!inner) return null
  return inner.charAt(0).toUpperCase() + inner.slice(1)
}

/**
 * Source-stated facts the header strip does NOT already show. The strip carries one total time, the
 * leading servings number and the step count, so repeating those in the body would read as a template.
 * What is left is genuinely additive: the split prep/cook times, and a servings addendum.
 */
export function extraFacts(recipe: { servings?: string; time?: string }): string[] {
  const facts: string[] = []
  const addendum = servingAddendum(recipe.servings)
  if (addendum) facts.push(addendum)
  if (recipe.time && /prep|cook|total/i.test(recipe.time)) {
    for (const part of recipe.time.split(',')) {
      const text = part.trim().replace(/:\s*/, ' ')
      if (text && !/^total\b/i.test(text)) facts.push(text)
    }
  }
  return facts
}

/** Computed counts for the recipe body: an at-a-glance line that is never a duplicate of the strip. */
export function bodyCounts(recipe: { ingredients: readonly unknown[]; steps: readonly { duration?: number }[] }): string {
  const ingredients = `${recipe.ingredients.length} ${recipe.ingredients.length === 1 ? 'ingredient' : 'ingredients'}`
  const timed = recipe.steps.filter((step) => step.duration !== undefined).length
  if (timed === 0) return ingredients
  return `${ingredients} · ${timed} timed ${timed === 1 ? 'step' : 'steps'}`
}
