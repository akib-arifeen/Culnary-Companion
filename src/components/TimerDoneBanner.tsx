import { useLocation } from 'react-router'
import { useTimers } from '../context/TimerContext'

/** Finished kitchen timers, on every screen except cooking mode (which shows its own). */
export default function TimerDoneBanner() {
  const { timers, remove } = useTimers()
  const { pathname } = useLocation()
  const done = timers.filter((timer) => timer.done)

  if (done.length === 0 || pathname.startsWith('/cooking')) return null

  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-50 flex flex-col">
      {done.map((timer) => (
        <div key={timer.id} className="border-b-2 border-ink bg-accent text-accent-ink">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
            <span className="label-mono shrink-0 whitespace-nowrap">Time's up</span>
            <p className="min-w-0 grow text-lg font-extrabold">{timer.label}</p>
            <button
              type="button"
              onClick={() => remove(timer.id)}
              className="label-mono min-h-12 shrink-0 cursor-pointer whitespace-nowrap rounded-control border-2 border-accent-ink px-4 hover:bg-accent-ink hover:text-accent"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
