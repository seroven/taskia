import { useState } from 'react'

/** Muestras para elegir un color de un toque, por familias; el resto se escribe en hexadecimal. */
const COLOR_SWATCHES = [
  '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#be123c', '#fbcfe8', '#f472b6', '#db2777',
  '#fed7aa', '#fdba74', '#f97316', '#c2410c', '#fef08a', '#fde68a', '#fbbf24', '#f59e0b',
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#15803d', '#99f6e4', '#5eead4', '#0d9488',
  '#bae6fd', '#7dd3fc', '#38bdf8', '#3b82f6', '#1d4ed8', '#c7d2fe', '#a5b4fc', '#4338ca',
  '#e9d5ff', '#c4b5fd', '#a78bfa', '#8b5cf6', '#6d28d9', '#ffffff', '#e2e8f0', '#94a3b8',
  '#64748b', '#334155', '#1e293b', '#0f172a',
] as const

const HEX = /^#[0-9a-f]{6}$/i

/**
 * Selector de color con el estilo de la app (sin el del navegador): muestras y un campo hexadecimal. Acepta cualquier
 * color, también los muy oscuros: es decisión de quien lo usa. Con `swatches` se cambian las muestras.
 */
export function ColorPicker({
  label,
  value,
  onChange,
  swatches = COLOR_SWATCHES,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
  swatches?: readonly string[]
}) {
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? value
  return (
    <div className="ship-picker" role="group" aria-label={`Color de ${label}`}>
      <div className="ship-swatches">
        {swatches.map((hex) => (
          <button
            key={hex}
            type="button"
            className={`ship-swatch${hex.toLowerCase() === value.toLowerCase() ? ' is-selected' : ''}`}
            style={{ background: hex }}
            aria-label={hex}
            aria-pressed={hex.toLowerCase() === value.toLowerCase()}
            onClick={() => {
              setText(null)
              onChange(hex)
            }}
          />
        ))}
      </div>
      <label className="ship-hex">
        <i style={{ background: HEX.test(shown) ? shown : value }} />
        <span>Código</span>
        <input
          type="text"
          value={shown}
          onBlur={() => setText(null)}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!HEX.test(shown)}
          onChange={(event) => {
            const next = event.target.value.startsWith('#') ? event.target.value : `#${event.target.value}`
            setText(next)
            if (HEX.test(next)) onChange(next.toLowerCase())
          }}
        />
      </label>
    </div>
  )
}
