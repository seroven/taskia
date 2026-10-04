import { useMemo, useState } from 'react'
import { PlanetRenderer } from './PlanetRenderer'
import {
  BODY_TYPES,
  generateFromSeed,
  planetFingerprint,
  sanitizePlanetConfig,
  type PlanetConfig,
} from '../../lib/planet/engine'

export function PlanetLab({ onClose }: { onClose: () => void }) {
  const samples = useMemo(
    () => Array.from({ length: 12 }, (_, i) => generateFromSeed(`lab-${i + 1}`)),
    [],
  )
  const [current, setCurrent] = useState<PlanetConfig>(samples[0]!)
  const [copied, setCopied] = useState(false)
  const same = samples.filter((item) => planetFingerprint(item) === planetFingerprint(current)).length

  return (
    <div className="planet-lab">
      <header>
        <h2>Laboratorio de planetas</h2>
        <button type="button" className="ghost" onClick={onClose}>
          Cerrar
        </button>
      </header>
      <div className="planet-lab-grid">
        {samples.map((config) => (
          <button key={config.seed} type="button" onClick={() => setCurrent(config)}>
            <PlanetRenderer config={config} size={72} animate={false} />
          </button>
        ))}
      </div>
      <div className="planet-lab-edit">
        <PlanetRenderer config={current} size={160} />
        <label>
          Tamaño
          <input
            type="range"
            min={0.8}
            max={1.3}
            step={0.05}
            value={current.size}
            onChange={(event) => setCurrent({ ...current, size: Number(event.target.value) })}
          />
        </label>
        <label>
          Cuerpo
          <select
            value={current.bodyType}
            onChange={(event) =>
              setCurrent(
                sanitizePlanetConfig({ ...current, bodyType: event.target.value }, current.seed),
              )
            }
          >
            {BODY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <p>Huella: {planetFingerprint(current)}</p>
        <p>Iguales en esta grilla: {same}</p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(JSON.stringify(current, null, 2))
            setCopied(true)
          }}
        >
          {copied ? 'JSON copiado' : 'Copiar JSON'}
        </button>
      </div>
    </div>
  )
}
