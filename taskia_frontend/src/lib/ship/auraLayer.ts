import { createAuraGl, type GlItem } from './auraGl'

/** Las auras son suaves: se dibujan a esta fracción de los píxeles de la pantalla y el navegador las estira. */
const RENDER_SCALE = 0.65

export interface AuraLayer {
  /** Auras a dibujar, en píxeles del contenedor. Quien lo mueve las pone aquí y llama a `render`. */
  items: GlItem[]
  /** Dibuja ya (borra el lienzo si no hay ninguna). Si hay auras, sigue dibujando cuadro a cuadro por su cuenta. */
  render(): void
  /** Con menos movimiento del sistema: un solo fotograma fijo, sin bucle. */
  setStill(still: boolean): void
  dispose(): void
}

/**
 * Un solo canvas WebGL2 para todas las auras de un contenedor. Devuelve `null` si el navegador no ofrece WebGL2 o el
 * shader no compila: entonces simplemente no hay auras.
 */
export function createAuraLayer(canvas: HTMLCanvasElement, host: HTMLElement, scale = RENDER_SCALE): AuraLayer | null {
  let gl
  try {
    gl = createAuraGl(canvas)
  } catch {
    return null
  }
  if (!gl) return null
  const renderer = gl
  const items: GlItem[] = []
  let still = false
  let raf = 0
  let lastDraw = -1000

  const fit = () => renderer.resize(host.clientWidth, host.clientHeight, scale)
  fit()
  // El tema vive en `<html data-theme>`: de día el fondo es claro y las auras se dibujan con otros tonos.
  const readTheme = () => renderer.setLight(document.documentElement.dataset.theme !== 'dark')
  readTheme()
  const themeObserver = new MutationObserver(() => {
    readTheme()
    draw()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const observer = new ResizeObserver(() => {
    fit()
    draw()
  })
  observer.observe(host)

  function draw() {
    lastDraw = performance.now()
    renderer.draw(items, still ? 3 : lastDraw / 1000)
  }

  function tick(now: number) {
    raf = 0
    if (!items.length || still || document.hidden) return
    // Si la cámara ya dibujó en este mismo cuadro, no se repite.
    if (now - lastDraw >= 3) draw()
    raf = requestAnimationFrame(tick)
  }

  return {
    items,
    render() {
      draw()
      if (!raf && items.length && !still) raf = requestAnimationFrame(tick)
    },
    setStill(next) {
      still = next
      draw()
      if (!still && !raf && items.length) raf = requestAnimationFrame(tick)
    },
    dispose() {
      cancelAnimationFrame(raf)
      observer.disconnect()
      themeObserver.disconnect()
      renderer.dispose()
    },
  }
}
