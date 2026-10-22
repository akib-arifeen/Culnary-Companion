/**
 * Which ingredients does a step use? Drives the "THIS STEP" highlight in cooking mode.
 *
 * Rule (whole words, case-insensitive, punctuation ignored; tokens longer than 3 characters ending
 * in "s" are singularised, "oes" -> "o", so "lentils" ~ "lentil", "tomatoes" ~ "tomato"):
 *  - An ingredient name may list alternatives separated by " or " or "/" ("Water or stock",
 *    "Butter/ghee"). The ingredient is used when ANY alternative matches.
 *  - An alternative matches when its HEAD NOUN (its last token after dropping the stop words
 *    "the, a, an, of, and, some, fresh, dried, large, small, medium, chopped") appears in the
 *    step's tokens. So "Red lentils" matches "simmer until the lentils soften", and "Olive oil" matches
 *    "heat the oil", while "Baking powder" does NOT match a step that only says "baking soda".
 *  - An alternative whose tokens are all stop words never matches.
 * Returns the indices of matching ingredients, in ingredient order. Never throws; empty inputs -> [].
 *
 * Examples (instruction -> matching names):
 *  "Simmer over low-medium heat for 20–30 minutes, until the lentils are softened." -> ["Red lentils"]
 *  "Add the lentils, bay leaf and water to the pot." -> ["Red lentils", "Bay leaf", "Water or stock"]
 *  "Heat the olive oil in a large pan over medium heat." -> ["Olive oil"]
 *  "Whisk the baking soda into the flour." with ["Baking powder", "Baking soda", "Plain flour"] -> ["Baking soda", "Plain flour"]
 */
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'some', 'fresh', 'dried', 'large', 'small', 'medium', 'chopped'])

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((t) => (t.length > 3 && t.endsWith('s') ? (t.endsWith('oes') ? t.slice(0, -2) : t.slice(0, -1)) : t))
}

export function ingredientsInStep(ingredientNames: readonly string[], instruction: string): number[] {
  const words = new Set(tokens(instruction ?? ''))
  const out: number[] = []
  ;(ingredientNames ?? []).forEach((name, index) => {
    const used = String(name ?? '')
      .split(/\s+or\s+|\//i)
      .some((alt) => {
        const head = tokens(alt).filter((t) => !STOP.has(t)).pop()
        return head !== undefined && words.has(head)
      })
    if (used) out.push(index)
  })
  return out
}
