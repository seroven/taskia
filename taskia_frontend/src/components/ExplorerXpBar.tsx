import { progressPct } from '../lib/xp'
import { useAuth } from '../auth'

/** Barra de nivel compacta (estilo progreso de juego). */
export function ExplorerXpBar() {
  const { user } = useAuth()
  if (!user || user.role !== 'user') return null

  const level = user.level ?? 1
  const into = user.xp_into_level ?? 0
  const pct = progressPct(user)

  return (
    <div
      className="xp-bar"
      title={`Nivel ${level} · ${into}/1000 XP`}
      aria-label={`Nivel ${level}, ${into} de 1000 experiencia`}
    >
      <span className="xp-bar-level">Nv. {level}</span>
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="xp-bar-frac">
        {into}
        <span className="xp-bar-max">/1000</span>
      </span>
    </div>
  )
}
