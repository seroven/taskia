import { useId, useMemo } from 'react'
import { mulberry32 } from '../../../lib/seed'

type Props = {
  seed: number
  /** pending (luna nueva) · studying (media luna dorada) · mastered (luna llena con halo). */
  status: string
}

/** Luna de una misión: su fase cuenta el avance, como las fases de la luna. */
export function MissionMoon({ seed, status }: Props) {
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

  return (
    <svg className={`mission-moon is-${state}`} viewBox="0 0 64 64" aria-hidden focusable="false">
      <defs>
        <clipPath id={`${uid}-body`}>
          <circle cx="32" cy="32" r="26" />
        </clipPath>
      </defs>
      <circle className="mm-halo" cx="32" cy="32" r="26" />
      <circle className="mm-body" cx="32" cy="32" r="26" />
      {state === 'studying' ? (
        <g clipPath={`url(#${uid}-body)`}>
          <rect className="mm-lit" x="32" y="4" width="30" height="56" />
          <path className="mm-edge" d="M32 6 V58" />
        </g>
      ) : null}
      {craters.map((crater, index) => (
        <circle key={index} className="mm-crater" cx={crater.x} cy={crater.y} r={crater.r} />
      ))}
      <circle className="mm-rim" cx="32" cy="32" r="26" />
    </svg>
  )
}
