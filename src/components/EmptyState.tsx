import type { ReactNode } from 'react'
import { ButtonLink, Label, Ticket } from './ui/primitives'

/**
 * A designed empty state, as a ticket: mono strip, a heading that names the situation, one line about
 * what the place is for, then one action. Centred from md.
 */
export default function EmptyState({
  strip,
  title,
  children,
  actionLabel,
  actionTo = '/',
}: {
  strip: string
  /** Names the empty situation in plain words ("Nothing saved yet"). */
  title: string
  children: ReactNode
  actionLabel: string
  actionTo?: string
}) {
  return (
    <Ticket
      className="mx-auto max-w-xl"
      header={<Label className="whitespace-nowrap text-ink">{strip}</Label>}
      bodyClassName="flex flex-col items-start gap-4 p-5 sm:p-6"
    >
      <div className="space-y-2">
        <h2 className="text-ticket font-extrabold text-ink sm:text-2xl">{title}</h2>
        <p className="max-w-prose text-lg text-ink-2">{children}</p>
      </div>
      <ButtonLink to={actionTo} className="whitespace-nowrap">
        {actionLabel}
      </ButtonLink>
    </Ticket>
  )
}
