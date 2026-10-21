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
  progress,
  tier = 0,
}: {
  level: number
  size?: Size
  title?: string
  /** Color del escudo (el de las alas y motores de la nave). */
  color?: string
  /** Color del número (el del casco). */
  light?: string
  /** Cuánto lleva del nivel actual (0 a 1): dibuja un aro que se llena alrededor del escudo. */
  progress?: number
  /** Hitos alcanzados (0 a 5): cada uno suma un adorno (ver `levelTier` en `lib/ship/types.ts`). */
  tier?: number
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
    <span
      className={`lvl-shield lvl-shield--${size}${progress != null ? ' has-ring' : ''}`}
      data-tier={tier}
      role="img"
      aria-label={`Nivel ${level}`}
      title={tip}
    >
      <svg viewBox="0 0 48 56" focusable="false" aria-hidden>
        {progress != null && (
          <g transform="translate(24 28) scale(1.2) translate(-24 -28)" className="lvl-ring">
            <path d={SHIELD} pathLength={100} className="lvl-ring-track" />
            <path d={SHIELD} pathLength={100} className="lvl-ring-fill" stroke={color} strokeDasharray={`${Math.max(0, Math.min(1, progress)) * 100} 100`} />
          </g>
        )}
        {tier >= 2 && (
          <g className="lvl-wings" fill={light}>
            <path d="M5 20 L-4 14 L-1 26 L5 28 Z" />
            <path d="M43 20 L52 14 L49 26 L43 28 Z" />
          </g>
        )}
        <path d={SHIELD} fill={color} className={`lvl-shield-body${tier >= 4 ? ' is-gold' : ''}`} />
        {tier >= 1 && <path d={SHIELD} fill="none" className="lvl-shield-inner" transform="translate(24 28) scale(0.8) translate(-24 -28)" stroke={light} />}
        {tier >= 3 && <path d="M24 -6 L26 -1 L31 -1 L27 2 L28.6 7 L24 4 L19.4 7 L21 2 L17 -1 L22 -1 Z" className="lvl-star" />}
        <text x="24" y={digits > 2 ? 34 : 36} textAnchor="middle" className="lvl-shield-num" fontSize={digits > 2 ? 20 : digits > 1 ? 26 : 32} fill={light}>
          {level}
        </text>
      </svg>
    </span>
  )
}
