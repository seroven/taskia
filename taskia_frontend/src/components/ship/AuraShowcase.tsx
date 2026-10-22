import { useEffect, useRef, type ReactNode } from 'react'
import { AURA_LOOK, type GlKind } from '../../lib/ship/auraGl'
import { createAuraLayer } from '../../lib/ship/auraLayer'

/** Qué fracción del ancho de su cuadro ocupa la nave de cada muestra: el aura (1,5 veces) cabe dentro del cuadro. */
const SHIP_SHARE = 0.58

/**
 * Un lienzo WebGL compartido para varias muestras de aura (el selector del editor): cada hijo con `data-aura="id"`
 * recibe esa aura detrás, centrada en él. Los hijos que deban quedar por encima del aura (la nave) llevan
 * `position: relative; z-index: 2` (ver `.aura-showcase` en `ship.css`). Vuelve a colocarlas cuando cambia `signature`
 * (por ejemplo, el orden de las muestras).
 */
export function AuraShowcase({ signature, children }: { signature: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = box.current
    const cv = canvas.current
    if (!el || !cv) return
    const layer = createAuraLayer(cv, cv)
    if (!layer) return
    layer.setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const place = () => {
      const origin = el.getBoundingClientRect()
      layer.items.length = 0
      el.querySelectorAll<HTMLElement>('[data-aura]').forEach((node, index) => {
        const look = AURA_LOOK[node.dataset.aura as GlKind]
        if (!look) return
        const r = node.getBoundingClientRect()
        const width = r.width * SHIP_SHARE
        const height = width * 0.45
        layer.items.push({
          kind: node.dataset.aura as GlKind,
          rect: { left: r.left - origin.left + (r.width - width) / 2, top: r.top - origin.top + (r.height - height) / 2, width, height },
          a: look.a,
          b: look.b,
          c: look.c,
          seed: 3 + (index % 5),
        })
      })
      layer.render()
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(el)
    observer.observe(cv)
    return () => {
      observer.disconnect()
      layer.dispose()
    }
  }, [signature])

  return (
    <div ref={box} className="aura-showcase">
      <canvas ref={canvas} className="aura-showcase-canvas" aria-hidden />
      {children}
    </div>
  )
}
