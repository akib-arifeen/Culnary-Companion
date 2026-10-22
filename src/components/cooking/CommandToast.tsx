import { useEffect, useRef, useState } from 'react'
import { Bell, Hand, Keyboard, Mic } from 'lucide-react'
import type { CommandSource } from '../../lib/commands'

export interface ToastData {
  key: number
  kind: CommandSource | 'info'
  text: string
  /** What the microphone heard, shown in quotes after the text. */
  heard?: string
}

const SHOW_MS = 1800
const FADE_MS = 300

function ToastIcon({ kind }: { kind: ToastData['kind'] }) {
  const className = 'size-5 shrink-0'
  if (kind === 'voice') return <Mic className={className} aria-hidden="true" />
  if (kind === 'key') return <Keyboard className={className} aria-hidden="true" />
  if (kind === 'info') return <Bell className={className} aria-hidden="true" />
  return <Hand className={className} aria-hidden="true" />
}

/** Transient feedback for what was just understood. The live region stays mounted so screen readers announce changes. */
export default function CommandToast({ toast, onDismiss }: { toast: ToastData | null; onDismiss: () => void }) {
  const [fadingKey, setFadingKey] = useState<number | null>(null)
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  })

  const key = toast?.key
  useEffect(() => {
    if (key === undefined) return
    const fade = setTimeout(() => setFadingKey(key), SHOW_MS - FADE_MS)
    const done = setTimeout(() => dismissRef.current(), SHOW_MS)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [key])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-14 z-50 flex justify-center px-4">
      {toast ? (
        <p
          key={toast.key}
          className={`flex max-w-full items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-base font-medium text-white shadow-lg ring-1 ring-white/10 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:starting:opacity-0 ${
            fadingKey === toast.key ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <ToastIcon kind={toast.kind} />
          <span className="min-w-0 truncate">
            {toast.text}
            {toast.heard ? <span className="ml-2 font-normal text-stone-300">“{toast.heard}”</span> : null}
          </span>
        </p>
      ) : null}
    </div>
  )
}
