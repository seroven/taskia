import { useId, useMemo } from 'react'
import { courseSeed, planetTone, worldSeed } from '../../../lib/seed'
import { PlanetBody } from './PlanetBody'
import { SunBody } from './SunBody'

type Props = {
  worldId: number
  /** Cursos del mundo: cada uno es un planeta en su órbita. Sin datos aún, solo el sol. */
  courseIds: number[]
  size?: number
}

/** La vista previa es chica: solo se dibujan los primeros cursos, aunque el mundo tenga más. */
const MAX = 4

type Ring = { ids: number[]; rx: number; ry: number; planet: number; seconds: number }

function halves(rx: number, ry: number) {
  return {
    back: `M${-rx} 0 A${rx} ${ry} 0 0 1 ${rx} 0`,
    front: `M${-rx} 0 A${rx} ${ry} 0 0 0 ${rx} 0`,
  }
}

/** Una sola órbita inclinada, como en la escena de Mundos del hub (hasta 4 planetas). */
function planRings(ids: number[]): Ring[] {
  if (ids.length === 0) return []
  return [{ ids, rx: 74, ry: 23, planet: 15, seconds: 16 }]
}

/**
 * Sistema en miniatura para la lista de mundos, con el mismo lenguaje de la escena de Mundos del hub: órbitas
 * punteadas inclinadas que pasan por detrás y por delante del sol, un planeta de línea (con sus bandas,
 * cráteres y anillos) por cada curso y una constelación de fondo.
 */
export function MiniSystem({ worldId, courseIds, size = 250 }: Props) {
  const uid = useId().replace(/:/g, '')
  const back = `${uid}-back`
  const front = `${uid}-front`
  const sunTone = useMemo(() => planetTone(worldSeed(worldId)), [worldId])
  const rings = useMemo(() => planRings(courseIds.slice(0, MAX)), [courseIds])
  const guide = rings.length === 0 ? [{ rx: 72, ry: 22 }] : []

  const planets = (clip: string) => (
    <g clipPath={`url(#${clip})`}>
      {rings.map((ring, ringIndex) =>
        ring.ids.map((id, index) => {
          const phase = (index / ring.ids.length) * 2 * ring.seconds + ringIndex * ring.seconds * 0.6
          const scale = ring.planet / 52
          return (
            <g
              key={id}
              className="orbit-x"
              style={{ ['--rx' as string]: `${ring.rx}px`, ['--dur' as string]: `${ring.seconds}s`, animationDelay: `${-phase}s` }}
            >
              <g
                className="orbit-y"
                style={{
                  ['--ry' as string]: `${ring.ry}px`,
                  ['--dur' as string]: `${ring.seconds}s`,
                  animationDelay: `${-(ring.seconds / 2) - phase}s`,
                }}
              >
                <g
                  className={`mini-body line-planet tone-${planetTone(courseSeed(worldId, id))}`}
                  style={{ ['--sw' as string]: String(2.3 / scale) }}
                  transform={`rotate(18) scale(${scale.toFixed(3)}) translate(-100 -100)`}
                >
                  <PlanetBody seed={courseSeed(worldId, id)} animate={false} />
                </g>
              </g>
            </g>
          )
        }),
      )}
    </g>
  )

  return (
    <svg
      className={`scene mini-system line-sun tone-${sunTone}`}
      viewBox="0 0 240 200"
      style={{ width: size, height: (size * 200) / 240 }}
      aria-hidden
      focusable="false"
    >
      <defs>
        <clipPath id={back}>
          <rect x="-130" y="-90" width="260" height="90" />
        </clipPath>
        <clipPath id={front}>
          <rect x="-130" y="0" width="260" height="90" />
        </clipPath>
      </defs>

      <g className="hov-lift">
        <g transform="translate(120 100) rotate(-18)">
          {rings.map((ring, index) => (
            <path key={index} d={halves(ring.rx, ring.ry).back} className="dots dim" />
          ))}
          {guide.map((ring, index) => (
            <path key={index} d={halves(ring.rx, ring.ry).back} className="dots dim" />
          ))}
          {planets(back)}
        </g>

        <g className="mini-body mini-sun" style={{ ['--sw' as string]: String(2.4 / 0.5) }} transform="translate(120 100) scale(0.5) translate(-100 -100)">
          <SunBody animate={false} />
        </g>

        <g transform="translate(120 100) rotate(-18)">
          {rings.map((ring, index) => (
            <path key={index} d={halves(ring.rx, ring.ry).front} className="dots dim" />
          ))}
          {guide.map((ring, index) => (
            <path key={index} d={halves(ring.rx, ring.ry).front} className="dots dim" />
          ))}
          {planets(front)}
        </g>
      </g>
    </svg>
  )
}
