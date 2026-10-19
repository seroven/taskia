import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Spark } from '../../scenes/kit'
import { sv } from '../../scenes/sv'
import { LinePlanet } from './LinePlanet'

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
  items: OrbitItem[]
  /** Todo lo de este sistema está dominado: el sistema brilla. */
  complete?: boolean
  /** Se muestra en el centro-bajo cuando aún no hay lunas. */
  emptyHint?: ReactNode
}

type Plan = { groups: OrbitItem[][]; radii: number[]; moon: number; core: number }

/** Reparte las lunas en 1, 2 o 3 anillos y ajusta su tamaño al número. */
function plan(items: OrbitItem[]): Plan {
  const n = items.length
  if (n <= 5) return { groups: [items], radii: [34], moon: 14, core: 30 }
  if (n <= 11) {
    const inner = Math.ceil(n / 2)
    return { groups: [items.slice(0, inner), items.slice(inner)], radii: [25, 40], moon: 12, core: 28 }
  }
  const a = Math.ceil(n / 4)
  const b = Math.ceil((n - a) / 2)
  return {
    groups: [items.slice(0, a), items.slice(a, a + b), items.slice(a + b)],
    radii: [18, 31, 44],
    moon: 9.5,
    core: 22,
  }
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
export function OrbitSystem({ centerSeed, items, complete = false, emptyHint }: Props) {
  const { groups, radii, moon, core } = plan(items)
  const arrivingKey = items.find((item) => item.arriving)?.key ?? null

  // El despertar (ondas desde el planeta) dura un rato y se apaga solo.
  const [awake, setAwake] = useState(false)
  useEffect(() => {
    if (arrivingKey == null) return
    setAwake(true)
    const timer = window.setTimeout(() => setAwake(false), 3200)
    return () => window.clearTimeout(timer)
  }, [arrivingKey])

  const empty = items.length === 0

  return (
    <div
      className={`system${complete ? ' is-complete' : ''}${awake ? ' is-awake' : ''}${empty ? ' is-empty' : ''}`}
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
        <LinePlanet seed={centerSeed} size={`${core}cqw`} />
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
            const angle = ((index + ringIndex * 0.5) / group.length) * 360 + 30
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
