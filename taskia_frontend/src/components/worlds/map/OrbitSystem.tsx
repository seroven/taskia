import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
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
/** Las medidas de radios, luna y núcleo son % del ancho del sistema. */
type Plan = { groups: OrbitItem[][]; radii: number[]; moon: number; core: number; tier: Tier; rigid: boolean }

/** Ancho que el sistema supone antes de medirse. */
const DEFAULT_WIDTH = 700
/** Velocidad del giro mientras se apunta al sistema (1 = normal) y lo que tarda en pasar de una a otra. */
const SLOW_RATE = 0.2
const SLOW_MS = 500
/** Un planeta se dibuja a ~1,15 veces el recuadro de su luna (con el aro de avance). */
const ART = 1.15

type Mode = {
  tier: Exclude<Tier, 'roomy'>
  /** Tamaño de la luna: de `from` (fracción del ancho) hasta `min` px. */
  from: number
  min: number
  /** Lo que ocupa una luna con su nombre, en px: `v` es el dibujo de la luna. */
  foot: (v: number, width: number) => { w: number; h: number }
}

/** Mismo ancho que `.system.tier-normal .system-moon-label` en CSS. */
const labelWidth = (width: number) => Math.min(130, Math.max(90, width * 0.17))

/**
 * Del más holgado al más apretado: nombre y avance a la vista, solo el nombre en una línea corta, y solo el
 * dibujo (el nombre aparece al apuntar). Se usa el primero en que caben todas las lunas sin pisarse.
 * Los modos con nombre lo muestran en dos líneas: con una sola, «Razonamiento Verbal» y «Razonamiento Matemático»
 * quedarían iguales.
 */
