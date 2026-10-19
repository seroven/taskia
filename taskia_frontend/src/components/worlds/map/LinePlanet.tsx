import { useId, useMemo } from 'react'
import { mulberry32 } from '../../../lib/seed'
import { Draw, Spark } from '../../scenes/kit'
import { sv } from '../../scenes/sv'

const CX = 100
const CY = 100
const R = 52

type Spec = {
  tone: number
  bands: { y: number; amp: number; fillStripe: boolean }[]
  craters: { x: number; y: number; r: number }[]
  ring: { tilt: number; rx: number; ry: number } | null
  sparks: { x: number; y: number; s: number }[]
}

/** Todo sale de la semilla: el mismo mundo se dibuja siempre igual. */
function planetSpec(seed: number): Spec {
  const rand = mulberry32(seed)
  const tone = Math.floor(rand() * 5)
  const bandCount = 1 + Math.floor(rand() * 3)
  const bands = Array.from({ length: bandCount }, (_, index) => ({
    y: 72 + index * 22 + rand() * 10,
    amp: 6 + rand() * 8,
    fillStripe: index === 0,
  }))
  const craterCount = 2 + Math.floor(rand() * 3)
  const craters = Array.from({ length: craterCount }, () => {
    const angle = rand() * Math.PI * 2
    const dist = rand() * 32
    return { x: CX + Math.cos(angle) * dist, y: CY + Math.sin(angle) * dist, r: 3 + rand() * 5 }
  })
  const ring =
    rand() > 0.5 ? { tilt: -(10 + rand() * 30), rx: 74 + rand() * 14, ry: 14 + rand() * 8 } : null
  const sparks = Array.from({ length: 2 }, (_, index) => ({
    x: index === 0 ? 24 + rand() * 20 : 150 + rand() * 30,
    y: index === 0 ? 30 + rand() * 20 : 150 + rand() * 22,
    s: 4 + rand() * 3,
  }))
  return { tone, bands, craters, ring, sparks }
}

function halves(rx: number, ry: number) {
  return {
    back: `M${-rx} 0 A${rx} ${ry} 0 0 1 ${rx} 0`,
    front: `M${-rx} 0 A${rx} ${ry} 0 0 0 ${rx} 0`,
  }
}

type Props = {
  seed: number
  /** Ancho (px o cualquier unidad CSS); el alto es el mismo. */
  size?: number | string
  /** Dibuja la entrada (trazos que se arman). Apágala en listas largas. */
  animate?: boolean
  className?: string
}

/**
 * Planeta de línea generado a partir de una semilla (el id del mundo o del curso): tono, bandas,
 * cráteres y anillo cambian de uno a otro. Responde al hover del contenedor `.scene-host`.
 */
export function LinePlanet({ seed, size = 160, animate = true, className = '' }: Props) {
  const uid = useId().replace(/:/g, '')
  const spec = useMemo(() => planetSpec(seed), [seed])
  const body = `${uid}-body`
  const ring = spec.ring ? halves(spec.ring.rx, spec.ring.ry) : null
  const i = animate ? 0 : -20

  return (
    <svg
      className={`scene line-planet tone-${spec.tone}${animate ? '' : ' no-intro'} ${className}`.trim()}
      viewBox="0 0 200 200"
      style={{ width: size, height: size }}
      aria-hidden
      focusable="false"
    >
      <defs>
        <clipPath id={body}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>

      <g className="hov-lift">
        {spec.ring && ring ? (
          <g transform={`translate(${CX} ${CY}) rotate(${spec.ring.tilt.toFixed(1)})`}>
            <Draw d={ring.back} i={i + 2} className="acc" />
          </g>
        ) : null}

        <circle cx={CX} cy={CY} r={R} className="fill draw pop" pathLength={1} style={sv({ '--i': i })} />
        <g clipPath={`url(#${body})`}>
          {spec.bands.map((band, index) => {
            const left = `M${CX - R} ${band.y.toFixed(1)}`
            const mid = `Q${CX} ${(band.y - band.amp).toFixed(1)} ${CX + R} ${band.y.toFixed(1)}`
            return (
              <g key={index}>
                {band.fillStripe ? (
                  <path
                    d={`${left} ${mid} L${CX + R} ${(band.y + 12).toFixed(1)} Q${CX} ${(band.y + 12 - band.amp).toFixed(1)} ${CX - R} ${(band.y + 12).toFixed(1)}Z`}
                    className="fill-strong nostroke"
                  />
                ) : null}
                <path d={`${left} ${mid}`} className="thin dim" />
              </g>
            )
          })}
          {spec.craters.map((crater, index) => (
            <circle key={index} cx={crater.x} cy={crater.y} r={crater.r} className="thin dim" />
          ))}
        </g>
        <Draw d="M72 76 A38 38 0 0 1 92 60" i={i + 3} className="thin dim" />

        {spec.ring && ring ? (
          <g transform={`translate(${CX} ${CY}) rotate(${spec.ring.tilt.toFixed(1)})`}>
            <Draw d={ring.front} i={i + 2} className="acc" />
          </g>
        ) : null}

        {spec.sparks.map((spark, index) => (
          <Spark
            key={index}
            x={spark.x}
            y={spark.y}
            s={spark.s}
            className="fill-star twinkle thin"
            style={sv({ '--dur': `${3 + index}s`, '--delay': `${-index * 1.3}s` })}
          />
        ))}
      </g>
    </svg>
  )
}
