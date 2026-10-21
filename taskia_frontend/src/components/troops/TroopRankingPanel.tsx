import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Crown, Lightning, Medal, Trophy, UsersThree, X } from '@phosphor-icons/react'
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

/** Orden del podio: el segundo a la izquierda, el primero al centro y el tercero a la derecha. */
const PODIUM_ORDER = [2, 1, 3]

const members = (count: number) => `${count} ${count === 1 ? 'miembro' : 'miembros'}`

/** Días hasta el próximo lunes, cuando se reinicia la semana. */
function daysToReset() {
  const day = new Date().getDay()
  return ((8 - day) % 7) || 7
}

const resetText = () => {
  const days = daysToReset()
  return days === 1 ? 'Se reinicia mañana' : `Se reinicia el lunes · faltan ${days} días`
}

/**
 * La clasificación semanal de tripulaciones. Sale del centro de la pantalla: un podio con las tres primeras (cada una con
 * su nave sobre su escalón), la lista del resto con su barra de XP frente al líder y, abajo, tu posición siempre a mano.
 */
export function TroopRankingPanel({ rows, myTroopId, loading, onMore, onClose, onPick }: Props) {
  const podium = PODIUM_ORDER.flatMap((rank) => rows.filter((row) => row.rank === rank))
  const rest = rows.filter((row) => row.rank > 3)
  const leaderXp = Math.max(1, rows[0]?.xp_week ?? 1)
  const mine = useMemo(() => rows.find((row) => row.id === myTroopId) ?? null, [rows, myTroopId])

  return (
    <motion.div
      className="rank-backdrop"
      onClick={onClose}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.aside
        className="rank-panel"
        onClick={(event) => event.stopPropagation()}
        aria-label="Clasificación semanal"
        initial={{ opacity: 0, scale: 0.86, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8, transition: { duration: 0.14 } }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      >
        <header className="rank-head">
          <span className="rank-head-icon" aria-hidden>
            <Trophy size={26} weight="fill" />
          </span>
          <div className="rank-head-text">
            <h2>Clasificación semanal</h2>
            <p>{resetText()}</p>
          </div>
          <button type="button" className="rank-close" onClick={onClose} aria-label="Cerrar la clasificación">
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
          {rows.length === 0 && !loading && <p className="rank-empty">Todavía no hay tripulaciones en la clasificación.</p>}

          {podium.length > 0 && (
            <section className="rank-podium" aria-label="Las tres primeras">
              {podium.map((row, index) => (
                <motion.button
                  key={row.id}
                  type="button"
                  className={`rank-step rank-step--${row.rank}${row.id === myTroopId ? ' is-mine' : ''}`}
                  data-mine={row.id === myTroopId ? '' : undefined}
                  onClick={() => onPick(row.id)}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.07, type: 'spring', stiffness: 320, damping: 24 }}
                >
                  {row.rank === 1 && <Crown size={26} weight="fill" className="rank-crown" aria-hidden />}
                  <span className="rank-step-ship">
                    <ShipRenderer config={row.ship_config} crew={Math.min(row.member_count, MAX_CREW)} animate={false} />
                  </span>
                  <strong className="rank-name">{row.name}</strong>
                  <span className="rank-xp">
                    <Lightning size={13} weight="fill" />
                    {row.xp_week} XP
                  </span>
                  <span className="rank-block" aria-label={`Puesto ${row.rank}`}>
                    {row.rank !== 1 && <Medal size={16} weight="fill" aria-hidden />}
                    {row.rank}
                  </span>
                </motion.button>
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
                    <span className="rank-pos">{row.rank}</span>
                    <span className="rank-ship">
                      <ShipRenderer config={row.ship_config} crew={Math.min(row.member_count, MAX_CREW)} animate={false} />
                    </span>
                    <span className="rank-info">
                      <strong className="rank-name">
                        {row.name}
                        {row.id === myTroopId && <em className="rank-tag">Tú</em>}
                      </strong>
                      <small>
                        <UsersThree size={13} weight="fill" aria-hidden />
                        {members(row.member_count)}
                      </small>
                    </span>
                    <span className="rank-score">
                      <b>{row.xp_week}</b>
                      <small>XP</small>
                      <i style={{ width: `${Math.max(3, Math.round((row.xp_week / leaderXp) * 100))}%` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {loading && <p className="rank-empty">Cargando…</p>}
        </div>

        {mine && (
          <footer className="rank-foot">
            <button type="button" className="rank-mine" onClick={() => onPick(mine.id)}>
              <span className="rank-mine-ship">
                <ShipRenderer config={mine.ship_config} crew={Math.min(mine.member_count, MAX_CREW)} animate={false} />
              </span>
              <span className="rank-mine-text">
                <small>Tu tripulación</small>
                <strong>
                  Puesto #{mine.rank} · {mine.xp_week} XP
                </strong>
              </span>
              <span className="rank-mine-go">Ir a mi nave</span>
            </button>
          </footer>
        )}
      </motion.aside>
    </motion.div>
  )
}
