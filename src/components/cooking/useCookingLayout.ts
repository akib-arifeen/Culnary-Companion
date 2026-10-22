import { useSyncExternalStore } from 'react'

/**
 * Which "Pass" layout the viewport gets (DESIGN.md § Macrostructure, Cooking):
 *  - 'lg'   : 1024+ wide and taller than 600 -> step ticket 62 % | rail 38 %, no tabs.
 *  - 'md'   : 768-1023 wide and taller than 600 -> step ticket, then ingredients | timers below it, no tabs.
 *  - 'tabs' : anything narrower, or a short viewport (height <= 600, e.g. a phone on its side) -> Step / Ingredients / Timers tabs.
 * Matches the `short:` variant in index.css (max-height: 600px).
 */
export type CookingLayout = 'lg' | 'md' | 'tabs'

// ds-allow-hardcode:start — media queries mirror Tailwind's lg / md breakpoints and the `short:` variant in index.css
export const LAYOUT_QUERIES = {
  lg: '(width >= 1024px) and (height > 600px)',
  md: '(width >= 768px) and (height > 600px)',
} as const
// ds-allow-hardcode:end

const canMatch = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

function subscribe(onChange: () => void): () => void {
  if (!canMatch()) return () => {}
  const lists = [window.matchMedia(LAYOUT_QUERIES.lg), window.matchMedia(LAYOUT_QUERIES.md)]
  for (const list of lists) list.addEventListener('change', onChange)
  return () => {
    for (const list of lists) list.removeEventListener('change', onChange)
  }
}

function snapshot(): CookingLayout {
  if (!canMatch()) return 'tabs'
  if (window.matchMedia(LAYOUT_QUERIES.lg).matches) return 'lg'
  if (window.matchMedia(LAYOUT_QUERIES.md).matches) return 'md'
  return 'tabs'
}

/** No matchMedia (old browsers, jsdom) means the phone layout, which works everywhere. */
export function useCookingLayout(): CookingLayout {
  return useSyncExternalStore(subscribe, snapshot, () => 'tabs')
}
