import { Link, useLocation } from 'react-router'
import { NAV_ITEMS } from './navItems'

/** Phone only (hidden at md and up). Three labelled targets, at least 56 px tall. */
export default function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-2 bg-paper md:hidden">
      <ul className="mx-auto flex max-w-6xl">
        {NAV_ITEMS.map((item) => {
          const current = item.match(pathname)
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={current}
                className={`label-mono relative flex h-14 items-center justify-center whitespace-nowrap text-ink ${
                  current ? 'bg-paper-2 font-extrabold underline decoration-2 underline-offset-8' : ''
                }`}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
