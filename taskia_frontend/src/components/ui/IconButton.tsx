import type { ButtonHTMLAttributes } from 'react'
import type { Icon, IconWeight } from '@phosphor-icons/react'

/**
 * Botón solo icono. Hover cambia color/borde (no revela texto).
 * Misma base visual que los botones de sesión (salir, etc.).
 */
export function IconButton({
  icon: IconCmp,
  label,
  weight = 'bold',
  size = 22,
  className = '',
  ...props
}: {
  icon: Icon
  /** Accesible: aria-label y title nativo del navegador. */
  label: string
  weight?: IconWeight
  size?: number
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'>) {
  const { title, ...rest } = props
  return (
    <button
      type="button"
      className={`session-icon-btn${className ? ` ${className}` : ''}`}
      {...rest}
      aria-label={label}
      title={title ?? label}
    >
      <IconCmp size={size} weight={weight} />
    </button>
  )
}
