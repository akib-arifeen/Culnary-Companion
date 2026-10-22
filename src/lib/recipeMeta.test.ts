import { describe, expect, it } from 'vitest'
import { shortServes, shortTime } from './recipeMeta'

describe('shortServes', () => {
  it.each([
    ['3 (12–14 pancakes)', '3'],
    ['6–8 as main course', '6–8'],
    ['10 (makes 56 cookies)', '10'],
    ['1–2', '1–2'],
    ['4', '4'],
    ['3-4 people', '3–4'],
    ['a few', null],
    [undefined, null],
  ])('%s -> %s', (input, out) => expect(shortServes(input)).toBe(out))
})

describe('shortTime', () => {
  it.each([
    ['15 minutes', '15 MIN'],
    ['2 hours', '2 HR'],
    ['Prep: 15 minutes, Cooking: ~65 minutes', '~1 HR 20 MIN'],
    ['Prep: 20 minutes, Cooking: 12 minutes, Total: 32 minutes', '32 MIN'],
    ['45-50 minutes', '50 MIN'],
    ['1 hour 30 minutes', '1 HR 30 MIN'],
    ['overnight', null],
    [undefined, null],
  ])('%s -> %s', (input, out) => expect(shortTime(input)).toBe(out))
})
