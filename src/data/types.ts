/**
 * Recipe data contract (DESIGN.md § Content rules). Every field shown on screen is either
 * stated by the source or computed from the data. There is deliberately no "difficulty",
 * rating or invented total time.
 */

export interface Ingredient {
  /** Short, distinct, matchable name ("Chickpeas", "Garlic"). Voice matching uses this. */
  name: string
  /** Quantity exactly as the source states it, normalised for display ("2 cups", "1/2 tsp", "400 g"). Empty when the source gives none ("Salt, to taste" -> quantity ""). */
  quantity: string
  /** Optional preparation note from the source ("finely chopped", "to taste"). */
  note?: string
}

export interface CookingStep {
  stepNumber: number
  /** One instruction, one or two sentences, adapted from the source. */
  instruction: string
  /** Minutes, ONLY when the step text itself states a duration (e.g. "simmer for 20 minutes" -> 20). */
  duration?: number
}

export interface RecipeSource {
  /** Wikibooks page title, e.g. "Cookbook:Shakshouka". */
  page: string
  /** Canonical page URL. */
  url: string
  /** Permanent link to the exact revision adapted, e.g. https://en.wikibooks.org/w/index.php?oldid=123 */
  revisionUrl: string
  license: 'CC BY-SA 4.0'
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
  /** Required by CC BY-SA: what we changed. */
  changes: string
  /** YYYY-MM-DD the source was fetched. */
  retrieved: string
}

export interface PhotoCredit {
  /** Public path of the self-hosted image, e.g. "/recipes/shakshouka.webp". */
  src: string
  width: number
  height: number
  /** Describes what is actually in the photo. */
  alt: string
  /** Commons file page URL. */
  filePage: string
  /** Creator's name as the file page credits them (plain text, markup stripped). */
  author: string
  /** Short licence name as stated on Commons, e.g. "CC BY-SA 4.0", "CC BY 2.0", "Public domain". */
  license: string
  /** Licence URL when one exists. */
  licenseUrl?: string
}

export interface Recipe {
  /** URL slug, e.g. "shakshouka". */
  id: string
  title: string
  /** One or two plain sentences adapted from the source's introduction. */
  summary: string
  /** As the source states it ("4", "4–6", "12 pancakes"). Omitted when not stated. */
  servings?: string
  /** As the source states it ("45 minutes", "1 hour"). Omitted when not stated. */
  time?: string
  /** Source category, e.g. "Main course", "Breakfast". Omitted when not stated. */
  category?: string
  ingredients: Ingredient[]
  steps: CookingStep[]
  photo: PhotoCredit
  source: RecipeSource
}
