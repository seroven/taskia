import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export type ChipTone = 'neutral' | 'accent' | 'muted' | 'success' | 'solid'

function chipClass(tone: ChipTone, active: boolean, className: string) {
  return ['chip', tone === 'neutral' ? '' : `chip--${tone}`, active ? 'is-active' : '', className]
    .filter(Boolean)
    .join(' ')
}

export function Chip({
  tone = 'neutral',
  active = false,
  className = '',
  children,
  ...props
}: {
  tone?: ChipTone
  active?: boolean
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={chipClass(tone, active, className)} {...props}>
      {children}
    </span>
  )
}

export function ChipButton({
  tone = 'neutral',
  active = false,
  className = '',
  type = 'button',
  children,
  ...props
}: {
  tone?: ChipTone
  active?: boolean
  className?: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={chipClass(tone, active, className)} {...props}>
      {children}
    </button>
  )
}
