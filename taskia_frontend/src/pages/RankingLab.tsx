import { useMemo, useState } from 'react'
import { TroopRankingPanel } from '../components/troops/TroopRankingPanel'
import { randomShip } from '../lib/ship/types'
import type { TroopRankingRow } from '../lib/troopsTypes'

const COUNTS = [0, 1, 2, 3, 4, 6, 10, 30, 100]

const WORDS = ['Cometas', 'Halcones', 'Nébulas', 'Pioneros', 'Veloces', 'Titanes', 'Lunares', 'Exploradores', 'Astros', 'Meteoros']
const SUFFIX = ['del Sur', 'de Plata', 'Rojos', 'Alegres', 'del Alba', 'Cósmicos', 'Valientes', 'de Hielo', 'del Norte', 'Brillantes']

/** Una clasificación inventada: el XP baja con el puesto y hay un par de nombres largos para ver cómo se cortan. */
function fakeRows(count: number): TroopRankingRow[] {
  return Array.from({ length: count }, (_, i) => {
    const id = i + 1
    return {
      rank: id,
      id,
      name: id === 2 ? 'Los Superexploradores Intergalácticos del Gran Sur' : `${WORDS[id % WORDS.length]} ${SUFFIX[Math.floor(id / WORDS.length) % SUFFIX.length]}`,
      member_count: 1 + ((id * 7) % 10),
      xp_week: Math.max(0, Math.round(3200 * Math.pow(0.93, i) - i * 3)),
      ship_config: randomShip(`ranking-lab-${id}`),
    }
  })
}

/**
 * Solo dev: `?lab=ranking` muestra el panel de clasificación con 0, 1, 2, 3… hasta 100 tripulaciones y deja elegir en qué
 * puesto estás, para ver el podio incompleto, la lista larga con scroll y el pie con tu posición.
 */
export function RankingLab() {
  const [count, setCount] = useState(30)
  const [mine, setMine] = useState(5)
  const [open, setOpen] = useState(true)
  const [picked, setPicked] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const rows = useMemo(() => fakeRows(count), [count])
  const myId = mine >= 1 && mine <= count ? mine : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)' }}>
      <div className="space-stage" style={{ position: 'absolute', inset: 0 }}>
        {open && (
          <TroopRankingPanel
            rows={rows}
            myTroopId={myId}
            loading={loading}
            onMore={() => undefined}
            onClose={() => setOpen(false)}
            onPick={(id) => setPicked(id)}
          />
        )}
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
          background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
          color: 'var(--text)',
          fontWeight: 700,
          maxWidth: 230,
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>Clasificación de prueba</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {COUNTS.map((n) => (
            <button key={n} type="button" className={n === count ? 'primary troops-mini' : 'ghost troops-mini'} onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          Mi puesto: {myId ?? 'ninguno'}
          <input type="range" min={0} max={Math.max(1, count)} value={mine} onChange={(event) => setMine(Number(event.target.value))} />
        </label>
        <button type="button" className={loading ? 'primary troops-mini' : 'ghost troops-mini'} onClick={() => setLoading((v) => !v)}>
          Cargando: {loading ? 'sí' : 'no'}
        </button>
        <button type="button" className="ghost troops-mini" onClick={() => setOpen(true)}>
          Abrir de nuevo
        </button>
        <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{picked != null ? `Elegiste la tripulación ${picked}` : 'Haz clic en una fila'}</div>
      </div>
    </div>
  )
}
