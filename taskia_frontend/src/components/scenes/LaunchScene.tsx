import { useId } from 'react'
import { Draw, Spark } from './kit'
import { sv } from './sv'

/**
 * building: se arma la nave · ready: lista en la plataforma, temblando · ignition: motores a tope mientras
 * se valida el ingreso · liftoff: despega.
 */
export type LaunchPhase = 'building' | 'ready' | 'ignition' | 'liftoff'
export type DayPeriod = 'day' | 'night'

const RING = { rx: 50, ry: 12 }
const ORBIT = { rx: 64, ry: 18 }

function halves(rx: number, ry: number) {
  return {
    back: `M${-rx} 0 A${rx} ${ry} 0 0 1 ${rx} 0`,
    front: `M${-rx} 0 A${rx} ${ry} 0 0 0 ${rx} 0`,
  }
}

const ring = halves(RING.rx, RING.ry)
const orbit = halves(ORBIT.rx, ORBIT.ry)

function Moon() {
  return <circle r="6" className="fill-strong" />
}

function OrbitingMoon({ clip }: { clip: string }) {
  return (
    <g clipPath={`url(#${clip})`}>
      <g className="orbit-x" style={sv({ '--rx': `${ORBIT.rx}px`, '--dur': '10s' })}>
        <g className="orbit-y" style={sv({ '--ry': `${ORBIT.ry}px`, '--dur': '10s' })}>
          <Moon />
        </g>
      </g>
    </g>
  )
}

