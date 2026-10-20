import { ShipRenderer } from '../ship/ShipRenderer'
import type { ShipConfig } from '../../lib/ship/types'
import { Spark } from './kit'
import { sv } from './sv'

/** La nave de la puerta: una de muestra, con cinco ventanillas encendidas. */
const HUB_SHIP: ShipConfig = {
  seed: 'hub',
  hull: 'bean',
  nose: 'cap',
  cockpit: 'bubble',
  wings: 'delta',
  tail: 'shark',
  engine: { kind: 'bell', count: 2, flame: 'classic' },
  top: 'antenna',
  belly: 'pod',
  decal: 'stripe',
  windows: 'round',
  palette: { hull: '#7dd3fc', trim: '#3b82f6', accent: '#fbbf24', glass: '#fef9c3' },
}

/**
 * Tripulación: una nave que flota entre estrellas. La nave va fuera del lienzo `.scene` porque ese CSS pone
 * `fill: none` a todo lo que lleva dentro y le borraría los colores.
 */
export function CrewScene() {
  return (
    <div className="scene-crew" aria-hidden>
      <svg className="scene scene-crew-sky" viewBox="0 0 240 200" focusable="false">
        <Spark x={30} y={44} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3.3s' })} />
        <Spark x={208} y={36} s={6} className="fill-star twinkle thin" style={sv({ '--dur': '2.9s', '--delay': '-1.2s' })} />
        <Spark x={200} y={168} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '3.7s', '--delay': '-2s' })} />
        <Spark x={38} y={160} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '3s', '--delay': '-.8s' })} />
        <Spark x={118} y={22} s={3.5} className="fill-star twinkle thin" style={sv({ '--dur': '4s', '--delay': '-2.6s' })} />
        <path d="M18 130 H46 M10 116 H30 M196 134 H226" className="thin dim" />
      </svg>
      <span className="scene-crew-ship">
        <ShipRenderer config={HUB_SHIP} crew={5} />
      </span>
    </div>
  )
}
