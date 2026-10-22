import { describe, expect, it } from 'vitest'
import { ingredientsInStep } from './ingredientsInStep'

/** Written from the doc comment of ingredientsInStep.ts only. Returns the NAMES at the matching indices. */
const names = (list: readonly string[], step: string) => ingredientsInStep(list, step).map((i) => list[i])

const SOUP = ['Olive oil', 'Onion', 'Red lentils', 'Bay leaf', 'Water or stock', 'Garlic']

describe('ingredientsInStep: doc-comment examples', () => {
  it('lentils softening -> Red lentils only', () => {
    expect(
      names(SOUP, 'Simmer over low-medium heat for 20–30 minutes, until the lentils are softened.'),
    ).toEqual(['Red lentils'])
  })

  it('lentils, bay leaf and water -> Red lentils, Bay leaf, Water or stock', () => {
    expect(names(SOUP, 'Add the lentils, bay leaf and water to the pot.')).toEqual([
      'Red lentils',
      'Bay leaf',
      'Water or stock',
    ])
  })

  it('"heat the olive oil" -> Olive oil', () => {
    expect(names(SOUP, 'Heat the olive oil in a large pan over medium heat.')).toEqual(['Olive oil'])
  })

  it('"heat the oil" still matches Olive oil via its head noun', () => {
    expect(names(SOUP, 'Heat the oil in a pan.')).toEqual(['Olive oil'])
  })

  it('baking soda step matches Baking soda and Plain flour, not Baking powder', () => {
    expect(
      names(['Baking powder', 'Baking soda', 'Plain flour'], 'Whisk the baking soda into the flour.'),
    ).toEqual(['Baking soda', 'Plain flour'])
  })
})

describe('singularisation', () => {
  it('plural step word matches singular name and vice versa', () => {
    expect(ingredientsInStep(['Lentil'], 'Rinse the lentils.')).toEqual([0])
    expect(ingredientsInStep(['Lentils'], 'Rinse the lentil.')).toEqual([0])
    expect(ingredientsInStep(['Egg'], 'Beat the eggs.')).toEqual([0])
  })

  it('"oes" -> "o": tomatoes ~ tomato, in both directions', () => {
    expect(ingredientsInStep(['Tomato'], 'Chop the tomatoes.')).toEqual([0])
    expect(ingredientsInStep(['Tomatoes'], 'Chop the tomato.')).toEqual([0])
    expect(ingredientsInStep(['Potatoes'], 'Boil the potatoes.')).toEqual([0])
  })

  it('does not match different words that merely share a stem', () => {
    expect(ingredientsInStep(['Tomato'], 'Add the tomatillos.')).toEqual([])
  })
})

describe('alternatives', () => {
  it('" or " alternatives: any one matching is enough', () => {
    expect(ingredientsInStep(['Water or stock'], 'Pour in the stock.')).toEqual([0])
    expect(ingredientsInStep(['Water or stock'], 'Pour in the water.')).toEqual([0])
    expect(ingredientsInStep(['Water or stock'], 'Pour in the milk.')).toEqual([])
  })

  it('"/" alternatives: any one matching is enough', () => {
    expect(ingredientsInStep(['Butter/ghee'], 'Melt the ghee.')).toEqual([0])
    expect(ingredientsInStep(['Butter/ghee'], 'Melt the butter.')).toEqual([0])
    expect(ingredientsInStep(['Butter/ghee'], 'Melt the lard.')).toEqual([])
  })

  it('each alternative uses its own head noun', () => {
    expect(ingredientsInStep(['Olive oil or butter'], 'Heat the oil.')).toEqual([0])
    expect(ingredientsInStep(['Olive oil or butter'], 'Heat the olive.')).toEqual([])
  })

  it('a stop-word-only alternative does not stop the other alternative matching', () => {
    expect(ingredientsInStep(['Fresh or butter'], 'Melt the butter.')).toEqual([0])
  })
})

