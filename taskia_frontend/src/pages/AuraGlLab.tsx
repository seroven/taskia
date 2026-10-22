import { useEffect, useMemo, useRef } from 'react'
import { ShipRenderer } from '../components/ship/ShipRenderer'
import { AURA_LOOK as LOOK, GL_KINDS, createAuraGl, type GlItem, type GlKind } from '../lib/ship/auraGl'
import { randomShip } from '../lib/ship/types'
import { useTheme } from '../theme'

/** Solo dev: `?lab=aurasgl` prueba auras con shaders, en un solo canvas WebGL2 detrás de las naves. */
export function AuraGlLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cells = useRef(new Map<GlKind, HTMLDivElement>())
  const ship = useMemo(() => randomShip('aura-gl'), [])
  const fps = useRef<HTMLSpanElement>(null)
  const { theme, toggleTheme } = useTheme()
  const light = theme === 'light'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = createAuraGl(canvas)
    if (!gl) return
    gl.setLight(light)
    const fixedTime = new URLSearchParams(window.location.search).get('t')
    const fixed = fixedTime == null ? null : Number(fixedTime)
    const fit = () => gl.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2))
    fit()
    window.addEventListener('resize', fit)
    let raf = 0
    let frames = 0
    let last = performance.now()
    const loop = (now: number) => {
      const items: GlItem[] = []
      cells.current.forEach((el, kind) => {
        const r = el.getBoundingClientRect()
        const look = LOOK[kind]
        items.push({ kind, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, a: look.a, b: look.b, c: look.c, seed: 3 })
      })
      gl.draw(items, fixed ?? now / 1000)
      frames += 1
      if (now - last >= 1000) {
        if (fps.current) fps.current.textContent = `${Math.round((frames * 1000) / (now - last))} fps`
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
      gl.dispose()
    }
  }, [light])

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 28px 64px', background: 'var(--space-canvas-bg)', color: 'var(--text)' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>
          Auras con shaders <span ref={fps} style={{ fontSize: 14, opacity: 0.7 }} />{' '}
          <button type="button" onClick={toggleTheme} style={{ fontSize: 14 }}>
            Tema: {light ? 'día' : 'noche'}
          </button>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 60, paddingTop: 60 }}>
          {GL_KINDS.map((kind) => (
            <figure key={kind} style={{ margin: 0 }}>
              <div
                ref={(node) => {
                  if (node) cells.current.set(kind, node)
                  else cells.current.delete(kind)
                }}
                style={{ width: 220, margin: '40px auto' }}
              >
                <ShipRenderer config={ship} crew={4} animate />
              </div>
              <figcaption style={{ textAlign: 'center', fontWeight: 700 }}>{LOOK[kind].label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  )
}
