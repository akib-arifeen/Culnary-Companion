/** CTA voice (DESIGN.md § CTA voice). Shared so links, buttons and screen-specific controls match. */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary'
export type ButtonSize = 'md' | 'lg'
type Variant = ButtonVariant
type Size = ButtonSize

const BASE =
  'inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-(--radius-control) label-mono transition-colors duration-(--dur-quick) disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/88 active:bg-ink/80',
  secondary: 'bg-paper text-ink border-2 border-ink-2 hover:bg-paper-2 active:bg-rule/40',
  tertiary: 'text-ink underline underline-offset-3 decoration-2 hover:decoration-accent',
}

/** md = 48px (browse), lg = 56px (cooking mode, wet hands). Tertiary has no box. */
const SIZE: Record<Size, string> = {
  md: 'min-h-12 px-5',
  lg: 'min-h-14 px-6 text-sm',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return [BASE, VARIANT[variant], variant === 'tertiary' ? 'min-h-11 px-1' : SIZE[size], extra].join(' ')
}
