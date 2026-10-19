import { useEffect, useLayoutEffect, useRef } from 'react'
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

type Star = { x: number; y: number; s: number; spark: boolean; dur: number; delay: number }

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
function scatter(count: number, minGap: number, sizes: [number, number], seed: number, avoid: Star[] = []) {
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
    })
  }
  return out
}

const KEY_GROUPS: [number, number][][] = [
  [[170, 150], [260, 108], [340, 160], [410, 118]],
  [[1240, 200], [1330, 148], [1424, 212]],
  [[1090, 744], [1176, 700], [1262, 764], [1346, 722]],
]

const NEAR = scatter(8, 220, [6, 9], 11)
const MID = scatter(16, 130, [3.5, 6], 23, NEAR)
const FAR = scatter(28, 80, [1.6, 3], 37, [...NEAR, ...MID])

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
            style={sv({ '--dur': `${star.dur}s`, '--delay': `${star.delay}s` })}
          />
        ) : (
          <circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.s * 0.35}
            className="sky-star"
            style={sv({ '--dur': `${star.dur}s`, '--delay': `${star.delay}s` })}
          />
        ),
      )}
    </>
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
      <svg
        className="space-sky-lines"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
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
            <g key={index}>
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
          <g opacity="0.7">
            <circle cx="1530" cy="780" r="96" />
            <path d="M1400 800 A150 34 -18 0 0 1650 740" />
            <path d="M1420 770 A130 28 -18 0 1 1640 720" opacity="0.5" />
          </g>
          <g transform="translate(1180 90)">
            <path className="sky-shoot" d="M0 0 L-120 42" style={sv({ '--dur': '38s', '--delay': '-6s' })} />
          </g>
          <g transform="translate(520 60)">
            <path className="sky-shoot" d="M0 0 L-110 38" style={sv({ '--dur': '47s', '--delay': '-27s' })} />
          </g>
        </g>
      </svg>
    </div>
  )
}