describe('head-noun rule', () => {
  it('the head noun is the LAST token: "Baking powder" needs "powder"', () => {
    expect(ingredientsInStep(['Baking powder'], 'Whisk the baking soda into the flour.')).toEqual([])
    expect(ingredientsInStep(['Baking powder'], 'Stir in the baking powder.')).toEqual([0])
    expect(ingredientsInStep(['Baking powder'], 'Stir in the powder.')).toEqual([0])
  })

  it('an earlier token alone is not enough: "Chicken stock" does not match "chicken"', () => {
    expect(ingredientsInStep(['Chicken stock'], 'Brown the chicken.')).toEqual([])
    expect(ingredientsInStep(['Chicken stock'], 'Add the stock.')).toEqual([0])
  })

  it('stop words are dropped before choosing the head noun', () => {
    expect(ingredientsInStep(['Basil, fresh'], 'Tear the basil.')).toEqual([0])
    expect(ingredientsInStep(['Fresh basil'], 'Tear the basil.')).toEqual([0])
    expect(ingredientsInStep(['Onion, chopped'], 'Add the onion.')).toEqual([0])
    expect(ingredientsInStep(['Dried oregano'], 'Add oregano.')).toEqual([0])
  })
})

describe('stop-word-only names never match', () => {
  it.each(['Fresh', 'Chopped', 'The', 'Some', 'Fresh or dried', 'A large', 'Medium small', 'Of and'])(
    '"%s"',
    (name) => {
      expect(ingredientsInStep([name], 'Add the fresh chopped large small medium dried some of a an and herbs.')).toEqual([])
    },
  )
})

describe('punctuation and case', () => {
  it('ignores punctuation around words', () => {
    expect(names(['Garlic', 'Onion'], 'Add (garlic), then "onion"; stir!')).toEqual(['Garlic', 'Onion'])
    expect(ingredientsInStep(['Salt'], 'Season with salt.')).toEqual([0])
  })

  it('is case-insensitive in both the name and the step', () => {
    expect(ingredientsInStep(['GARLIC'], 'add the garlic')).toEqual([0])
    expect(ingredientsInStep(['garlic'], 'ADD THE GARLIC')).toEqual([0])
    expect(ingredientsInStep(['Olive Oil'], 'Heat the OLIVE OIL.')).toEqual([0])
  })

  it('treats hyphens as word breaks in the step', () => {
    expect(ingredientsInStep(['Garlic'], 'Add the finely-chopped garlic-cloves.')).toEqual([0])
  })
})

describe('whole words only', () => {
  it('"oil" does not match boil, soil or oily', () => {
    expect(ingredientsInStep(['Oil'], 'Boil the water.')).toEqual([])
    expect(ingredientsInStep(['Oil'], 'Use soil-free vegetables.')).toEqual([])
    expect(ingredientsInStep(['Oil'], 'The skin is oily.')).toEqual([])
    expect(ingredientsInStep(['Oil'], 'Add oil, then boil.')).toEqual([0])
  })

  it('a short name does not match inside a longer word', () => {
    expect(ingredientsInStep(['Rice'], 'Add the licorice and price tags.')).toEqual([])
    expect(ingredientsInStep(['Egg'], 'Add the eggplant.')).toEqual([])
  })
})

describe('empty inputs and safety', () => {
  it('no ingredient names -> []', () => {
    expect(ingredientsInStep([], 'Add the garlic.')).toEqual([])
  })

  it('empty or whitespace-only instruction -> []', () => {
    expect(ingredientsInStep(['Garlic'], '')).toEqual([])
    expect(ingredientsInStep(['Garlic'], '   \n ')).toEqual([])
  })

  it('empty, whitespace or punctuation-only names never match and never throw', () => {
    expect(ingredientsInStep(['', '   ', '-', ' or ', '/'], 'Add the garlic or oil / salt.')).toEqual([])
  })
})

describe('index order', () => {
  it('returns indices in ingredient order, not step order', () => {
    const list = ['Salt', 'Garlic', 'Onion']
    expect(ingredientsInStep(list, 'Add the onion, then the garlic, then the salt.')).toEqual([0, 1, 2])
  })

  it('returns indices (not names) and skips non-matching entries', () => {
    expect(ingredientsInStep(['Flour', 'Sugar', 'Butter', 'Eggs'], 'Cream the butter and the eggs.')).toEqual([2, 3])
  })

  it('duplicate names each match, at their own index', () => {
    expect(ingredientsInStep(['Salt', 'Pepper', 'Salt'], 'Add salt.')).toEqual([0, 2])
  })
})
