import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Spark } from './scenes/kit'
import { sv } from './scenes/sv'

export type SpaceLevel = 'high' | 'medium' | 'low' | 'none'

/** Pone data-space en <html> para que el fundido de apariencia incluya el cielo. */
export function useSpace(level: SpaceLevel) {
  useLayoutEffect(() => {
    document.documentElement.dataset.space = level
  }, [level])
}

const W = 1600
const H = 900

type Star = {
  x: number
  y: number
  s: number
  spark: boolean
  dur: number
  delay: number
  /** Deriva lenta: hasta dónde se desplaza, cuánto tarda y con qué desfase. */
  fx: number
  fy: number
  fdur: number
  fdelay: number
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Estrellas fijas (misma semilla siempre) con separación mínima entre sí y respecto a `avoid`. */
function scatter(count: number, minGap: number, sizes: [number, number], seed: number, drift: number, avoid: Star[] = []) {
  const rand = mulberry32(seed)
  const out: Star[] = []
  let guard = 0
  while (out.length < count && guard++ < 4000) {
    const x = rand() * W
    const y = rand() * H
    if ([...avoid, ...out].some((o) => Math.hypot(o.x - x, o.y - y) < minGap)) continue
    out.push({
      x,
      y,
      s: sizes[0] + rand() * (sizes[1] - sizes[0]),
      spark: rand() > 0.35,
      dur: 3 + rand() * 4,
      delay: -rand() * 7,
      fx: (rand() - 0.5) * 2 * drift,
      fy: (rand() - 0.5) * 2 * drift,
      fdur: 8 + rand() * 10,
      fdelay: -rand() * 18,
    })
  }
  return out
}

const KEY_GROUPS: [number, number][][] = [
  [[170, 150], [260, 108], [340, 160], [410, 118]],
  [[1240, 200], [1330, 148], [1424, 212]],
  [[1090, 744], [1176, 700], [1262, 764], [1346, 722]],
]

const NEAR = scatter(8, 220, [6, 9], 11, 12)
const MID = scatter(16, 130, [3.5, 6], 23, 9, NEAR)
const FAR = scatter(28, 80, [1.6, 3], 37, 6, [...NEAR, ...MID])

function starStyle(star: Star) {
  return sv({
    '--dur': `${star.dur}s`,
    '--delay': `${star.delay}s`,
    '--fx': `${star.fx.toFixed(1)}px`,
    '--fy': `${star.fy.toFixed(1)}px`,
    '--fdur': `${star.fdur.toFixed(1)}s`,
    '--fdelay': `${star.fdelay.toFixed(1)}s`,
  })
}

function StarField({ stars }: { stars: Star[] }) {
  return (
    <>
      {stars.map((star, index) =>
        star.spark ? (
          <Spark
            key={index}
            x={star.x}
            y={star.y}
            s={star.s}
            className="sky-star"
            style={starStyle(star)}
          />
        ) : (
          <circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.s * 0.35}
            className="sky-star"
            style={starStyle(star)}
          />
        ),
      )}
    </>
  )
}

type Shot = { x: number; y: number; angle: number }

/** Punto de entrada y pendiente al azar, siempre dentro del cielo visible y cayendo hacia abajo a la izquierda. */
function randomShot(): Shot {
  return {
    x: 700 + Math.random() * 800,
    y: 50 + Math.random() * 380,
    angle: 16 + Math.random() * 20,
  }
}

/**
 * Estrella fugaz. La animación solo la muestra el último ~3,5 % de cada ciclo; al reiniciarse
 * (`animationiteration`, con la estrella oculta) cambia de lugar, así cada pasada nace en otro punto.
 */
function ShootingStar({ dur, delay }: { dur: number; delay: number }) {
  const [shot, setShot] = useState(randomShot)
  return (
    <g transform={`translate(${shot.x.toFixed(0)} ${shot.y.toFixed(0)}) rotate(${(-shot.angle).toFixed(1)})`}>
      <path
        className="sky-shoot"
        d="M0 0 L-150 0"
        style={sv({ '--dur': `${dur}s`, '--delay': `${delay}s` })}
        onAnimationIteration={() => setShot(randomShot())}
      />
    </g>
  )
}

export function SpaceSky() {
  const rootRef = useRef<HTMLDivElement>(null)

  /** Parallax leve con el puntero, solo si el sistema no pide menos movimiento. */
  useEffect(() => {
    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    function onMove(event: PointerEvent) {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        root?.style.setProperty('--sky-x', String((event.clientX / window.innerWidth - 0.5) * -2))
        root?.style.setProperty('--sky-y', String((event.clientY / window.innerHeight - 0.5) * -2))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="space-sky" ref={rootRef} aria-hidden>
      <div className="space-sky-glow space-sky-glow-a" />
      <div className="space-sky-glow space-sky-glow-b" />
      <div className="space-sky-glow space-sky-glow-sun" />
      <svg
        className="space-sky-lines"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="sky-tail" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="-150" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="1" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        <g className="space-sky-layer" data-depth="far">
          <StarField stars={FAR} />
        </g>

        <g className="space-sky-layer" data-depth="mid">
          <StarField stars={MID} />
          <path className="sky-orbit" d="M-40 780 A300 90 -20 0 1 330 910" />
        </g>

        <g className="space-sky-layer" data-depth="near">
          <StarField stars={NEAR} />
          {KEY_GROUPS.map((group, index) => (
            <g
              key={index}
              className="sky-drift"
              style={sv({ '--fx': `${index % 2 ? -7 : 7}px`, '--fy': `${index === 1 ? 6 : -6}px`, '--fdur': `${15 + index * 4}s`, '--fdelay': `${-index * 5}s` })}
            >
              <path className="sky-link" d={`M${group.map(([x, y]) => `${x} ${y}`).join(' L')}`} />
              {group.map(([x, y], i) => (
                <Spark
                  key={i}
                  x={x}
                  y={y}
                  s={i % 2 ? 8 : 6}
                  className="sky-star sky-star-key"
                  style={sv({ '--dur': `${3.4 + i * 0.7}s`, '--delay': `${-i * 1.3}s` })}
                />
              ))}
            </g>
          ))}
          <ShootingStar dur={29} delay={-6} />
          <ShootingStar dur={41} delay={-27} />
        </g>
      </svg>
    </div>
  )
}
