import { ListOrdered, ShoppingBasket, Timer, type LucideIcon } from 'lucide-react'
import type { CookingTab } from '../../lib/commands'

interface CookingTabsProps {
  tab: CookingTab
  onSelect: (tab: CookingTab) => void
  checkedCount: number
  ingredientCount: number
  runningTimers: number
}

export default function CookingTabs({ tab, onSelect, checkedCount, ingredientCount, runningTimers }: CookingTabsProps) {
  const tabs: Array<{ id: CookingTab; label: string; Icon: LucideIcon; badge: string | null; name: string }> = [
    { id: 'steps', label: 'Steps', Icon: ListOrdered, badge: null, name: 'Steps' },
    {
      id: 'ingredients',
      label: 'Ingredients',
      Icon: ShoppingBasket,
      badge: `${checkedCount}/${ingredientCount}`,
      name: `Ingredients, ${checkedCount} of ${ingredientCount} checked`,
    },
    {
      id: 'timers',
      label: 'Timers',
      Icon: Timer,
      badge: runningTimers > 0 ? String(runningTimers) : null,
      name: runningTimers > 0 ? `Timers, ${runningTimers} running` : 'Timers',
    },
  ]
  return (
    <div role="tablist" aria-label="Cooking views" className="flex h-14 shrink-0 border-t border-stone-200 bg-white">
      {tabs.map(({ id, label, Icon, badge, name }) => {
        const selected = tab === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`cooking-tab-${id}`}
            aria-selected={selected}
            aria-controls="cooking-panel"
            aria-label={name}
            onClick={() => onSelect(id)}
            className={`relative flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium sm:flex-row sm:gap-2 sm:px-2 sm:text-base ${
              selected ? 'text-brand-700' : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            <span aria-hidden="true" className={`absolute inset-x-4 top-0 h-0.5 rounded-full ${selected ? 'bg-brand-700' : 'bg-transparent'}`} />
            <span className="relative sm:contents">
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {badge ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 left-full -ml-1.5 flex items-center gap-0.5 rounded-full bg-stone-100 px-1.5 text-[11px] font-semibold leading-4 tabular-nums text-stone-700 ring-1 ring-white sm:static sm:order-last sm:ml-0 sm:shrink-0 sm:gap-1 sm:px-2 sm:py-0.5 sm:text-sm sm:leading-normal sm:ring-0"
                >
                  {id === 'timers' ? <span className="size-1.5 rounded-full bg-brand-500 motion-safe:animate-pulse sm:size-2" /> : null}
                  {badge}
                </span>
              ) : null}
            </span>
            <span aria-hidden="true" className="sm:truncate">
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
