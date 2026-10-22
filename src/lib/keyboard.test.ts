import { describe, it, expect } from 'vitest'
import { keyToCommand, KEY_GUIDE } from './keyboard'
import type { Command } from './commands'

const MAP: Array<[string, Command]> = [
  ['ArrowRight', { type: 'next' }],
  ['n', { type: 'next' }],
  ['j', { type: 'next' }],
  ['ArrowLeft', { type: 'previous' }],
  ['p', { type: 'previous' }],
  ['b', { type: 'previous' }],
  ['k', { type: 'previous' }],
  ['r', { type: 'repeat' }],
  ['i', { type: 'toggleIngredients' }],
  ['s', { type: 'showTab', tab: 'steps' }],
  ['t', { type: 'startTimer' }],
  ['f', { type: 'toggleTimer' }],
  ['Escape', { type: 'stopSpeaking' }],
  ['?', { type: 'help' }],
  ['h', { type: 'help' }],
]

describe('keyToCommand', () => {
  it.each(MAP)('%s maps to its command', (key, command) => {
    expect(keyToCommand({ key })).toEqual(command)
  })

  it.each(MAP.filter(([k]) => k.length === 1 && k !== '?'))('letter %s is case-insensitive', (key, command) => {
    expect(keyToCommand({ key: key.toUpperCase() })).toEqual(command)
  })

  it('an explicit null/undefined target is fine', () => {
    expect(keyToCommand({ key: 'n', target: null })).toEqual({ type: 'next' })
    expect(keyToCommand({ key: 'n', target: undefined })).toEqual({ type: 'next' })
  })

  it('a button target still maps (only typing targets are ignored)', () => {
    expect(keyToCommand({ key: 'n', target: document.createElement('button') })).toEqual({ type: 'next' })
  })

  it.each(['ctrlKey', 'metaKey', 'altKey'] as const)('%s held -> null', (mod) => {
    for (const [key] of MAP) {
      expect(keyToCommand({ key, [mod]: true })).toBeNull()
    }
  })

  it('modifier flags explicitly false do not block', () => {
    expect(keyToCommand({ key: 'n', ctrlKey: false, metaKey: false, altKey: false })).toEqual({ type: 'next' })
  })

  it.each(['input', 'textarea', 'select'])('<%s> target -> null', (tag) => {
    const el = document.createElement(tag)
    for (const [key] of MAP) {
      expect(keyToCommand({ key, target: el })).toBeNull()
    }
  })

  it('contentEditable target -> null', () => {
    const el = document.createElement('div')
    el.setAttribute('contenteditable', 'true')
    // jsdom does not implement isContentEditable; define it like a browser would.
    Object.defineProperty(el, 'isContentEditable', { value: true })
    expect(keyToCommand({ key: 'n', target: el })).toBeNull()
    expect(keyToCommand({ key: 'Escape', target: el })).toBeNull()
  })

  it.each([' ', 'Enter', 'x', 'a', 'Tab', 'Shift', '1', 'ArrowUp', 'ArrowDown', ''])('unmapped key %j -> null', (key) => {
    expect(keyToCommand({ key })).toBeNull()
  })
})

describe('KEY_GUIDE', () => {
  const guideFor = (re: RegExp) => KEY_GUIDE.filter((g) => re.test(g.action))

  it('has an entry for each command family', () => {
    for (const re of [/next/i, /prev/i, /again|repeat|read/i, /ingredient/i, /timer/i, /stop|talk|quiet/i, /help/i]) {
      expect(guideFor(re).length, String(re)).toBeGreaterThan(0)
    }
  })

  it('every entry lists keys and an action', () => {
    for (const g of KEY_GUIDE) {
      expect(g.keys.length).toBeGreaterThan(0)
      expect(g.action.length).toBeGreaterThan(0)
    }
  })

  it('every advertised key is actually bound', () => {
    const toEventKey: Record<string, string> = { '→': 'ArrowRight', '←': 'ArrowLeft', Esc: 'Escape' }
    for (const g of KEY_GUIDE) {
      for (const k of g.keys) {
        expect(keyToCommand({ key: toEventKey[k] ?? k.toLowerCase() }), `${k} (${g.action})`).not.toBeNull()
      }
    }
  })
})
