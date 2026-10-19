import { useState } from 'react'
import { ACCENTS, useAccent } from '../accent'
import { CampScene } from '../components/scenes/CampScene'
import { CrewScene } from '../components/scenes/CrewScene'
import { WorldsScene } from '../components/scenes/WorldsScene'
import { useTheme } from '../theme'

const SIZES = [
  { id: 'hub', label: 'Hub (280)', px: 280 },
  { id: 'small', label: 'Pequeño (180)', px: 180 },
] as const

/** Banco de pruebas de las escenas de línea. Solo en desarrollo: `?lab=scenes`. */
export function SceneLab() {
  const { theme, setTheme } = useTheme()
  const { accent, setAccent } = useAccent()
  const [run, setRun] = useState(0)
  const [size, setSize] = useState<(typeof SIZES)[number]['px']>(280)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 28px 48px' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22 }}>Escenas de línea</h1>
        <button type="button" className="ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? 'Pasar a noche' : 'Pasar a día'}
        </button>
        <button type="button" className="ghost" onClick={() => setRun((n) => n + 1)}>
          Repetir entrada
        </button>
        {SIZES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.px === size ? 'primary' : 'ghost'}
            onClick={() => setSize(option.px)}
          >
            {option.label}
          </button>
        ))}
        <span style={{ display: 'inline-flex', gap: 6 }}>
          {ACCENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={item.id === accent}
              onClick={() => setAccent(item.id)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                border: item.id === accent ? '3px solid var(--text)' : '2px solid var(--border)',
                background: theme === 'dark' ? item.swatchDark : item.swatch,
                cursor: 'pointer',
              }}
            />
          ))}
        </span>
      </header>

      <div key={run} style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 56px', justifyContent: 'center' }}>
        {[
          { title: 'Mundos', sub: 'Temas, misiones y desafíos', scene: <WorldsScene /> },
          { title: 'Campamento', sub: 'Tareas del día', scene: <CampScene /> },
          { title: 'Tripulación', sub: 'Pronto', scene: <CrewScene /> },
        ].map((item) => (
          <button
            key={item.title}
            type="button"
            className="scene-host"
            style={{
              width: size,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: 8,
              border: 0,
              background: 'transparent',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            {item.scene}
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 650 }}>{item.title}</span>
            <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>{item.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
