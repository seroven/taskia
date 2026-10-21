import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Lightning, PaintBrush, Plus, SignOut, Trophy, UserMinus, Users } from '@phosphor-icons/react'
import { ConfirmModal } from '../ui/ConfirmModal'
import { ShipRenderer } from '../ship/ShipRenderer'
import { MAX_CREW } from '../../lib/ship/types'
import {
  troopRoleLabel,
  type TroopDetail,
} from '../../lib/troopsTypes'
import { UserAvatar } from '../avatar/UserAvatar'
import { LevelBadge } from './LevelBadge'

export function TroopSpaceCard({
  detail,
  busy,
  canRequestJoin,
  onRequestJoin,
  onInvite,
  onCustomizeShip,
  onLeave,
  onSetCopilot,
  onKick,
}: {
  detail: TroopDetail
  busy: boolean
  canRequestJoin?: boolean
  onRequestJoin?: () => void
  onInvite?: () => void
  onCustomizeShip?: () => void
  onLeave?: () => void
  onSetCopilot?: (userId: number | null) => void
  onKick?: (userId: number) => void
}) {
  const reduceMotion = useReducedMotion()
  const [kicking, setKicking] = useState<{ id: number; name: string } | null>(null)
  const isMine = detail.my_role != null
  const canInvite =
    detail.my_role === 'captain' || detail.my_role === 'copilot'
  const isCaptain = detail.my_role === 'captain'

  return (
    <motion.article
      className="troop-space-card"
      initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
      }
    >
      <div className="troop-space-card-ship">
        <ShipRenderer
          config={detail.ship_config}
          crew={Math.min(detail.member_count, MAX_CREW)}
          crewNames={detail.members.map((m) => m.username)}
          label={`Nave de ${detail.name}`}
        />
      </div>

      <header className="troop-space-card-head">
        <LevelBadge
          level={detail.level}
          size="lg"
          title={`Nivel de la tripulación: ${detail.level}`}
          color={detail.ship_config.palette.trim}
          light={detail.ship_config.palette.hull}
        />
        <div className="troop-space-card-head-text">
          <h2>{detail.name}</h2>
          <ul className="troop-space-card-stats">
            {detail.rank != null && (
              <li className="is-rank" title="Puesto en el ranking de esta semana">
                <Trophy size={14} weight="fill" />#{detail.rank}
              </li>
            )}
            <li title="XP que sumó la tripulación esta semana">
              <Lightning size={14} weight="fill" />
              {detail.xp_week} XP
            </li>
            <li title="Miembros">
              <Users size={14} weight="fill" />
              {detail.member_count}/{detail.max_members}
            </li>
          </ul>
        </div>
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
          {onCustomizeShip && (
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={onCustomizeShip}
            >
              <PaintBrush size={16} weight="bold" />
              Nave
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
              <UserAvatar avatar={m.avatar_config} frame={m.frame_id} size={34} name={m.username} />
              <strong>{m.username}</strong>
              <span className={`troops-role troops-role--${m.role}`}>
                {troopRoleLabel(m.role)}
              </span>
              <LevelBadge level={m.level} size="sm" />
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
                  onClick={() => setKicking({ id: m.user_id, name: m.username })}
                >
                  Sacar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <ConfirmModal
        open={kicking != null}
        icon={UserMinus}
        title={`¿Sacar a ${kicking?.name ?? ''}?`}
        message="Dejará de ser parte de la tripulación. Podrá volver si lo invitan otra vez."
        confirmLabel="Sí, sacar"
        busy={busy}
        onClose={() => setKicking(null)}
        onConfirm={() => {
          if (kicking) onKick?.(kicking.id)
          setKicking(null)
        }}
      />
    </motion.article>
  )
}
