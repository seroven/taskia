import type { ButtonHTMLAttributes } from 'react'

/** Primario o secundario. La misma clase que el resto de la app. */
export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: {
  variant?: 'primary' | 'ghost'
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`${variant}${className ? ` ${className}` : ''}`}
      {...props}
    />
  )
}
