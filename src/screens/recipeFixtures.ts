import type { Recipe } from '../data/types'

/** Two small recipes in the final data shape, so content edits never break screen tests. */
const source = (page: string) => ({
  page,
  url: `https://en.wikibooks.org/wiki/${page}`,
  revisionUrl: 'https://en.wikibooks.org/w/index.php?oldid=111',
  license: 'CC BY-SA 4.0' as const,
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' as const,
  changes: 'adapted into step-by-step format',
  retrieved: '2026-10-22',
})

export const FULL: Recipe = {
  id: 'alpha-stew',
  title: 'Alpha Stew',
  summary: 'A slow stew of chickpeas and tomato.',
  servings: '4',
  time: '45 minutes',
  category: 'Main course',
  ingredients: [
    { name: 'Chickpeas', quantity: '400 g', note: 'drained' },
    { name: 'Salt', quantity: '' },
  ],
  steps: [
    { stepNumber: 1, instruction: 'Chop the onion.' },
    { stepNumber: 2, instruction: 'Simmer for 6 minutes.', duration: 6 },
    { stepNumber: 3, instruction: 'Serve hot.' },
  ],
  photo: {
    src: '/recipes/alpha.webp',
    width: 800,
    height: 600,
    alt: 'A bowl of chickpea stew',
    filePage: 'https://commons.wikimedia.org/wiki/File:Alpha.jpg',
    author: 'Ada Cook',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  source: source('Cookbook:Alpha_Stew'),
}

/** No time, servings or category stated by the source. */
export const BARE: Recipe = {
  id: 'beta-toast',
  title: 'Beta Toast',
  summary: 'Toast with butter.',
  ingredients: [{ name: 'Bread', quantity: '2 slices' }],
  steps: [
    { stepNumber: 1, instruction: 'Toast the bread.' },
    { stepNumber: 2, instruction: 'Butter it.' },
  ],
  photo: {
    src: '/recipes/beta.webp',
    width: 800,
    height: 600,
    alt: 'Buttered toast on a plate',
    filePage: 'https://commons.wikimedia.org/wiki/File:Beta.jpg',
    author: 'Ben Baker',
    license: 'Public domain',
  },
  source: source('Cookbook:Beta_Toast'),
}

export const fixtureModule = {
  recipes: [FULL, BARE],
  getRecipeById: (id: string) => [FULL, BARE].find((r) => r.id === id),
}
