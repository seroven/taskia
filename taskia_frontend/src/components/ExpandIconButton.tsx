import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Icon, IconWeight } from '@phosphor-icons/react'

type Variant = 'ghost' | 'primary' | 'accent'

export function ExpandIconButton({
  icon: IconCmp,
  label,
  variant = 'ghost',
  weight = 'duotone',
  className = '',
  title,
  media,
  ...props
}: {
  icon: Icon
  /** Algo en lugar del icono (por ejemplo, el avatar del usuario). */
  media?: ReactNode
  label: string
  variant?: Variant
  weight?: IconWeight
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`expand-btn expand-btn--${variant}${media ? ' expand-btn--media' : ''} ${className}`.trim()}
      title={title ?? label}
      {...props}
      aria-label={props['aria-label'] ?? label}
    >
      {media ?? <IconCmp size={22} weight={weight} />}
      <span className="expand-btn-label">
        <span className="expand-btn-label-inner">{label}</span>
      </span>
    </button>
  )
}
