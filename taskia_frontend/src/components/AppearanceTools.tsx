import { useEffect, useId, useRef, useState } from 'react'
import { Check, Palette } from '@phosphor-icons/react'
import { ACCENTS, useAccent } from '../accent'
import { useTheme } from '../theme'
import { IconButton } from './ui/IconButton'

function reduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AppearanceTools() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const { accent, setAccent } = useAccent()
  const colorLabelId = useId()
  const modeLabelId = useId()

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  function close() {
    if (reduceMotion()) {
      setOpen(false)
      setMounted(false)
      return
    }
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close()
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
      <IconButton
        icon={Palette}
        label="Apariencia"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (open) close()
          else setOpen(true)
        }}
      />
      {mounted ? (
        <div
          className={`appearance-popover${open ? '' : ' is-closing'}`}
          role="dialog"
          aria-label="Apariencia"
          onAnimationEnd={(event) => {
            if (event.target !== event.currentTarget) return
            if (event.animationName !== 'appearance-out') return
            setMounted(false)
          }}
        >
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
            <div className="appearance-mode-row segmented">
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
