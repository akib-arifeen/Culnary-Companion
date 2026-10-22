import { describe, it, expect } from 'vitest'
import { initCookingState, cookingReducer, type CookingState } from './cookingSession'

const init = (o: Partial<{ stepCount: number; ingredientCount: number; startStep: number }> = {}) =>
  initCookingState({ stepCount: 5, ingredientCount: 4, ...o })

describe('initCookingState', () => {
  it('starts on step 0, steps tab, nothing checked, not finished', () => {
    const s = init()
    expect(s.stepCount).toBe(5)
    expect(s.ingredientCount).toBe(4)
    expect(s.stepIndex).toBe(0)
    expect(s.tab).toBe('steps')
    expect(s.checked.size).toBe(0)
    expect(s.finished).toBe(false)
  })

  it.each([
    [2, 2],
    [4, 4],
    [5, 4],
    [99, 4],
    [-1, 0],
    [-50, 0],
  ])('startStep %i is clamped to %i', (startStep, expected) => {
    expect(init({ startStep }).stepIndex).toBe(expected)
  })

  it('single-step recipe stays on 0', () => {
    expect(init({ stepCount: 1, startStep: 7 }).stepIndex).toBe(0)
  })
})

describe('cookingReducer: next', () => {
  it('advances', () => {
    expect(cookingReducer(init(), { type: 'next' }).stepIndex).toBe(1)
  })

  it('switches back to the steps tab', () => {
    const s = cookingReducer(init(), { type: 'showTab', tab: 'ingredients' })
    const n = cookingReducer(s, { type: 'next' })
    expect(n.tab).toBe('steps')
    expect(n.stepIndex).toBe(1)
  })

  it('on the last step finishes without moving', () => {
    const s = cookingReducer(init({ startStep: 4 }), { type: 'next' })
    expect(s.finished).toBe(true)
    expect(s.stepIndex).toBe(4)
    expect(s.tab).toBe('steps')
  })

  it('does not finish before the last step', () => {
    expect(cookingReducer(init({ startStep: 3 }), { type: 'next' }).finished).toBe(false)
  })

  it('on the last step from another tab also returns to steps', () => {
    const s = cookingReducer(init({ startStep: 4 }), { type: 'showTab', tab: 'timers' })
    const n = cookingReducer(s, { type: 'next' })
    expect(n.finished).toBe(true)
    expect(n.tab).toBe('steps')
  })
})

describe('cookingReducer: previous', () => {
  it('goes back one step', () => {
    expect(cookingReducer(init({ startStep: 3 }), { type: 'previous' }).stepIndex).toBe(2)
  })

  it('switches to the steps tab', () => {
    const s = cookingReducer(init({ startStep: 3 }), { type: 'showTab', tab: 'ingredients' })
    const p = cookingReducer(s, { type: 'previous' })
    expect(p.stepIndex).toBe(2)
    expect(p.tab).toBe('steps')
  })

  it('at step 0 on the steps tab returns the same object', () => {
    const s = init()
    expect(cookingReducer(s, { type: 'previous' })).toBe(s)
  })

  it('at step 0 on another tab only switches the tab', () => {
    const s = cookingReducer(init(), { type: 'showTab', tab: 'ingredients' })
    const p = cookingReducer(s, { type: 'previous' })
    expect(p.stepIndex).toBe(0)
    expect(p.tab).toBe('steps')
  })
})

describe('cookingReducer: previous from the completion dialog', () => {
  it('only clears finished and stays on the last step', () => {
    const fin = cookingReducer(init({ startStep: 4 }), { type: 'next' })
    expect(fin.finished).toBe(true)
    const p = cookingReducer(fin, { type: 'previous' })
    expect(p.finished).toBe(false)
    expect(p.stepIndex).toBe(4)
    expect(p.tab).toBe('steps')
  })

  it('a second previous then moves back a step', () => {
    const fin = cookingReducer(init({ startStep: 4 }), { type: 'next' })
    const p2 = cookingReducer(cookingReducer(fin, { type: 'previous' }), { type: 'previous' })
    expect(p2.stepIndex).toBe(3)
  })

  it('at step 0, steps tab, finished (single-step recipe) it is not a no-op', () => {
    const fin = cookingReducer(init({ stepCount: 1 }), { type: 'next' })
    expect(fin.finished).toBe(true)
    const p = cookingReducer(fin, { type: 'previous' })
    expect(p.finished).toBe(false)
    expect(p.stepIndex).toBe(0)
  })
})

describe('cookingReducer: goToStep', () => {
  it.each([0, 2, 4])('valid index %i', (index) => {
    const s = cookingReducer(init(), { type: 'goToStep', index })
    expect(s.stepIndex).toBe(index)
  })

  it('sets tab to steps and clears finished', () => {
    let s = init({ startStep: 4 })
    s = cookingReducer(s, { type: 'next' })
    s = cookingReducer(s, { type: 'showTab', tab: 'timers' })
    expect(s.finished).toBe(true)
    const g = cookingReducer(s, { type: 'goToStep', index: 1 })
    expect(g.tab).toBe('steps')
    expect(g.finished).toBe(false)
    expect(g.stepIndex).toBe(1)
  })

  it.each([-1, 5, 100, 1.5, Number.NaN])('invalid index %s returns the same object', (index) => {
    const s = init({ startStep: 2 })
    expect(cookingReducer(s, { type: 'goToStep', index })).toBe(s)
  })
})

