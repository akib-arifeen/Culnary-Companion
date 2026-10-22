import type { Command } from './commands'

export interface KeyLike {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  /** The event target; typing targets are ignored. */
  target?: EventTarget | null
}

/**
 * Cooking-mode shortcuts. Returns null (let the browser handle it) when:
 *  - ctrl / meta / alt is held,
 *  - the target is an <input>, <textarea>, <select> or contentEditable element,
 *  - the key is unmapped.
 * Space and Enter are deliberately NOT mapped: they activate the focused button.
 * Letter keys are case-insensitive.
 *
 *   ArrowRight, n, j      -> next
 *   ArrowLeft, p, b, k    -> previous
 *   r                     -> repeat
 *   i                     -> toggleIngredients
 *   s                     -> showTab steps
 *   t                     -> startTimer {}
 *   f                     -> toggleTimer
 *   Escape                -> stopSpeaking
 *   ?, h                  -> help   ("?" arrives as key "?" with shift; shift is allowed)
 */
export function keyToCommand(event: KeyLike): Command | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  const el = event.target as { tagName?: unknown; isContentEditable?: unknown } | null | undefined
  if (el) {
    const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : ''
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true) return null
  }
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  switch (key) {
    case 'ArrowRight':
    case 'n':
    case 'j':
      return { type: 'next' }
    case 'ArrowLeft':
    case 'p':
    case 'b':
    case 'k':
      return { type: 'previous' }
    case 'r':
      return { type: 'repeat' }
    case 'i':
      return { type: 'toggleIngredients' }
    case 's':
      return { type: 'showTab', tab: 'steps' }
    case 't':
      return { type: 'startTimer' }
    case 'f':
      return { type: 'toggleTimer' }
    case 'Escape':
      return { type: 'stopSpeaking' }
    case '?':
    case 'h':
      return { type: 'help' }
    default:
      return null
  }
}

/** For the help sheet; must stay in sync with keyToCommand. */
export const KEY_GUIDE: ReadonlyArray<{ keys: string[]; action: string }> = [
  { keys: ['→', 'N'], action: 'Next step' },
  { keys: ['←', 'P'], action: 'Previous step' },
  { keys: ['R'], action: 'Read step again' },
  { keys: ['I'], action: 'Show / hide ingredients' },
  { keys: ['T'], action: 'Start step timer' },
  { keys: ['F'], action: 'Pause / resume timer' },
  { keys: ['Esc'], action: 'Stop talking' },
  { keys: ['?'], action: 'Help' },
]
