import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GalaxyUniverse } from '../components/troops/space/GalaxyUniverse'
import { randomShip } from '../lib/ship/types'
import type { UniverseTroop } from '../lib/troopsTypes'

const STEP = 100

const WORDS = ['Cometas', 'Halcones', 'Nébulas', 'Pioneros', 'Veloces', 'Titanes', 'Lunares', 'Exploradores', 'Astros', 'Meteoros']
const SUFFIX = ['del Sur', 'de Plata', 'Rojos', 'Alegres', 'del Alba', 'Cósmicos', 'Valientes', 'de Hielo', 'del Norte', 'Brillantes']

/** Una tripulación inventada y siempre la misma para un mismo número. */
function fakeTroop(id: number): UniverseTroop {
  return {
    id,
    name: `${WORDS[id % WORDS.length]} ${SUFFIX[Math.floor(id / WORDS.length) % SUFFIX.length]}`,
    member_count: 1 + ((id * 7) % 10),
    level: 1 + (id % 12),
    xp_week: Math.max(0, 5000 - id * 23),
    rank: id <= 3 ? id : null,
    is_mine: id === 1,
    ship_config: randomShip(`galaxy-lab-${id}`),
  }
}

/** Mide cuadros por segundo y el peor cuadro de la última ventana, sin tocar React en cada cuadro. */
function useFrameStats() {
  const [stats, setStats] = useState({ fps: 0, worst: 0 })
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let windowStart = last
    let frames = 0
    let worst = 0
    const loop = (now: number) => {
      worst = Math.max(worst, now - last)
      last = now
      frames += 1
      if (now - windowStart >= 1000) {
        setStats({ fps: Math.round((frames * 1000) / (now - windowStart)), worst: Math.round(worst) })
        windowStart = now
        frames = 0
        worst = 0
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return stats
}

/**
 * Solo dev: `?lab=galaxy` muestra la galaxia con 100 naves y deja subir de 100 en 100 para ver cómo se reparten y
 * cuánto cuesta moverse. Arrastra, haz zoom (rueda o +/−) y mira los cuadros por segundo.
 */
export function GalaxyLab() {
  const [count, setCount] = useState(STEP)
  const [openId, setOpenId] = useState<number | null>(null)
  const [dom, setDom] = useState({ nodes: 0, visible: 0, mounted: 0, live: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const stats = useFrameStats()

  const troops = useMemo(() => Array.from({ length: count }, (_, i) => fakeTroop(i + 1)), [count])

  const onClear = useCallback(() => setOpenId(null), [])

  // Elementos del DOM y naves visibles: se cuentan cada segundo, no en cada cuadro.
  useEffect(() => {
    const id = window.setInterval(() => {
      const root = stageRef.current
      if (!root) return
      const ships = [...root.querySelectorAll<HTMLElement>('.galaxy-ship')]
      setDom({
        nodes: root.querySelectorAll('*').length,
        visible: ships.filter((el) => el.style.visibility !== 'hidden').length,
        mounted: ships.length,
        live: ships.filter((el) => el.dataset.live === '1').length,
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [count])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)' }}>
      <div ref={stageRef} className="space-stage" style={{ position: 'absolute', inset: 0 }}>
        <GalaxyUniverse
          troops={troops}
          myTroopId={1}
          openId={openId}
          onSelectTroop={setOpenId}
          onClearTroop={onClear}
          onRequestMore={() => undefined}
          focusToken={0}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '12px 14px',
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
          color: 'var(--text)',
          fontWeight: 700,
          minWidth: 220,
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Galaxia de prueba</div>
        <div>{count} naves cargadas</div>
        <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
          {dom.mounted} montadas · {dom.visible} a la vista · {dom.live} animadas
        </div>
        <div>
          {stats.fps} cuadros/s · peor cuadro {stats.worst} ms
        </div>
        <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{dom.nodes.toLocaleString('es')} elementos en el DOM</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="ghost troops-mini" onClick={() => setCount((n) => n + STEP)}>
            +{STEP}
          </button>
          <button type="button" className="ghost troops-mini" disabled={count <= STEP} onClick={() => setCount((n) => Math.max(STEP, n - STEP))}>
            −{STEP}
          </button>
          <button type="button" className="ghost troops-mini" onClick={() => setCount(STEP)}>
            Reiniciar
          </button>
        </div>
      </div>
    </div>
  )
}
