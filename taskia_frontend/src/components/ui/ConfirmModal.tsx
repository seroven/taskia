import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { Warning } from '@phosphor-icons/react'
import { ModalShell } from './ModalShell'
import { Button } from './Button'

/** Confirmación con el diseño de la app (en lugar del `window.confirm` del navegador). */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  icon = Warning,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  cancelLabel?: string
  icon?: Icon
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <ModalShell open={open} onClose={onClose} titleId="confirm-modal-title" title={title} lead={message} icon={icon} size="sm">
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={busy} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </ModalShell>
  )
}
