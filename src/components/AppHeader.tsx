import { Link, useLocation } from 'react-router'
import { Wordmark } from './ui/primitives'
import { NAV_ITEMS } from './navItems'

/** Wordmark on the left; from md up the three places sit on the right (phones use the bottom bar). */
export default function AppHeader() {
  const { pathname } = useLocation()
  return (
    <header className="border-b border-ink-2 bg-paper">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" aria-label="Culinary Companion, Recipes" className="inline-flex min-h-11 items-center">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex gap-1">
            {NAV_ITEMS.map((item) => {
              const current = item.match(pathname)
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={current}
                    className={`label-mono inline-flex min-h-11 items-center whitespace-nowrap px-3 text-ink hover:underline hover:underline-offset-4 ${
                      current ? 'font-extrabold underline decoration-2 underline-offset-8' : ''
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
