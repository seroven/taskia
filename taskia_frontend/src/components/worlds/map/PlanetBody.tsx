import { useId, useMemo } from 'react'
import { mulberry32 } from '../../../lib/seed'
import { Draw } from '../../scenes/kit'
import { sv } from '../../scenes/sv'

const CX = 100
const CY = 100
const R = 52

type Spec = {
  bands: { y: number; amp: number; strong: boolean }[]
  ring: { tilt: number; rx: number; ry: number } | null
}

/** Todo sale de la semilla: el mismo planeta se dibuja siempre igual. */
function planetSpec(seed: number): Spec {
  const rand = mulberry32(seed)
  rand() // tono
  const bandCount = 1 + Math.floor(rand() * 2)
  const bands = Array.from({ length: bandCount }, (_, index) => ({
    y: 70 + index * 26 + rand() * 10,
    amp: 6 + rand() * 8,
    strong: index === 0,
  }))
  const ring =
    rand() > 0.5 ? { tilt: -(10 + rand() * 30), rx: 74 + rand() * 14, ry: 14 + rand() * 8 } : null
  return { bands, ring }
}

function halves(rx: number, ry: number) {
  return {
    back: `M${-rx} 0 A${rx} ${ry} 0 0 1 ${rx} 0`,
    front: `M${-rx} 0 A${rx} ${ry} 0 0 0 ${rx} 0`,
  }
}

/** Disco menos otro desplazado hacia arriba a la izquierda: queda la media luna de sombra abajo a la derecha. */
const SHADE =
  'M48 100 a52 52 0 1 0 104 0 a52 52 0 1 0 -104 0Z M38 90 a52 52 0 1 0 104 0 a52 52 0 1 0 -104 0Z'

/**
 * Cuerpo de un planeta de línea en un recuadro de 200 × 200 (radio 52 al centro). Se queda con pocas piezas y
 * cada una significa algo: el disco, una o dos franjas de color (como las nubes de un gigante gaseoso), una
 * media luna de sombra que le da volumen, un destello de luz y, en algunos, un anillo. Solo el dibujo (un
 * `<g>`), sin `<svg>`: lo usan el planeta suelto y los mini sistemas de la lista.
 */
export function PlanetBody({ seed, animate = true }: { seed: number; animate?: boolean }) {
  const uid = useId().replace(/:/g, '')
  const spec = useMemo(() => planetSpec(seed), [seed])
  const body = `${uid}-body`
  const ring = spec.ring ? halves(spec.ring.rx, spec.ring.ry) : null
  const i = animate ? 0 : -20

  return (
    <g>
      <defs>
        <clipPath id={body}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>

      {spec.ring && ring ? (
        <g transform={`translate(${CX} ${CY}) rotate(${spec.ring.tilt.toFixed(1)})`}>
          <Draw d={ring.back} i={i + 2} className="acc" />
        </g>
      ) : null}

      <circle cx={CX} cy={CY} r={R} className="fill draw pop" pathLength={1} style={sv({ '--i': i })} />
      <g clipPath={`url(#${body})`}>
        {spec.bands.map((band, index) => {
          const y = band.y.toFixed(1)
          const lower = (band.y + 13).toFixed(1)
          return (
            <path
              key={index}
              d={`M${CX - R} ${y} Q${CX} ${(band.y - band.amp).toFixed(1)} ${CX + R} ${y} L${CX + R} ${lower} Q${CX} ${(band.y + 13 - band.amp).toFixed(1)} ${CX - R} ${lower}Z`}
              className="fill-strong nostroke"
              style={{ opacity: band.strong ? 1 : 0.55 }}
            />
          )
        })}
        <path d={SHADE} fillRule="evenodd" className="planet-shade" />
      </g>
      <Draw d="M72 76 A38 38 0 0 1 92 60" i={i + 3} className="thin dim" />

      {spec.ring && ring ? (
        <g transform={`translate(${CX} ${CY}) rotate(${spec.ring.tilt.toFixed(1)})`}>
          <Draw d={ring.front} i={i + 2} className="acc" />
        </g>
      ) : null}
    </g>
  )
}