describe('cookingReducer: tabs', () => {
  it('showTab sets the tab', () => {
    expect(cookingReducer(init(), { type: 'showTab', tab: 'timers' }).tab).toBe('timers')
  })

  it('showTab with the current tab returns the same object', () => {
    const s = init()
    expect(cookingReducer(s, { type: 'showTab', tab: 'steps' })).toBe(s)
  })

  it('toggleIngredients: steps -> ingredients -> steps', () => {
    const a = cookingReducer(init(), { type: 'toggleIngredients' })
    expect(a.tab).toBe('ingredients')
    expect(cookingReducer(a, { type: 'toggleIngredients' }).tab).toBe('steps')
  })

  it('toggleIngredients from timers goes to ingredients', () => {
    const s = cookingReducer(init(), { type: 'showTab', tab: 'timers' })
    expect(cookingReducer(s, { type: 'toggleIngredients' }).tab).toBe('ingredients')
  })
})

describe('cookingReducer: ingredients', () => {
  it('setIngredient with checked omitted toggles', () => {
    const a = cookingReducer(init(), { type: 'setIngredient', index: 1 })
    expect([...a.checked]).toEqual([1])
    const b = cookingReducer(a, { type: 'setIngredient', index: 1 })
    expect(b.checked.size).toBe(0)
  })

  it('setIngredient with explicit checked', () => {
    const a = cookingReducer(init(), { type: 'setIngredient', index: 2, checked: true })
    expect(a.checked.has(2)).toBe(true)
    const b = cookingReducer(a, { type: 'setIngredient', index: 2, checked: true })
    expect(b.checked.has(2)).toBe(true)
    const c = cookingReducer(b, { type: 'setIngredient', index: 2, checked: false })
    expect(c.checked.has(2)).toBe(false)
    const d = cookingReducer(c, { type: 'setIngredient', index: 3, checked: false })
    expect(d.checked.size).toBe(0)
  })

  it.each([-1, 4, 10])('setIngredient out of range (%i) returns the same object', (index) => {
    const s = init()
    expect(cookingReducer(s, { type: 'setIngredient', index })).toBe(s)
    expect(cookingReducer(s, { type: 'setIngredient', index, checked: true })).toBe(s)
  })

  it('checkAll true checks 0..ingredientCount-1; false clears', () => {
    const all = cookingReducer(init(), { type: 'checkAll', checked: true })
    expect([...all.checked].sort()).toEqual([0, 1, 2, 3])
    const none = cookingReducer(all, { type: 'checkAll', checked: false })
    expect(none.checked.size).toBe(0)
  })

  it('checkAll that changes nothing returns the same object', () => {
    const none = init()
    expect(cookingReducer(none, { type: 'checkAll', checked: false })).toBe(none)
    const all = cookingReducer(none, { type: 'checkAll', checked: true })
    expect(cookingReducer(all, { type: 'checkAll', checked: true })).toBe(all)
  })

  it('checkAll that changes something returns a new object', () => {
    const one = cookingReducer(init(), { type: 'setIngredient', index: 0, checked: true })
    expect(cookingReducer(one, { type: 'checkAll', checked: true })).not.toBe(one)
    expect(cookingReducer(one, { type: 'checkAll', checked: false })).not.toBe(one)
  })

  it('never mutates the previous checked Set', () => {
    const s0 = init()
    const s1 = cookingReducer(s0, { type: 'setIngredient', index: 0, checked: true })
    expect(s0.checked.size).toBe(0)
    expect(s1.checked).not.toBe(s0.checked)

    const s2 = cookingReducer(s1, { type: 'setIngredient', index: 1, checked: true })
    expect([...s1.checked]).toEqual([0])
    expect(s2.checked).not.toBe(s1.checked)

    const s3 = cookingReducer(s2, { type: 'checkAll', checked: true })
    expect(s2.checked.size).toBe(2)
    expect(s3.checked).not.toBe(s2.checked)

    const s4 = cookingReducer(s3, { type: 'checkAll', checked: false })
    expect(s3.checked.size).toBe(4)
    expect(s4.checked).not.toBe(s3.checked)

    const s5 = cookingReducer(s3, { type: 'setIngredient', index: 3 })
    expect(s3.checked.has(3)).toBe(true)
    expect(s5.checked.has(3)).toBe(false)
  })

  it('does not touch step or tab', () => {
    const s = cookingReducer(init({ startStep: 3 }), { type: 'showTab', tab: 'ingredients' })
    const c = cookingReducer(s, { type: 'checkAll', checked: true })
    expect(c.stepIndex).toBe(3)
    expect(c.tab).toBe('ingredients')
  })
})

describe('cookingReducer: resume', () => {
  it('clears finished', () => {
    const fin = cookingReducer(init({ startStep: 4 }), { type: 'next' })
    expect(fin.finished).toBe(true)
    const r = cookingReducer(fin, { type: 'resume' })
    expect(r.finished).toBe(false)
    expect(r.stepIndex).toBe(4)
  })

  it('when not finished returns the same object', () => {
    const s = init()
    expect(cookingReducer(s, { type: 'resume' })).toBe(s)
  })
})

describe('cookingReducer: purity', () => {
  it('never mutates the input state', () => {
    const s: CookingState = init({ startStep: 2 })
    const snapshot = JSON.stringify({ ...s, checked: [...s.checked] })
    for (const action of [
      { type: 'next' },
      { type: 'previous' },
      { type: 'goToStep', index: 0 },
      { type: 'showTab', tab: 'timers' },
      { type: 'toggleIngredients' },
      { type: 'setIngredient', index: 0 },
      { type: 'checkAll', checked: true },
      { type: 'resume' },
    ] as const) {
      cookingReducer(s, action)
    }
    expect(JSON.stringify({ ...s, checked: [...s.checked] })).toBe(snapshot)
  })
})
