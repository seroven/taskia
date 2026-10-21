import { useId } from 'react'

type Size = 'sm' | 'md' | 'lg'

/** Estrella de cinco puntas (centro 24,25; puntas a 21,5 y valles a 10,8), con el trazo redondeado por `stroke-linejoin`. */
const STAR = Array.from({ length: 10 }, (_, i) => {
  const angle = (Math.PI / 5) * i - Math.PI / 2
  const radius = i % 2 === 0 ? 21.5 : 10.8
  return `${(24 + Math.cos(angle) * radius).toFixed(2)},${(25 + Math.sin(angle) * radius).toFixed(2)}`
}).join(' ')

/**
 * Insignia de nivel: una estrella de línea con el número grande al centro. Con tres cifras el número se achica.
 * `title` es el tooltip (por ejemplo «Nivel de la tripulación»).
 */
export function LevelBadge({ level, size = 'md', title }: { level: number; size?: Size; title?: string }) {
  const gradient = `lb-${useId().replace(/:/g, '')}`
  const digits = String(level).length
  return (
    <span className={`lvl-star lvl-star--${size}`} role="img" aria-label={`Nivel ${level}`} title={title ?? `Nivel ${level}`}>
      <svg viewBox="0 0 48 48" focusable="false" aria-hidden>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe48a" />
            <stop offset="1" stopColor="var(--star)" />
          </linearGradient>
        </defs>
        <polygon points={STAR} fill={`url(#${gradient})`} className="lvl-star-star" />
        <path d="M14 19.5 Q19 11.5 25 11" className="lvl-star-shine" fill="none" />
        <text x="24" y={digits > 2 ? 29.5 : 30.5} textAnchor="middle" className="lvl-star-num" fontSize={digits > 2 ? 13 : digits > 1 ? 16 : 19}>
          {level}
        </text>
      </svg>
    </span>
  )
}
