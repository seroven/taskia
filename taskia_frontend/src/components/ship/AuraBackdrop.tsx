import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AURA_LOOK, type GlKind } from '../../lib/ship/auraGl'
import { createAuraLayer } from '../../lib/ship/auraLayer'

/**
 * Pone el aura de una nave detrás de lo que envuelve (la vista previa del editor, la ficha). Lleva su propio
 * lienzo WebGL; la galaxia, que tiene muchas naves, comparte uno solo (ver `GalaxyUniverse`).
 */
export function AuraBackdrop({ aura, className, children }: { aura: GlKind | null | undefined; className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  /** Al cambiar de aura (no al abrir) la nueva aparece con un golpe de escala y luz. */
  const [pop, setPop] = useState(false)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setPop(true)
    const timer = window.setTimeout(() => setPop(false), 900)
    return () => window.clearTimeout(timer)
  }, [aura])

  useEffect(() => {
    const el = box.current
    const cv = canvas.current
    if (!el || !cv || !aura) return
    const layer = createAuraLayer(cv, cv)
    if (!layer) return
    layer.setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const look = AURA_LOOK[aura]
    // El lienzo mide 1,5 × 1,15 veces la caja y está centrado en ella: la nave queda en el centro del aura.
    const place = () => {
      layer.items.length = 0
      layer.items.push({
        kind: aura,
        rect: { left: (cv.clientWidth - el.clientWidth) / 2, top: (cv.clientHeight - el.clientHeight) / 2, width: el.clientWidth, height: el.clientHeight },
        a: look.a,
        b: look.b,
        c: look.c,
        seed: 3,
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
  }, [aura])

  return (
    <div ref={box} className={`aura-backdrop${className ? ` ${className}` : ''}`}>
      {aura && <canvas ref={canvas} key={aura} className={`aura-backdrop-canvas${pop ? ' is-pop' : ''}`} aria-hidden />}
      {children}
    </div>
  )
}
