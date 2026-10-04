import { motion } from 'framer-motion'
import { Plus, SignOut, Star } from '@phosphor-icons/react'
import { getPlanetStyle } from '../../lib/planetStyles'
import {
  troopRoleLabel,
  type TroopDetail,
} from '../../lib/troopsTypes'

export function LevelStar({ level }: { level: number }) {
  return (
    <span className="level-star" title={`Nivel ${level}`}>
      <Star size={18} weight="fill" />
      <span className="level-star-num">{level}</span>
    </span>
  )
}

export function TroopSpaceCard({
  detail,
  busy,
  onCloseHint,
  onInvite,
  onLeave,
  onSetCopilot,
  onKick,
}: {
  detail: TroopDetail
  busy: boolean
  onCloseHint?: string
  onInvite?: () => void
  onLeave?: () => void
  onSetCopilot?: (userId: number | null) => void
  onKick?: (userId: number) => void
}) {
  const style = getPlanetStyle(detail.planet_style_id)
  const isMine = detail.my_role != null
  const canInvite =
    detail.my_role === 'captain' || detail.my_role === 'copilot'
  const isCaptain = detail.my_role === 'captain'

  return (
    <motion.article
      className="troop-space-card"
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <div
        className="troop-space-card-planet"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${style.atmosphere ?? style.color}, ${style.color} 45%, ${style.emissive})`,
          boxShadow: `0 0 24px ${style.atmosphere ?? style.color}66`,
        }}
        aria-hidden
      >
        <span className="troop-space-card-planet-star">
          <LevelStar level={detail.level} />
        </span>
      </div>

      <header className="troop-space-card-head">
        <h2>{detail.name}</h2>
        <p className="troops-muted">
          {detail.rank != null ? `#${detail.rank} esta semana · ` : ''}
          {detail.xp_week} XP sem. · {detail.member_count}/{detail.max_members}
          {onCloseHint ? ` · ${onCloseHint}` : ''}
        </p>
      </header>

      {isMine && (
        <div className="troop-space-card-actions">
          {canInvite && (
            <button
              type="button"
              className="primary"
              disabled={busy || detail.member_count >= detail.max_members}
              onClick={onInvite}
            >
              <Plus size={16} weight="bold" />
              Invitar
            </button>
          )}
          {onLeave && (
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={onLeave}
            >
              <SignOut size={16} weight="bold" />
              Salir
            </button>
          )}
        </div>
      )}

      <div className="troop-space-card-members">
        {detail.members.map((m) => (
          <div key={m.user_id} className="troop-space-member">
            <div className="troop-space-member-main">
              <strong>{m.username}</strong>
              <span className={`troops-role troops-role--${m.role}`}>
                {troopRoleLabel(m.role)}
              </span>
              <LevelStar level={m.level} />
            </div>
            {isCaptain && m.role !== 'captain' && onSetCopilot && onKick && (
              <div className="troop-space-member-actions">
                {m.role === 'copilot' ? (
                  <button
                    type="button"
                    className="ghost troops-mini"
                    disabled={busy}
                    onClick={() => onSetCopilot(null)}
                  >
                    Quitar copiloto
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ghost troops-mini"
                    disabled={busy}
                    onClick={() => onSetCopilot(m.user_id)}
                  >
                    Hacer copiloto
                  </button>
                )}
                <button
                  type="button"
                  className="ghost troops-mini troops-mini--danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`¿Sacar a ${m.username}?`)) {
                      onKick(m.user_id)
                    }
                  }}
                >
                  Sacar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.article>
  )
}