const MODES: Mode[] = [
  { tier: 'normal', from: 0.13, min: 64, foot: (v, width) => ({ w: Math.max(v, labelWidth(width)), h: v + 56 }) },
  { tier: 'dense', from: 0.11, min: 56, foot: (v) => ({ w: Math.max(v, 96), h: v + 36 }) },
  { tier: 'packed', from: 0.1, min: 28, foot: (v) => ({ w: v + 6, h: v + 6 }) },
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Reparte `n` lunas entre anillos en proporción a lo que cabe en cada uno. */
function split(items: OrbitItem[], caps: number[]) {
  const total = caps.reduce((sum, cap) => sum + cap, 0)
  const counts = caps.map((cap) => Math.min(cap, Math.floor((items.length * cap) / total)))
  let left = items.length - counts.reduce((sum, count) => sum + count, 0)
  while (left > 0) {
    // El anillo con más holgura recibe la que sobra.
    let best = 0
    for (let index = 1; index < caps.length; index += 1) {
      if (caps[index] - counts[index] > caps[best] - counts[best]) best = index
    }
    counts[best] += 1
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

/** Intenta acomodar `n` lunas de diámetro `d` px en un sistema de `width` px; null si no caben sin pisarse. */
function fit(items: OrbitItem[], d: number, mode: Mode, width: number): Plan | null {
  const { w, h } = mode.foot(d * ART, width)
  // Separación mínima entre dos lunas vecinas del mismo anillo, en cualquier punto de la órbita.
  const gap = Math.max(w, h, Math.SQRT2 * Math.min(w, h))
  // Solo con el dibujo (sin nombres) el sol puede achicarse para dejar más sitio a las lunas.
  const sun = clamp(0.9 * d, (mode.tier === 'packed' ? 0.06 : 0.1) * width, 0.16 * width)
  const inner = sun + h / 2 + 6
  const outer = width / 2 - h / 2 - 4
  if (outer < inner) return null
  const maxRings = Math.floor((outer - inner) / (h + 4)) + 1

  for (let rings = 1; rings <= maxRings; rings += 1) {
    const radii = rings === 1 ? [(inner + outer) / 2] : Array.from({ length: rings }, (_, k) => inner + ((outer - inner) * k) / (rings - 1))
    const caps = radii.map((radius) => Math.floor((2 * Math.PI * radius) / gap))
    if (caps.reduce((sum, cap) => sum + cap, 0) < items.length) continue
    // Con varios anillos a distinta velocidad una luna podría rozar a la del anillo vecino: si no hay sitio para eso, los anillos giran juntos (misma velocidad y sentido), como un solo cuerpo, y nunca se acercan.
    const step = rings === 1 ? Infinity : (outer - inner) / (rings - 1)
    const need = mode.tier === 'packed' ? w : Math.hypot(w, h)
    return {
      groups: split(items, caps),
      radii: radii.map((radius) => (radius / width) * 100),
      moon: (d / width) * 100,
      core: ((sun / 0.36) / width) * 100,
      tier: mode.tier,
      rigid: step < need,
    }
  }
  return null
}

/**
 * Plan del sistema según cuántas lunas hay y cuánto mide en pantalla: hasta 6 en un anillo holgado; desde ahí se
 * prueba cada modo y cada tamaño de luna hasta que quepan todas sin pisarse. Si ni así, se apretan lo posible.
 */
function plan(items: OrbitItem[], width: number): Plan {
  const n = items.length
  const roomy: Plan = { groups: [items], radii: [34], moon: 18, core: 50, tier: 'roomy', rigid: false }
  if (n === 0) return roomy

  // El anillo holgado de siempre, si en este ancho cabe sin pisar el sol ni salirse.
  if (n <= 6) {
    const v = Math.max(0.18 * width, 52) * ART
    const w = Math.max(v, 0.24 * width)
    const h = v + 56
    const radius = 0.34 * width
    const gap = Math.max(w, h, Math.SQRT2 * Math.min(w, h))
    const fits =
      radius + h / 2 <= width / 2 - 4 &&
      radius - h / 2 >= 0.18 * width + 6 &&
      Math.floor((2 * Math.PI * radius) / gap) >= n
    if (fits) return roomy
  }

  for (const mode of MODES) {
    for (let d = Math.min(110, mode.from * width); d >= mode.min; d -= 4) {
      const found = fit(items, d, mode, width)
      if (found) return found
    }
  }

  const last = MODES[MODES.length - 1]
  const d = last.min
  const { h } = last.foot(d * ART, width)
  const sun = clamp(0.9 * d, 0.06 * width, 0.16 * width)
  const inner = sun + h / 2 + 6
  const outer = width / 2 - h / 2 - 4
  const rings = Math.max(1, Math.floor((outer - inner) / (h + 4)) + 1)
  const radii = Array.from({ length: rings }, (_, k) => (rings === 1 ? (inner + outer) / 2 : inner + ((outer - inner) * k) / (rings - 1)))
  const caps = radii.map((radius) => Math.max(1, Math.ceil(radius)))
  return {
    groups: split(items, caps),
    radii: radii.map((radius) => (radius / width) * 100),
    moon: (d / width) * 100,
    core: (sun / 0.36 / width) * 100,
    tier: 'packed',
    rigid: true,
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
export function OrbitSystem({ centerSeed, centerKind = 'planet', items, complete = false, emptyHint }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  // El plan depende del ancho en px: se mide antes de pintar y se vuelve a medir al redimensionar.
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    setWidth(node.getBoundingClientRect().width || DEFAULT_WIDTH)
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width) || DEFAULT_WIDTH))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Al apuntar, los anillos no se detienen: giran más despacio, para poder tocar una luna con calma.
  const rate = useRef(1)
  const frame = useRef(0)
  const slow = (target: number) => {
    cancelAnimationFrame(frame.current)
    const from = rate.current
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SLOW_MS)
      rate.current = from + (target - from) * t
      // `updatePlaybackRate` conserva la posición actual: no hay saltos al cambiar de velocidad.
      ref.current?.getAnimations({ subtree: true }).forEach((animation) => {
        if (animation instanceof CSSAnimation && animation.animationName === 'system-spin') {
          animation.updatePlaybackRate(rate.current)
        }
      })
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const { groups, radii, moon, core, tier, rigid } = plan(items, width)
  const arrivingKey = items.find((item) => item.arriving)?.key ?? null

  // El despertar (ondas desde el planeta) dura lo que dura la llegada: la pantalla limpia `arriving` sola.
  const awake = arrivingKey != null

  const empty = items.length === 0

  return (
    <div
      ref={ref}
      onPointerEnter={() => slow(SLOW_RATE)}
      onPointerLeave={() => slow(1)}
      onFocus={() => slow(SLOW_RATE)}
      onBlur={() => slow(1)}
      className={`system tier-${tier}${complete ? ' is-complete' : ''}${awake ? ' is-awake' : ''}${empty ? ' is-empty' : ''}`}
      style={{ ['--moon' as string]: `${moon}cqw`, ['--moon-min' as string]: tier === 'roomy' ? '52px' : '0px' }}
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
            ['--dur' as string]: `${RING_SECONDS[rigid ? 0 : ringIndex]}s`,
            ['--dir' as string]: rigid || ringIndex % 2 === 0 ? 'normal' : 'reverse',
            ['--dir-b' as string]: rigid || ringIndex % 2 === 0 ? 'reverse' : 'normal',
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
                  <button type="button" className="system-item-main scene-host" title={tier === 'packed' ? undefined : item.label} onClick={item.onClick}>
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
