import { useMemo } from 'react'
import { planetTone } from '../../../lib/seed'
import { SunBody } from './SunBody'

type Props = {
  seed: number
  /** Ancho (px o cualquier unidad CSS); el alto es el mismo. */
  size?: number | string
  animate?: boolean
  className?: string
}

/**
 * Sol de un mundo: el centro de su sistema. El color (amarillo, naranja, lima, rojo o azul) sale de la misma
 * semilla que el resto del mundo.
 */
export function LineSun({ seed, size = 160, animate = true, className = '' }: Props) {
  const tone = useMemo(() => planetTone(seed), [seed])

  return (
    <svg
      className={`scene line-sun tone-${tone}${animate ? '' : ' no-intro'} ${className}`.trim()}
      viewBox="0 0 200 200"
      style={{ width: size, height: size }}
      aria-hidden
      focusable="false"
    >
      <SunBody animate={animate} />
    </svg>
  )
}
