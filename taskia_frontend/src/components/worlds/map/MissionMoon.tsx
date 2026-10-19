import { useId, useMemo } from 'react'
import { moonPhase } from '../../../lib/moonPhase'
import { mulberry32 } from '../../../lib/seed'

type Props = {
  seed: number
  /** pending (luna nueva) · studying (creciente, cuarto o gibosa según la etapa) · mastered (luna llena). */
  status: string
  /** Etapa del estudio: understanding | practicing | reviewing. */
  phase?: string | null
}

/**
 * Parte iluminada (lado derecho) de cada fase, sobre un disco de radio 26 centrado en (32, 32): el borde exterior
 * es la semicircunferencia derecha y el terminador es una elipse (hacia la derecha en creciente, hacia la
 * izquierda en gibosa).
 */
const LIT: Record<'crescent' | 'quarter' | 'gibbous', string> = {
  crescent: 'M32 6 A26 26 0 0 1 32 58 A14 26 0 0 0 32 6Z',
  quarter: 'M32 6 A26 26 0 0 1 32 58Z',
  gibbous: 'M32 6 A26 26 0 0 1 32 58 A14 26 0 0 1 32 6Z',
}

/** Luna de una misión: su fase cuenta el avance, como las fases de la luna. */
export function MissionMoon({ seed, status, phase }: Props) {
  const uid = useId().replace(/:/g, '')
  const craters = useMemo(() => {
    const rand = mulberry32(seed)
    return Array.from({ length: 3 }, () => {
      const angle = rand() * Math.PI * 2
      const dist = 6 + rand() * 14
      return { x: 32 + Math.cos(angle) * dist, y: 32 + Math.sin(angle) * dist, r: 2.6 + rand() * 3.4 }
    })
  }, [seed])

  const state = status === 'mastered' || status === 'studying' ? status : 'pending'
  const shape = moonPhase(status, phase)

  return (
    <svg className={`mission-moon is-${state} phase-${shape}`} viewBox="0 0 64 64" aria-hidden focusable="false">
      <defs>
        <clipPath id={`${uid}-body`}>
          <circle cx="32" cy="32" r="26" />
        </clipPath>
      </defs>
      <circle className="mm-halo" cx="32" cy="32" r="26" />
      <circle className="mm-body" cx="32" cy="32" r="26" />
      {shape === 'crescent' || shape === 'quarter' || shape === 'gibbous' ? (
        <g clipPath={`url(#${uid}-body)`}>
          <path className="mm-lit" d={LIT[shape]} />
        </g>
      ) : null}
      {craters.map((crater, index) => (
        <circle key={index} className="mm-crater" cx={crater.x} cy={crater.y} r={crater.r} />
      ))}
      <circle className="mm-rim" cx="32" cy="32" r="26" />
    </svg>
  )
}
