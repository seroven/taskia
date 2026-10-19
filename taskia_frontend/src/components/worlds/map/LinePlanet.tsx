import { useMemo } from 'react'
import { planetTone } from '../../../lib/seed'
import { PlanetBody } from './PlanetBody'

type Props = {
  seed: number
  /** Ancho (px o cualquier unidad CSS); el alto es el mismo. */
  size?: number | string
  /** Dibuja la entrada (trazos que se arman). Apágala en listas largas. */
  animate?: boolean
  className?: string
}

/**
 * Planeta de línea generado a partir de una semilla (el id de un curso): el tono, las franjas y el anillo
 * cambian de uno a otro. Responde al hover del contenedor `.scene-host`.
 */
export function LinePlanet({ seed, size = 160, animate = true, className = '' }: Props) {
  const tone = useMemo(() => planetTone(seed), [seed])

  return (
    <svg
      className={`scene line-planet tone-${tone}${animate ? '' : ' no-intro'} ${className}`.trim()}
      viewBox="0 0 200 200"
      style={{ width: size, height: size }}
      aria-hidden
      focusable="false"
    >
      <g className="hov-lift">
        <PlanetBody seed={seed} animate={animate} />
      </g>
    </svg>
  )
}
