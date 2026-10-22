/**
 * Shared primitives for the "The Pass" design system (DESIGN.md). Screens compose these instead of
 * re-spelling class strings, so the CTA voice and ticket component stay identical everywhere.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { buttonClass, type ButtonSize as Size, type ButtonVariant as Variant } from './buttonClass'

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}

/** Mono, uppercase call-out label ("SERVES 4", "STEP 3 OF 7", "HEARD"). */
export function Label({ children, className = '', as: Tag = 'span' }: { children: ReactNode; className?: string; as?: 'span' | 'p' | 'div' | 'h2' | 'h3' }) {
  return <Tag className={`label-mono text-ink-2 ${className}`}>{children}</Tag>
}

/**
 * A ticket: mono header strip, perforation, body. Sits on the paper-2 rail. `header` is optional;
 * without it the ticket is just paper with an edge (used for wells and panels).
 */
export function Ticket({
  header,
  children,
  className = '',
  bodyClassName = 'p-4 sm:p-5',
  as: Tag = 'div',
}: {
  header?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  as?: 'div' | 'article' | 'section' | 'li'
}) {
  return (
    <Tag className={`ticket ${className}`}>
      {header ? (
        <>
          <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 sm:px-5">{header}</div>
          <div className="perforation" aria-hidden="true" />
        </>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  )
}

/** Wordmark: ticket-notch glyph + mono name. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <path
          d="M4 3h16v7a2 2 0 0 0 0 4v7H4v-7a2 2 0 0 0 0-4V3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M8 8h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="label-mono text-[0.95rem] tracking-[0.08em] text-ink">Culinary Companion</span>
    </span>
  )
}
