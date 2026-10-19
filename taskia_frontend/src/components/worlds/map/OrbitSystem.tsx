import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Spark } from '../../scenes/kit'
import { sv } from '../../scenes/sv'
import { LinePlanet } from './LinePlanet'
import { LineSun } from './LineSun'

export type OrbitItem = {
  key: string | number
  label: string
  sub?: string
  /** Lo que se dibuja como luna (un planeta, una fase lunar…). */
  art: ReactNode
  state?: string
  onClick: () => void
  /** Botón extra junto a la luna (p. ej. el trofeo del desafío). */
  extra?: ReactNode
  /** Llega por primera vez: vuela hacia su órbita con un destello. */
  arriving?: boolean
}

type Props = {
  centerSeed: number
  /** Lo que hay al centro: un sol (el mundo) o un planeta (el curso). */
  centerKind?: 'sun' | 'planet'
  items: OrbitItem[]
  /** Todo lo de este sistema está dominado: el sistema brilla. */
  complete?: boolean
  /** Se muestra en el centro-bajo cuando aún no hay lunas. */
  emptyHint?: ReactNode
}

type Tier = 'roomy' | 'normal' | 'dense' | 'packed'
type Plan = { groups: OrbitItem[][]; radii: number[]; moon: number; core: number; tier: Tier }

/** Reparte `n` lunas entre anillos en proporción a su longitud (los de afuera caben más). */
function split(items: OrbitItem[], radii: number[]) {
  const total = radii.reduce((sum, radius) => sum + radius, 0)
  const counts = radii.map((radius) => Math.floor((items.length * radius) / total))
  let left = items.length - counts.reduce((sum, count) => sum + count, 0)
  for (let index = counts.length - 1; left > 0; index = (index - 1 + counts.length) % counts.length) {
    counts[index] += 1
    left -= 1
  }
  const groups: OrbitItem[][] = []
  let start = 0
  for (const count of counts) {
    groups.push(items.slice(start, start + count))
    start += count
  }
  return groups
}

/**
 * Plan del sistema según cuántas lunas hay: hasta 6 en un anillo holgado; hasta 12 en dos; hasta 24 en tres
 * (más chicas); más allá, los nombres pasan a aparecer solo al apuntar. Las medidas son % del ancho.
 */
function plan(items: OrbitItem[]): Plan {
  const n = items.length
  if (n <= 6) return { groups: [items], radii: [34], moon: 18, core: 50, tier: 'roomy' }
  if (n <= 12) {
    const radii = [28, 42]
    return { groups: split(items, radii), radii, moon: 13, core: 38, tier: 'normal' }
  }
  const radii = [20, 33, 45]
  return n <= 24
    ? { groups: split(items, radii), radii, moon: 10.5, core: 27, tier: 'dense' }
    : { groups: split(items, radii), radii, moon: 8, core: 25, tier: 'packed' }
}

const RING_SECONDS = [150, 190, 230]
const BURST = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2
  return { x: Math.cos(angle) * 56, y: Math.sin(angle) * 56 }
})

/**
 * Sistema orbital: un planeta al centro y sus elementos como lunas que lo orbitan muy despacio.
 * Lo usan el mundo (cursos) y el curso (misiones). Al pasar el cursor todo se detiene.
 */
export function OrbitSystem({ centerSeed, centerKind = 'planet', items, complete = false, emptyHint }: Props) {
  const { groups, radii, moon, core, tier } = plan(items)
  const arrivingKey = items.find((item) => item.arriving)?.key ?? null

  // El despertar (ondas desde el planeta) dura lo que dura la llegada: la pantalla limpia `arriving` sola.
  const awake = arrivingKey != null

  const empty = items.length === 0

  return (
    <div
      className={`system tier-${tier}${items.length > 10 ? ' is-still' : ''}${complete ? ' is-complete' : ''}${awake ? ' is-awake' : ''}${empty ? ' is-empty' : ''}`}
      style={{ ['--moon' as string]: `${moon}cqw` }}
    >
      <svg className="system-rings" viewBox="0 0 100 100" aria-hidden>
        {(empty ? [radii[0]] : radii.slice(0, groups.length)).map((radius, index) => (
          <circle key={index} cx="50" cy="50" r={radius} />
        ))}
      </svg>

      <div className="system-core">
        <span className="system-ripples" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {centerKind === 'sun' ? (
          <LineSun seed={centerSeed} size={`${core}cqw`} />
        ) : (
          <LinePlanet seed={centerSeed} size={`${core}cqw`} />
        )}
      </div>

      {empty && emptyHint ? <div className="system-empty">{emptyHint}</div> : null}

      {groups.map((group, ringIndex) => (
        <div
          key={ringIndex}
          className="system-orbit"
          style={{
            ['--dur' as string]: `${RING_SECONDS[ringIndex]}s`,
            ['--dir' as string]: ringIndex % 2 === 0 ? 'normal' : 'reverse',
            ['--dir-b' as string]: ringIndex % 2 === 0 ? 'reverse' : 'normal',
          }}
        >
          {group.map((item, index) => {
            const angle = ((index + (ringIndex % 2) * 0.5) / Math.max(group.length, 1)) * 360 + 30
            return (
              <div
                key={item.key}
                className={`system-moon${item.arriving ? ' is-arriving' : ''}`}
                style={{ ['--a' as string]: `${angle}deg`, ['--r' as string]: radii[ringIndex] }}
              >
                <motion.div
                  className={`system-item${item.state ? ` is-${item.state}` : ''}`}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.45,
                    delay: item.arriving ? 1 : 0.15 + index * 0.08 + ringIndex * 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <button type="button" className="system-item-main scene-host" onClick={item.onClick}>
                    <span className="system-moon-art">{item.art}</span>
                    <span className="system-moon-label">
                      <b>{item.label}</b>
                      {item.sub ? <i>{item.sub}</i> : null}
                    </span>
                  </button>
                  {item.extra}
                  {item.arriving ? (
                    <svg className="system-burst" viewBox="-70 -70 140 140" aria-hidden>
                      {BURST.map((point, burstIndex) => (
                        <Spark
                          key={burstIndex}
                          x={0}
                          y={0}
                          s={7}
                          className="fill-star burst-spark"
                          style={sv({ '--bx': `${point.x}px`, '--by': `${point.y}px`, '--bd': `${burstIndex * 30}ms` })}
                        />
                      ))}
                    </svg>
                  ) : null}
                </motion.div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
