import { useId } from 'react'
import { Draw, Spark } from './kit'
import { sv } from './sv'

const RING = { rx: 74, ry: 18 }
const ORBIT = { rx: 104, ry: 30 }

function halves(rx: number, ry: number) {
  return {
    back: `M${-rx} 0 A${rx} ${ry} 0 0 1 ${rx} 0`,
    front: `M${-rx} 0 A${rx} ${ry} 0 0 0 ${rx} 0`,
  }
}

const ring = halves(RING.rx, RING.ry)
const innerRing = halves(RING.rx - 12, RING.ry - 4)
const orbit = halves(ORBIT.rx, ORBIT.ry)

function Moon() {
  return (
    <g>
      <circle r="8" className="fill-strong" />
      <circle cx="-2.5" cy="-2" r="2" className="thin dim" />
    </g>
  )
}

/** Luna que rodea al planeta: la mitad trasera de la órbita queda detrás y la delantera, delante. */
function OrbitingMoon({ clip }: { clip: string }) {
  return (
    <g clipPath={`url(#${clip})`}>
      <g className="orbit-x" style={sv({ '--rx': `${ORBIT.rx}px`, '--dur': '9s' })}>
        <g className="orbit-y" style={sv({ '--ry': `${ORBIT.ry}px`, '--dur': '9s' })}>
          <Moon />
        </g>
      </g>
    </g>
  )
}

/** Mundos: planeta con anillos, órbita punteada y una luna. */
export function WorldsScene() {
  const uid = useId().replace(/:/g, '')
  const body = `${uid}-body`
  const back = `${uid}-back`
  const front = `${uid}-front`

  return (
    <svg className="scene scene-worlds" viewBox="0 0 240 200" aria-hidden focusable="false">
      <defs>
        <clipPath id={body}>
          <circle cx="120" cy="104" r="42" />
        </clipPath>
        <clipPath id={back}>
          <rect x="-130" y="-70" width="260" height="70" />
        </clipPath>
        <clipPath id={front}>
          <rect x="-130" y="0" width="260" height="70" />
        </clipPath>
      </defs>

      {/* Fondo: constelaciones */}
      <g className="thin dim">
        <path d="M34 48 L56 30 L80 40" className="dashes fade" style={sv({ '--i': 8 })} />
        <path d="M190 156 L208 140 L224 154" className="dashes fade" style={sv({ '--i': 9 })} />
      </g>
      <Spark x={34} y={48} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3.4s' })} />
      <Spark x={56} y={30} s={7} className="fill-star twinkle thin" style={sv({ '--dur': '2.8s', '--delay': '-1s' })} />
      <Spark x={80} y={40} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '3.8s', '--delay': '-2s' })} />
      <Spark x={190} y={156} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '3.1s', '--delay': '-.5s' })} />
      <Spark x={208} y={140} s={6} className="fill-star twinkle thin" style={sv({ '--dur': '3.6s', '--delay': '-1.6s' })} />
      <Spark x={224} y={154} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '2.9s', '--delay': '-2.4s' })} />

      {/* Planeta pequeño */}
      <g className="pop" style={sv({ '--i': 7 })}>
        <circle cx="204" cy="56" r="11" className="fill-star thin" />
        <path d="M188 60 A18 5 -20 0 0 220 52" className="thin acc" />
      </g>
      <circle cx="30" cy="150" r="5" className="acc-fill pop" style={sv({ '--i': 7 })} />

      <g className="hov-lift">
        <g transform="translate(120 104) rotate(-18)">
          {/* Mitad trasera: anillo y órbita, luna al fondo */}
          <path d={orbit.back} className="dots dim fade" style={sv({ '--i': 5 })} />
          <Draw d={ring.back} i={2} className="acc" />
          <Draw d={innerRing.back} i={3} className="acc thin dim" />
          <g clipPath={`url(#${back})`}>
            <g className="orbit-x" style={sv({ '--rx': `${ORBIT.rx}px`, '--dur': '9s' })}>
              <g className="orbit-y" style={sv({ '--ry': `${ORBIT.ry}px`, '--dur': '9s' })}>
                <Moon />
              </g>
            </g>
          </g>
        </g>

        {/* Cuerpo */}
        <circle cx="120" cy="104" r="42" className="fill draw pop" pathLength={1} style={sv({ '--i': 0 })} />
        <g clipPath={`url(#${body})`}>
          <path d="M70 94 Q120 82 170 94 L170 108 Q120 120 70 108 Z" className="fill-strong nostroke fade" style={sv({ '--i': 2 })} />
          <Draw d="M70 94 Q120 82 170 94" i={2} className="thin dim" />
          <Draw d="M70 108 Q120 120 170 108" i={3} className="thin dim" />
          <Draw d="M74 128 Q120 138 166 128" i={4} className="thin dim" />
          <circle cx="102" cy="78" r="5" className="thin dim fade" style={sv({ '--i': 4 })} />
          <circle cx="140" cy="124" r="6" className="thin dim fade" style={sv({ '--i': 5 })} />
          <circle cx="136" cy="80" r="3" className="thin dim fade" style={sv({ '--i': 5 })} />
        </g>
        <Draw d="M90 80 A34 34 0 0 1 108 68" i={4} className="thin dim" />

        <g transform="translate(120 104) rotate(-18)">
          {/* Mitad delantera */}
          <Draw d={ring.front} i={2} className="acc" />
          <Draw d={innerRing.front} i={3} className="acc thin dim" />
          <path d={orbit.front} className="dots dim fade" style={sv({ '--i': 5 })} />
          <OrbitingMoon clip={front} />
        </g>

        <Spark x={178} y={74} s={6} className="fill-star hov-in thin" />
        <Spark x={62} y={138} s={5} className="fill-star hov-in thin" />
        <Spark x={168} y={146} s={4} className="fill-star hov-in thin" />
      </g>
    </svg>
  )
}
