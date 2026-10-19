import type { ReactNode } from 'react'
import { ArrowLeft, type Icon } from '@phosphor-icons/react'
import { AppearanceTools } from './AppearanceTools'
import { ExpandIconButton } from './ExpandIconButton'
import { ExplorerXpBar } from './ExplorerXpBar'
import { SessionActions } from './SessionActions'
import { WorldsIconBadge } from './worlds/WorldsIconBadge'

type Props = {
  backLabel: string
  onBack: () => void
  /** Ícono del lugar; `art` lo reemplaza (p. ej. el planeta del mundo). */
  icon?: Icon
  art?: ReactNode
  title: string
  lead?: ReactNode
  /** Acciones de la pantalla (Seguir, Nueva misión…), a la derecha del título. */
  actions?: ReactNode
}

/**
 * Encabezado común de los lugares del explorador (Campamento, Mundos, mundo, curso): volver, ícono o arte,
 * título con su línea de contexto y, a la derecha, las acciones de la pantalla y el nivel, apariencia y cuenta.
 */
export function PageHeader({ backLabel, onBack, icon, art, title, lead, actions }: Props) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        <ExpandIconButton icon={ArrowLeft} label={backLabel} weight="bold" onClick={onBack} />
        {art ?? (icon ? <WorldsIconBadge icon={icon} size="lg" /> : null)}
        <div className="page-header-copy">
          <h1 className="page-header-title">{title}</h1>
          {lead ? <p className="page-header-lead">{lead}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
      <div className="page-header-tools">
        <ExplorerXpBar />
        <AppearanceTools />
        <SessionActions />
      </div>
    </header>
  )
}
