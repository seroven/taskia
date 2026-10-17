import { useEffect, useId, useRef, useState } from 'react'
import { Check, Palette } from '@phosphor-icons/react'
import { ACCENTS, useAccent } from '../accent'
import { useTheme } from '../theme'

export function AppearanceTools() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const { accent, setAccent } = useAccent()
  const colorLabelId = useId()
  const modeLabelId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div className="appearance" ref={rootRef}>
      <button
        type="button"
        className="session-icon-btn"
        aria-label="Apariencia"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Palette size={22} weight="bold" />
      </button>
      {open ? (
        <div className="appearance-popover" role="dialog" aria-label="Apariencia">
          <div
            className="appearance-swatches"
            role="radiogroup"
            aria-labelledby={colorLabelId}
          >
            <span id={colorLabelId} className="appearance-label">
              Color
            </span>
            <div className="appearance-swatch-row">
              {ACCENTS.map((item) => {
                const selected = accent === item.id
                const night = theme === 'dark'
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={item.label}
                    className={`appearance-swatch${selected ? ' is-selected' : ''}`}
                    style={{
                      background: night ? item.swatchDark : item.swatch,
                      color: night ? item.markDark : item.mark,
                    }}
                    onClick={() => setAccent(item.id)}
                  >
                    {selected ? <Check size={16} weight="bold" aria-hidden /> : null}
                  </button>
                )
              })}
            </div>
          </div>
          <div
            className="appearance-mode"
            role="radiogroup"
            aria-labelledby={modeLabelId}
          >
            <span id={modeLabelId} className="appearance-label">
              Modo
            </span>
            <div className="appearance-mode-row">
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                Día
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                Noche
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
