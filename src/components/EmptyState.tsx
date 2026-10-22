import type { ReactNode } from 'react'
import { ButtonLink, Ticket } from './ui/primitives'

/** A designed empty state: what this place is for, plus one action. */
export default function EmptyState({
  title,
  children,
  actionLabel,
  actionTo = '/',
}: {
  title: string
  children: ReactNode
  actionLabel: string
  actionTo?: string
}) {
  return (
    <Ticket className="max-w-xl" bodyClassName="flex flex-col items-start gap-3 p-5 sm:p-6">
      <h2 className="text-ticket font-extrabold text-ink">{title}</h2>
      <p className="max-w-prose text-ink-2">{children}</p>
      <ButtonLink to={actionTo} className="whitespace-nowrap">
        {actionLabel}
      </ButtonLink>
    </Ticket>
  )
}
