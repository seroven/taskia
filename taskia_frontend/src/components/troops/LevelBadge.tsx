import { useId } from 'react'

type Size = 'sm' | 'md' | 'lg'

/** Si un color hex es oscuro (para que el número del escudo se lea sobre un casco negro). */
function isDark(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return false
  const n = parseInt(m[1]!, 16)
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 120
}

/** Escudo (viewBox 48×56). */
const SHIELD = 'M24 3 L43 10 V27 C43 40 33 49 24 53 C15 49 5 40 5 27 V10 Z'

/**
 * Insignia de nivel. En tamaño `sm` es una pastilla neutra («Nv 6»); en `md` y `lg`, un escudo con el trazo oscuro de las
 * ilustraciones de la app y colores planos (sin degradados), los de la nave de la tripulación: cuerpo claro (`light`, el casco),
 * franja de arriba con la etiqueta «NIVEL» (`color`, alas y motores), un filete de `accent` y el número discreto, en un tono
 * oscuro de `color`. Con tres cifras el número se achica. `title` es el tooltip.
 */
export function LevelBadge({
  level,
  size = 'md',
  title,
  color = '#3b82f6',
  light = '#bfdbfe',
  accent = '#fbbf24',
  progress,
  tier = 0,
}: {
  level: number
  size?: Size
  title?: string
  /** Color del escudo (el de las alas y motores de la nave). */
  color?: string
  /** Color del cuerpo (el del casco). */
  light?: string
  /** Color del filete (el de los detalles de la nave). */
  accent?: string
  /** Cuánto lleva del nivel actual (0 a 1): dibuja un aro que se llena alrededor del escudo. */
  progress?: number
  /** Hitos alcanzados (0 a 5): cada uno suma un adorno (ver `levelTier` en `lib/ship/types.ts`). */
  tier?: number
}) {
  const digits = String(level).length
  const clip = useId()
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
          <g className="lvl-wings" fill={color}>
            <path d="M5 20 L-4 14 L-1 26 L5 28 Z" />
            <path d="M43 20 L52 14 L49 26 L43 28 Z" />
          </g>
        )}
        <clipPath id={clip}>
          <path d={SHIELD} />
        </clipPath>
        <path d={SHIELD} fill={light} className="lvl-shield-fill" />
        <g clipPath={`url(#${clip})`}>
          <rect x="0" y="0" width="48" height="21" fill={color} />
          <rect x="0" y="21" width="48" height="2.6" fill={accent} />
        </g>
        <text x="24" y="15.5" textAnchor="middle" className="lvl-shield-tag">
          NIVEL
        </text>
        <path d={SHIELD} fill="none" className={`lvl-shield-body${tier >= 4 ? ' is-gold' : ''}`} />
        {tier >= 1 && <path d={SHIELD} fill="none" className="lvl-shield-inner" transform="translate(24 30) scale(0.84) translate(-24 -30)" stroke={color} />}
        {tier >= 3 && <path d="M24 -6 L26 -1 L31 -1 L27 2 L28.6 7 L24 4 L19.4 7 L21 2 L17 -1 L22 -1 Z" className="lvl-star" />}
        <text x="24" y={digits > 2 ? 41 : 43} textAnchor="middle" className="lvl-shield-ink" fontSize={digits > 2 ? 14 : digits > 1 ? 18 : 22} style={{ fill: isDark(light) ? '#f8fafc' : `color-mix(in srgb, ${color} 62%, #0f172a)` }}>
          {level}
        </text>
      </svg>
    </span>
  )
}
