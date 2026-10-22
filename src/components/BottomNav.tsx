import { NavLink } from 'react-router'
import { Heart, Home, Search, Settings, type LucideIcon } from 'lucide-react'

const ITEMS: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/favorites', label: 'Saved', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/** Fixed bottom bar; pages leave room for it (see Page). Labels are always visible. */
export default function BottomNav() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white">
      <ul className="mx-auto flex max-w-5xl">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium short:h-11 short:flex-row short:gap-2 short:text-sm ${
                  isActive ? 'text-brand-700' : 'text-stone-600 hover:text-stone-900'
                }`
              }
            >
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
