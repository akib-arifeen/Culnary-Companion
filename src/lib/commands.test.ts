import { describe, it, expect } from 'vitest'
import { describeCommand, type Command } from './commands'

// Record keyed by every Command type: adding a variant without a sample here fails tsc.
const SAMPLES: Record<Command['type'], Command[]> = {
  next: [{ type: 'next' }],
  previous: [{ type: 'previous' }],
  repeat: [{ type: 'repeat' }],
  goToStep: [{ type: 'goToStep', step: 3 }],
  showTab: [
    { type: 'showTab', tab: 'steps' },
    { type: 'showTab', tab: 'ingredients' },
    { type: 'showTab', tab: 'timers' },
  ],
  toggleIngredients: [{ type: 'toggleIngredients' }],
  startTimer: [{ type: 'startTimer' }, { type: 'startTimer', minutes: 7 }],
  pauseTimer: [{ type: 'pauseTimer' }],
  resumeTimer: [{ type: 'resumeTimer' }],
  toggleTimer: [{ type: 'toggleTimer' }],
  resetTimer: [{ type: 'resetTimer' }],
  cancelTimer: [{ type: 'cancelTimer' }],
  checkIngredient: [
    { type: 'checkIngredient', query: 'garlic' },
    { type: 'checkIngredient', query: 'garlic', checked: true },
    { type: 'checkIngredient', query: 'garlic', checked: false },
  ],
  checkAll: [
    { type: 'checkAll', checked: true },
    { type: 'checkAll', checked: false },
  ],
  stopSpeaking: [{ type: 'stopSpeaking' }],
  help: [{ type: 'help' }],
}

describe('describeCommand', () => {
  const all = Object.values(SAMPLES).flat()

  it.each(all.map((c) => [JSON.stringify(c), c] as const))('returns a non-empty label for %s', (_name, command) => {
    const label = describeCommand(command)
    expect(typeof label).toBe('string')
    expect(label.trim().length).toBeGreaterThan(0)
  })

  it('gives distinct labels to the three tabs', () => {
    const labels = (['steps', 'ingredients', 'timers'] as const).map((tab) => describeCommand({ type: 'showTab', tab }))
    expect(new Set(labels).size).toBe(3)
  })

  it('matches the examples in the doc comment', () => {
    expect(describeCommand({ type: 'next' })).toBe('Next step')
    expect(describeCommand({ type: 'startTimer', minutes: 7 })).toBe('Timer: 7 min')
    expect(describeCommand({ type: 'showTab', tab: 'ingredients' })).toBe('Show ingredients')
    expect(describeCommand({ type: 'checkIngredient', query: 'garlic', checked: true })).toBe('Check: garlic')
    expect(describeCommand({ type: 'checkAll', checked: false })).toBe('Uncheck all')
  })

  it('distinguishes check from uncheck and mentions the query', () => {
    const on = describeCommand({ type: 'checkIngredient', query: 'basil', checked: false })
    expect(on).toContain('basil')
    expect(on).not.toBe(describeCommand({ type: 'checkIngredient', query: 'basil', checked: true }))
    expect(describeCommand({ type: 'checkAll', checked: true })).not.toBe(describeCommand({ type: 'checkAll', checked: false }))
  })

  it('mentions the step number for goToStep', () => {
    expect(describeCommand({ type: 'goToStep', step: 4 })).toContain('4')
  })
})
