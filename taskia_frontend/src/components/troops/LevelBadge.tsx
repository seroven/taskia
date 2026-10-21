type Size = 'sm' | 'md' | 'lg'

/** Escudo (viewBox 48×56). */
const SHIELD = 'M24 3 L43 10 V27 C43 40 33 49 24 53 C15 49 5 40 5 27 V10 Z'

/**
 * Insignia de nivel. En tamaño `sm` es una pastilla neutra («Nv 6»); en `md` y `lg`, un escudo liso con el trazo oscuro de las
 * ilustraciones de la app y colores planos (sin degradados), los de la nave de la tripulación: el escudo con `color` y el número con `light`. Con tres cifras el número se achica. `title` es el tooltip.
 */
export function LevelBadge({
  level,
  size = 'md',
  title,
  color = '#3b82f6',
  light = '#bfdbfe',
}: {
  level: number
  size?: Size
  title?: string
  /** Color del escudo (el de las alas y motores de la nave). */
  color?: string
  /** Color del número (el del casco). */
  light?: string
}) {
  const digits = String(level).length
  const tip = title ?? `Nivel ${level}`
  if (size === 'sm') {
    return (
      <span className="lvl-pill" role="img" aria-label={`Nivel ${level}`} title={tip}>
        Nv {level}
      </span>
    )
  }
  return (
    <span className={`lvl-shield lvl-shield--${size}`} role="img" aria-label={`Nivel ${level}`} title={tip}>
      <svg viewBox="0 0 48 56" focusable="false" aria-hidden>
        <path d={SHIELD} fill={color} className="lvl-shield-body" />
        <text x="24" y={digits > 2 ? 34 : 36} textAnchor="middle" className="lvl-shield-num" fontSize={digits > 2 ? 20 : digits > 1 ? 26 : 32} fill={light}>
          {level}
        </text>
      </svg>
    </span>
  )
}
