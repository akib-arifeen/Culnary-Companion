/** The three places in the app (DESIGN.md § Navigation). Shared by the phone bottom bar and the md+ top bar. */
export interface NavItem {
  to: string
  label: string
  /** Routes that render this place. `/search` is Recipes with the filter focused. */
  match: (pathname: string) => 'page' | 'true' | undefined
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    to: '/',
    label: 'Recipes',
    match: (p) => (p === '/' || p === '/search' ? 'page' : p.startsWith('/recipe/') ? 'true' : undefined),
  },
  { to: '/favorites', label: 'Saved', match: (p) => (p === '/favorites' ? 'page' : undefined) },
  { to: '/settings', label: 'Settings', match: (p) => (p === '/settings' ? 'page' : undefined) },
]