/** Sol de día (con rayos que giran) o luna creciente de noche. */
function Heavenly({ period }: { period: DayPeriod }) {
  if (period === 'night') {
    return (
      <g className="pop" style={sv({ '--i': 6 })}>
        <path d="M96 76 A26 26 0 1 0 96 124 A22 22 0 0 1 96 76Z" className="fill-star thin" />
        <Spark x={132} y={70} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3s' })} />
        <Spark x={58} y={140} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '3.6s', '--delay': '-1s' })} />
      </g>
    )
  }
  const rays = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2
    const x1 = 90 + Math.cos(angle) * 38
    const y1 = 100 + Math.sin(angle) * 38
    const x2 = 90 + Math.cos(angle) * 48
    const y2 = 100 + Math.sin(angle) * 48
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`
  })
  return (
    <g className="pop" style={sv({ '--i': 6 })}>
      <g className="spin" style={sv({ '--cx': '90px', '--cy': '100px', '--dur': '90s' })}>
        <path d={rays.join(' ')} className="thin acc" />
      </g>
      <circle cx="90" cy="100" r="26" className="fill-star" />
      <path d="M78 96 q6 -8 14 -6" className="thin dim" />
    </g>
  )
}

/**
 * Escena del login: un cohete en su plataforma, con torre, planeta con luna y un sol o una luna según la hora.
 * `phase` lo controla la pantalla: enciende motores mientras se valida y despega al entrar.
 */
export function LaunchScene({ phase, period }: { phase: LaunchPhase; period: DayPeriod }) {
  const uid = useId().replace(/:/g, '')
  const back = `${uid}-back`
  const front = `${uid}-front`

  return (
    <svg
      className="scene scene-launch"
      data-phase={phase}
      viewBox="0 0 480 440"
      aria-hidden
      focusable="false"
    >
      <defs>
        <clipPath id={back}>
          <rect x="-90" y="-60" width="180" height="60" />
        </clipPath>
        <clipPath id={front}>
          <rect x="-90" y="0" width="180" height="60" />
        </clipPath>
        <clipPath id={`${uid}-b1`}>
          <rect x="170" y="290" width="140" height="80" />
        </clipPath>
        <clipPath id={`${uid}-b2`}>
          <rect x="170" y="240" width="140" height="50" />
        </clipPath>
        <clipPath id={`${uid}-b3`}>
          <rect x="170" y="180" width="140" height="60" />
        </clipPath>
      </defs>

      {/* Cielo */}
      <Spark x={196} y={64} s={6} className="fill-star twinkle thin" style={sv({ '--dur': '3.2s' })} />
      <Spark x={300} y={40} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '2.8s', '--delay': '-1s' })} />
      <Spark x={440} y={230} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3.5s', '--delay': '-2s' })} />
      <Spark x={36} y={250} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3.1s', '--delay': '-.6s' })} />
      <Spark x={64} y={330} s={3.5} className="fill-star twinkle thin" style={sv({ '--dur': '2.7s', '--delay': '-1.4s' })} />
      <path d="M196 64 L240 36 L300 40" className="dashes thin dim fade" style={sv({ '--i': 8 })} />
      <Heavenly period={period} />

      {/* Planeta con anillo y luna */}
      <g transform="translate(385 130)">
        <g transform="rotate(-20)">
          <Draw d={orbit.back} i={5} className="dim" />
          <Draw d={ring.back} i={3} className="acc" />
          <g clipPath={`url(#${back})`}>
            <g className="orbit-x" style={sv({ '--rx': `${ORBIT.rx}px`, '--dur': '10s' })}>
              <g className="orbit-y" style={sv({ '--ry': `${ORBIT.ry}px`, '--dur': '10s' })}>
                <Moon />
              </g>
            </g>
          </g>
        </g>
        <circle r="30" className="fill draw pop" pathLength={1} style={sv({ '--i': 2 })} />
        <path d="M-28 -6 Q0 -16 28 -6 L28 6 Q0 -4 -28 6Z" className="fill-strong nostroke fade" style={sv({ '--i': 4 })} />
        <circle cx="-10" cy="-14" r="4" className="thin dim" />
        <circle cx="12" cy="14" r="5" className="thin dim" />
        <g transform="rotate(-20)">
          <Draw d={ring.front} i={3} className="acc" />
          <OrbitingMoon clip={front} />
        </g>
      </g>

      {/* Suelo */}
      <path d="M29 420 A400 400 0 0 1 451 420Z" className="fill draw pop" pathLength={1} style={sv({ '--i': 0 })} />
      <ellipse cx="96" cy="392" rx="16" ry="4.5" className="thin dim fade" style={sv({ '--i': 3 })} />
      <ellipse cx="376" cy="388" rx="22" ry="5.5" className="thin dim fade" style={sv({ '--i': 3 })} />
      <ellipse cx="316" cy="408" rx="12" ry="3.5" className="thin dim fade" style={sv({ '--i': 3 })} />

      {/* Torre de lanzamiento */}
      <Draw d="M130 360 V232 M158 360 V232 M130 232 H158" i={2} />
      <Draw d="M130 360 L158 328 L130 296 L158 264 L130 232" i={3} className="thin" />
      <circle cx="144" cy="222" r="4.5" className="acc-fill lc-beacon" />
      <g className="lc-arm">
        <Draw d="M158 276 H212" i={5} />
        <Draw d="M212 268 V284" i={5} />
      </g>

      {/* Plataforma */}
      <Draw d="M176 356 H304" i={4} />
      <Draw d="M190 356 V364 M290 356 V364" i={5} className="thin" />

      {/* Humo */}
      <g className="nostroke">
        <circle cx="206" cy="358" r="10" className="lc-puff fill nostroke" style={sv({ '--delay': '0s', '--dx': '-34px' })} />
        <circle cx="274" cy="358" r="12" className="lc-puff fill nostroke" style={sv({ '--delay': '-.4s', '--dx': '38px' })} />
        <circle cx="188" cy="362" r="8" className="lc-puff fill nostroke" style={sv({ '--delay': '-.8s', '--dx': '-56px' })} />
        <circle cx="294" cy="362" r="9" className="lc-puff fill nostroke" style={sv({ '--delay': '-1.2s', '--dx': '58px' })} />
      </g>

      {/* Cohete: se arma pieza por pieza (cada `--bd` es cuándo llega) */}
      <g className="lc-fly">
        <g className="lc-shake">
          <g className="lc-flame">
            <g className="flicker" style={sv({ '--dur': '.35s' })}>
              <path d="M226 354 C224 392 235 420 240 440 C245 420 256 392 254 354Z" className="fill-flame" />
            </g>
            <g className="flicker" style={sv({ '--dur': '.28s', '--delay': '-.1s' })}>
              <path d="M233 354 C232 380 237 398 240 410 C243 398 248 380 247 354Z" className="fill-star nostroke" />
            </g>
          </g>

          <g className="lc-build lc-build-nozzle" style={sv({ '--bd': '1s' })}>
            <path d="M224 340 L219 354 H261 L256 340Z" className="fill" />
          </g>
          <g className="lc-build lc-build-fin-l" style={sv({ '--bd': '1.25s' })}>
            <path d="M210 316 L184 352 H210Z" className="fill-accent" />
          </g>
          <g className="lc-build lc-build-fin-r" style={sv({ '--bd': '1.25s' })}>
            <path d="M270 316 L296 352 H270Z" className="fill-accent" />
          </g>

          <g className="lc-build" style={sv({ '--bd': '1.5s' })}>
            <g clipPath={`url(#${uid}-b1)`}>
              <path d="M240 190 C262 215 270 252 270 292 V340 H210 V292 C210 252 218 215 240 190Z" className="fill-surface" />
            </g>
          </g>
          <g className="lc-build" style={sv({ '--bd': '1.95s' })}>
            <g clipPath={`url(#${uid}-b2)`}>
              <path d="M240 190 C262 215 270 252 270 292 V340 H210 V292 C210 252 218 215 240 190Z" className="fill-surface" />
            </g>
          </g>
          <g className="lc-build" style={sv({ '--bd': '2.4s' })}>
            <g clipPath={`url(#${uid}-b3)`}>
              <path d="M240 190 C262 215 270 252 270 292 V340 H210 V292 C210 252 218 215 240 190Z" className="fill-surface" />
            </g>
          </g>
          <g className="lc-build" style={sv({ '--bd': '2.85s' })}>
            <path d="M240 190 C251 201 258 213 262 228 H218 C222 213 229 201 240 190Z" className="fill-accent" />
          </g>

          <g className="lc-late" style={sv({ '--bd': '3s' })}>
            <path d="M216 240 H264 M210 290 H270 M210 304 H270 M210 326 H270" className="thin dim" />
          </g>
          <g className="lc-build lc-build-pop" style={sv({ '--bd': '3.05s' })}>
            <circle cx="240" cy="264" r="16" className="fill-star" />
            <circle cx="240" cy="264" r="10" className="thin dim" />
            <path d="M231 258 q4 -6 11 -5" className="thin" style={sv({ stroke: 'var(--surface)' })} />
          </g>
          <g className="lc-late" style={sv({ '--bd': '3.25s' })}>
            <path d="M240 190 L240 173" className="thin" />
            <circle cx="240" cy="169" r="3.5" className="fill-star thin" />
          </g>

          {/* Soldaduras: chispazos cuando cada pieza encaja */}
          <g className="lc-welds">
            <Spark x={209} y={342} s={7} className="fill-star lc-weld thin" style={sv({ '--bd': '1.55s' })} />
            <Spark x={271} y={316} s={7} className="fill-star lc-weld thin" style={sv({ '--bd': '1.6s' })} />
            <Spark x={211} y={290} s={7} className="fill-star lc-weld thin" style={sv({ '--bd': '2s' })} />
            <Spark x={269} y={240} s={7} className="fill-star lc-weld thin" style={sv({ '--bd': '2.45s' })} />
            <Spark x={218} y={228} s={7} className="fill-star lc-weld thin" style={sv({ '--bd': '2.9s' })} />
          </g>
        </g>
      </g>
    </svg>
  )
}
