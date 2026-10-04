import { motion, useReducedMotion } from 'framer-motion'
import { PaintBrush, Plus, SignOut, Star } from '@phosphor-icons/react'
import { PlanetRenderer } from '../planet/PlanetRenderer'
import { resolveTroopPlanet } from '../../lib/planet/engine'
import {
  troopRoleLabel,
  type TroopDetail,
} from '../../lib/troopsTypes'
import { ExplorerAvatar } from './ExplorerAvatar'

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
  canRequestJoin,
  onRequestJoin,
  onInvite,
  onCustomizePlanet,
  onEditAvatar,
  viewerUserId,
  onLeave,
  onSetCopilot,
  onKick,
}: {
  detail: TroopDetail
  busy: boolean
  canRequestJoin?: boolean
  onRequestJoin?: () => void
  onInvite?: () => void
  onCustomizePlanet?: () => void
  onEditAvatar?: () => void
  viewerUserId?: number
  onLeave?: () => void
  onSetCopilot?: (userId: number | null) => void
  onKick?: (userId: number) => void
}) {
  const planet = resolveTroopPlanet(detail)
  const reduceMotion = useReducedMotion()
  const isMine = detail.my_role != null
  const canInvite =
    detail.my_role === 'captain' || detail.my_role === 'copilot'
  const isCaptain = detail.my_role === 'captain'

  return (
    <motion.article
      className="troop-space-card"
      initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.96 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 320, damping: 26 }
      }
    >
      <div className="troop-space-card-planet" aria-hidden>
        <PlanetRenderer config={planet} size={64} showRings={false} animate={false} />
        <span className="troop-space-card-planet-star">
          <LevelStar level={detail.level} />
        </span>
      </div>

      <header className="troop-space-card-head">
        <h2>{detail.name}</h2>
        <p className="troops-muted">
          {detail.rank != null ? `#${detail.rank} esta semana · ` : ''}
          {detail.xp_week} XP sem. · {detail.member_count}/{detail.max_members}
        </p>
      </header>

      {(isMine || canRequestJoin) && (
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
          {onCustomizePlanet && (
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={onCustomizePlanet}
            >
              <PaintBrush size={16} weight="bold" />
              Planeta
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
          {canRequestJoin && onRequestJoin && (
            <button
              type="button"
              className="primary"
              disabled={busy || detail.member_count >= detail.max_members}
              onClick={onRequestJoin}
            >
              Pedir unirme
            </button>
          )}
        </div>
      )}

      <div className="troop-space-card-members">
        {detail.members.map((m) => (
          <div key={m.user_id} className="troop-space-member">
            <div className="troop-space-member-main">
              <button
                type="button"
                className="explorer-avatar-btn"
                disabled={viewerUserId !== m.user_id || !onEditAvatar}
                onClick={() => {
                  if (viewerUserId === m.user_id) onEditAvatar?.()
                }}
                aria-label={
                  viewerUserId === m.user_id
                    ? 'Cambiar mi avatar'
                    : m.username
                }
              >
                <ExplorerAvatar
                  username={m.username}
                  avatar_kind={m.avatar_kind}
                  avatar_preset_id={m.avatar_preset_id}
                  avatar_file={m.avatar_file}
                  frame_id={m.frame_id}
                />
              </button>
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
