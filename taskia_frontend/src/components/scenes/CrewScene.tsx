import { Draw, Spark } from './kit'
import { sv } from './sv'

const LIGHTS = [
  { x: 155, y: 65, delay: '0s' },
  { x: 155, y: 135, delay: '-1s' },
  { x: 85, y: 135, delay: '-2s' },
  { x: 85, y: 65, delay: '-3s' },
]

/** Tripulación: estación con un panel solar aún por instalar (el módulo está «Pronto»). */
export function CrewScene() {
  return (
    <svg className="scene scene-crew" viewBox="0 0 240 200" aria-hidden focusable="false">
      <Spark x={32} y={44} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3.3s' })} />
      <Spark x={206} y={38} s={6} className="fill-star twinkle thin" style={sv({ '--dur': '2.9s', '--delay': '-1.2s' })} />
      <Spark x={196} y={166} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '3.7s', '--delay': '-2s' })} />
      <Spark x={40} y={164} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '3s', '--delay': '-.8s' })} />

      {/* Estructura */}
      <Draw d="M62 100 L100 100" i={3} />
      <Draw d="M140 100 L178 100" i={3} />

      {/* Panel instalado */}
      <rect x="18" y="80" width="44" height="40" rx="4" className="fill-strong draw pop" pathLength={1} style={sv({ '--i': 1 })} />
      <Draw d="M33 80 L33 120 M48 80 L48 120 M18 100 L62 100" i={4} className="thin dim" />

      {/* Panel pendiente */}
      <rect x="178" y="80" width="44" height="40" rx="4" className="dashes breathe" style={sv({ '--dur': '3.6s' })} />
      <path d="M193 80 L193 120 M208 80 L208 120 M178 100 L222 100" className="dashes thin dim" />

      {/* Rueda */}
      <g className="spin" style={sv({ '--cx': '120px', '--cy': '100px', '--dur': '70s' })}>
        <circle cx="120" cy="100" r="49.5" className="fade" style={sv({ '--i': 2, stroke: 'var(--scene-fill)', strokeWidth: 9 })} />
        <circle cx="120" cy="100" r="54" pathLength={1} className="draw" style={sv({ '--i': 2 })} />
        <circle cx="120" cy="100" r="45" pathLength={1} className="draw" style={sv({ '--i': 3 })} />
        <Draw d="M120 55 L120 80 M120 120 L120 145 M75 100 L100 100 M140 100 L165 100" i={5} />
        {LIGHTS.map((light) => (
          <circle
            key={light.delay}
            cx={light.x}
            cy={light.y}
            r="2.8"
            className="acc-fill breathe"
            style={sv({ '--dur': '4s', '--delay': light.delay })}
          />
        ))}
      </g>

      {/* Núcleo */}
      <circle cx="120" cy="100" r="26" className="acc thin ping" style={sv({ '--delay': '0s' })} />
      <circle cx="120" cy="100" r="20" className="fill-strong draw pop" pathLength={1} style={sv({ '--i': 4 })} />
      <circle cx="120" cy="100" r="7" className="acc-fill breathe" style={sv({ '--dur': '2.4s' })} />
    </svg>
  )
}
