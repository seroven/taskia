import { useMemo, useState } from 'react'
import { ShipRenderer } from '../components/ship/ShipRenderer'
import { HULLS, SHIP_OPTIONS, randomShip, type ShipConfig } from '../lib/ship/types'

/** Solo dev: `?lab=ships` muestra naves al azar y una por casco con todas sus piezas, para revisar que encajen. */
export function ShipLab() {
  const [crew, setCrew] = useState(6)
  const [offset, setOffset] = useState(0)
  const samples = useMemo(() => Array.from({ length: 24 }, (_, i) => randomShip(`lab-${offset}-${i}`)), [offset])
  const hulls = useMemo(
    () => HULLS.map((hull): ShipConfig => ({ ...randomShip(`hull-${hull}`), hull, nose: 'cap', cockpit: 'bubble', wings: 'delta', tail: 'shark', top: 'antenna', belly: 'pod', decal: 'stripe' })),
    [],
  )
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 28px 64px', background: 'var(--bg)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Naves ({SHIP_OPTIONS.hull.length} cascos)</h2>
      <label>
        Tripulantes: {crew}{' '}
        <input type="range" min={0} max={10} value={crew} onChange={(e) => setCrew(Number(e.target.value))} />
      </label>{' '}
      <button type="button" onClick={() => setOffset((n) => n + 1)}>
        Otras 24
      </button>
      <h3>Un casco con todas las piezas</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {hulls.map((config) => (
          <ShipRenderer key={config.hull} config={config} crew={crew} label={config.hull} />
        ))}
      </div>
      <h3>Al azar</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {samples.map((config) => (
          <ShipRenderer key={config.seed} config={config} crew={crew} label={config.seed} />
        ))}
      </div>
    </div>
  )
}
