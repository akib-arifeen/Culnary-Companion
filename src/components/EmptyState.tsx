import type { ReactNode } from 'react'
import { ButtonLink, Label, Ticket } from './ui/primitives'

/** A designed empty state, as a ticket: mono strip, perforation, one specific line, one action. Centred from md. */
export default function EmptyState({
  strip,
  children,
  actionLabel,
  actionTo = '/',
}: {
  strip: string
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
      <p className="max-w-prose text-xl text-ink">{children}</p>
      <ButtonLink to={actionTo} className="whitespace-nowrap">
        {actionLabel}
      </ButtonLink>
    </Ticket>
  )
}
