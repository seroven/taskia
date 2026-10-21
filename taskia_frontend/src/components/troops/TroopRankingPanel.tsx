import { Crown, Lightning, X } from '@phosphor-icons/react'
import { ShipRenderer } from '../ship/ShipRenderer'
import { MAX_CREW } from '../../lib/ship/types'
import type { TroopRankingRow } from '../../lib/troopsTypes'

type Props = {
  rows: TroopRankingRow[]
  myTroopId: number | null
  loading: boolean
  onMore: () => void
  onClose: () => void
  /** Elegir una tripulación: cierra el panel y la galaxia vuela hasta ella. */
  onPick: (troopId: number) => void
}

const MEDAL: Record<number, string> = { 1: '#fbbf24', 2: '#cbd5e1', 3: '#d97706' }
/** Orden del podio: el segundo a la izquierda, el primero al centro y el tercero a la derecha. */
const PODIUM_ORDER = [2, 1, 3]

const members = (count: number) => `${count} ${count === 1 ? 'miembro' : 'miembros'}`

/** Ranking semanal de tripulaciones: podio con las tres primeras y la lista del resto, con su nave y su avance de XP. */
export function TroopRankingPanel({ rows, myTroopId, loading, onMore, onClose, onPick }: Props) {
  const podium = PODIUM_ORDER.flatMap((rank) => rows.filter((row) => row.rank === rank))
  const rest = rows.filter((row) => row.rank > 3)
  const leaderXp = Math.max(1, rows[0]?.xp_week ?? 1)
  const mineInList = myTroopId != null && rows.some((row) => row.id === myTroopId)

  return (
    <div className="rank-backdrop" onClick={onClose} role="presentation">
      <aside className="rank-panel" onClick={(event) => event.stopPropagation()} aria-label="Ranking semanal">
        <header className="rank-head">
          <div>
            <h2>Ranking semanal</h2>
            <p>Se reinicia cada lunes</p>
          </div>
          <button type="button" className="rank-close" onClick={onClose} aria-label="Cerrar el ranking">
            <X size={18} weight="bold" />
          </button>
        </header>

        <div
          className="rank-scroll"
          onScroll={(event) => {
            const el = event.currentTarget
            if (el.scrollTop + el.clientHeight > el.scrollHeight - 48) onMore()
          }}
        >
          {rows.length === 0 && !loading && <p className="rank-empty">Todavía no hay tripulaciones en el ranking.</p>}

          {podium.length > 0 && (
            <section className="rank-podium" aria-label="Las tres primeras">
              {podium.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`rank-podium-card rank-podium-card--${row.rank}${row.id === myTroopId ? ' is-mine' : ''}`}
                  data-mine={row.id === myTroopId ? '' : undefined}
                  onClick={() => onPick(row.id)}
                >
                  {row.rank === 1 && <Crown size={22} weight="fill" className="rank-crown" aria-hidden />}
                  <span className="rank-medal" style={{ background: MEDAL[row.rank] }}>
                    {row.rank}
                  </span>
                  <span className="rank-podium-ship">
                    <ShipRenderer config={row.ship_config} crew={Math.min(row.member_count, MAX_CREW)} animate={false} />
                  </span>
                  <strong className="rank-name">{row.name}</strong>
                  <span className="rank-xp">
                    <Lightning size={13} weight="fill" />
                    {row.xp_week} XP
                  </span>
                  {row.id === myTroopId && <span className="rank-tag">Tu tripulación</span>}
                </button>
              ))}
            </section>
          )}

          {rest.length > 0 && (
            <ol className="rank-list" start={4}>
              {rest.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`rank-row${row.id === myTroopId ? ' is-mine' : ''}`}
                    data-mine={row.id === myTroopId ? '' : undefined}
                    onClick={() => onPick(row.id)}
                  >
                    <span className="rank-pos">#{row.rank}</span>
                    <span className="rank-ship">
                      <ShipRenderer config={row.ship_config} crew={Math.min(row.member_count, MAX_CREW)} animate={false} />
                    </span>
                    <span className="rank-info">
                      <strong className="rank-name">{row.name}</strong>
                      <small>
                        {members(row.member_count)}
                        {row.id === myTroopId ? ' · Tu tripulación' : ''}
                      </small>
                    </span>
                    <span className="rank-score">
                      <b>{row.xp_week}</b>
                      <small>XP</small>
                      <i style={{ width: `${Math.round((row.xp_week / leaderXp) * 100)}%` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {loading && <p className="rank-empty">Cargando…</p>}
        </div>

        {mineInList && (
          <footer className="rank-foot">
            <button
              type="button"
              className="ghost"
              onClick={() => document.querySelector('.rank-scroll [data-mine]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
            >
              Ir a mi posición
            </button>
          </footer>
        )}
      </aside>
    </div>
  )
}
