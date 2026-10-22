import { ListOrdered, ShoppingBasket, Timer, type LucideIcon } from 'lucide-react'
import type { CookingTab } from '../../lib/commands'

interface CookingTabsProps {
  tab: CookingTab
  onSelect: (tab: CookingTab) => void
  checkedCount: number
  ingredientCount: number
  runningTimers: number
}

/** Step / Ingredients / Timers, for phones and short viewports. Wide screens show all three at once and render no tabs. */
export default function CookingTabs({ tab, onSelect, checkedCount, ingredientCount, runningTimers }: CookingTabsProps) {
  // The accessible name is the visible text first, then sr-only context (WCAG 2.5.3 Label in Name).
  const tabs: Array<{ id: CookingTab; label: string; Icon: LucideIcon; badge: string | null; context: string }> = [
    { id: 'steps', label: 'Step', Icon: ListOrdered, badge: null, context: '' },
    { id: 'ingredients', label: 'Ingredients', Icon: ShoppingBasket, badge: `${checkedCount}/${ingredientCount}`, context: ' checked' },
    { id: 'timers', label: 'Timers', Icon: Timer, badge: runningTimers > 0 ? String(runningTimers) : null, context: ' running' },
  ]
  return (
    <div role="tablist" aria-label="Cooking views" className="flex h-14 shrink-0 border-b border-rule bg-paper">
      {tabs.map(({ id, label, Icon, badge, context }) => {
        const selected = tab === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`cooking-tab-${id}`}
            aria-selected={selected}
            aria-controls="cooking-panel"
            onClick={() => onSelect(id)}
            className={`label-mono relative flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 sm:flex-row sm:gap-2 sm:px-2 ${
              selected ? 'text-ink' : 'text-ink-2 hover:bg-paper-2'
            }`}
          >
            <span aria-hidden="true" className={`absolute inset-x-3 bottom-0 h-1 ${selected ? 'bg-accent' : 'bg-transparent'}`} />
            <Icon className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="sm:truncate">{label}</span>
            {badge ? (
              <>
                {' '}
                <span className="absolute top-1 left-1/2 ml-2 flex items-center gap-1 rounded-full bg-paper-2 px-1.5 font-mono text-label font-semibold tabular-nums text-ink ring-1 ring-rule sm:static sm:ml-0 sm:shrink-0">
                  {id === 'timers' ? <span aria-hidden="true" className="live-pulse size-2 rounded-full bg-accent" /> : null}
                  {badge}
                  <span className="sr-only">{context}</span>
                </span>
              </>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
