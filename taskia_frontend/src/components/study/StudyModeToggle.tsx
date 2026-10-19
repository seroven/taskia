import { ChatsCircle, PencilSimple } from '@phosphor-icons/react'
import { ExpandIconButton } from '../ExpandIconButton'

/** Cambia entre el chat y la edición de la tarea. Es un botón discreto: el niño casi no lo usa. */
export function StudyModeToggle({
  mode,
  onChange,
}: {
  mode: 'study' | 'edit'
  onChange: (mode: 'study' | 'edit') => void
}) {
  const editing = mode === 'edit'
  return (
    <ExpandIconButton
      icon={editing ? ChatsCircle : PencilSimple}
      label={editing ? 'Volver al chat' : 'Editar'}
      weight="bold"
      className="study-mode-toggle"
      aria-pressed={editing}
      onClick={() => onChange(editing ? 'study' : 'edit')}
    />
  )
}
