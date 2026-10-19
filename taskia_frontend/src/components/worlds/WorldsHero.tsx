import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { WorldsIconBadge } from './WorldsIconBadge'

export function WorldsHero({
  icon,
  art,
  title,
  lead,
  actions,
  compact = false,
}: {
  icon?: Icon
  /** Reemplaza al ícono (p. ej. el planeta del mundo). */
  art?: ReactNode
  title: string
  lead?: ReactNode
  actions?: ReactNode
  compact?: boolean
}) {
  return (
    <header
      className={`worlds-hero${compact ? ' worlds-hero--compact' : ' worlds-hero--page'}`}
    >
      {art ?? (icon ? <WorldsIconBadge icon={icon} size="lg" /> : null)}
      {compact ? (
        <>
          <h1 className="worlds-hero-title">{title}</h1>
          {lead ? <p className="worlds-hero-lead">{lead}</p> : null}
        </>
      ) : (
        <>
          <div className="worlds-hero-copy">
            <h1 className="worlds-hero-title">{title}</h1>
            {lead ? <p className="worlds-hero-lead">{lead}</p> : null}
          </div>
          {actions ? <div className="worlds-hero-actions">{actions}</div> : null}
        </>
      )}
    </header>
  )
}
