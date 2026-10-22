import { useLocation } from 'react-router'
import { BellRing } from 'lucide-react'
import { useTimers } from '../context/TimerContext'

/** Finished kitchen timers, on every screen except cooking mode (which shows its own). */
export default function TimerDoneBanner() {
  const { timers, remove } = useTimers()
  const { pathname } = useLocation()
  const done = timers.filter((timer) => timer.done)

  if (done.length === 0 || pathname.startsWith('/cooking')) return null

  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-50 flex flex-col gap-2 p-2">
      {done.map((timer) => (
        <div
          key={timer.id}
          className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-xl bg-brand-800 px-4 py-3 text-white shadow-lg"
        >
          <BellRing size={20} className="shrink-0" aria-hidden="true" />
          <p className="min-w-0 grow font-semibold">Time's up: {timer.label}</p>
          <button
            type="button"
            onClick={() => remove(timer.id)}
            className="shrink-0 cursor-pointer rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}
