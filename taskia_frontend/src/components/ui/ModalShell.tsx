import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Icon } from '@phosphor-icons/react'
import { WorldsIconBadge } from '../worlds/WorldsIconBadge'

/** Anchos fijos del panel (siempre acotados por el viewport). */
export type ModalSize = 'sm' | 'md' | 'lg'

/**
 * Shell compartido de todos los modales: backdrop, panel, cabecera y children.
 * Con `icon` la cabecera lleva badge; sin icono, solo título + lead.
 *
 * Tamaños: `sm` ~400px · `md` ~460px (default) · `lg` ~680px.
 */
export function ModalShell({
  open,
  onClose,
  titleId,
  title,
  lead,
  icon,
  size = 'md',
  /** @deprecated Usa `size="lg"`. */
  wide = false,
  panelClassName = '',
  backdropClassName = '',
  closeOnBackdrop = true,
  children,
}: {
  open: boolean
  onClose?: () => void
  titleId: string
  title: string
  lead?: ReactNode
  icon?: Icon
  size?: ModalSize
  wide?: boolean
  panelClassName?: string
  backdropClassName?: string
  closeOnBackdrop?: boolean
  children: ReactNode
}) {
  const resolvedSize: ModalSize = wide ? 'lg' : size
  const panelClass = [
    'modal-panel',
    `modal-panel--${resolvedSize}`,
    panelClassName,
  ]
    .filter(Boolean)
    .join(' ')

  const backdropClass = ['modal-backdrop', backdropClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={backdropClass}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={
            closeOnBackdrop && onClose ? onClose : undefined
          }
        >
          <motion.div
            className={panelClass}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`modal-panel-header${icon ? ' modal-shell-header' : ''}`}
            >
              {icon ? <WorldsIconBadge icon={icon} size="lg" /> : null}
              <div>
                <h2 id={titleId}>{title}</h2>
                {lead != null && lead !== false ? (
                  <p className="lede">{lead}</p>
                ) : null}
              </div>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
