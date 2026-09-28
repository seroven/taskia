import { useEffect, useState } from 'react'
import { BookOpenText, PencilLine } from '@phosphor-icons/react'
import { api } from '../api'
import { WorldsIconBadge } from './worlds/WorldsIconBadge'
import { ModalShell } from './ui/ModalShell'
import { errorMessage } from '../lib/errors'
import { taskStudyPatch, type Task } from '../types'

interface Props {
  task: Task | null
  onClose: () => void
  onReady: (task: Task) => void
}

export function StudyBoardChoiceModal({ task, onClose, onReady }: Props) {
  const [usesBoard, setUsesBoard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!task) return
    setUsesBoard(task.uses_board)
    setError(null)
    setSaving(false)
  }, [task])

  async function onConfirm() {
    if (!task) return
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateTask(
        taskStudyPatch(task, {
          uses_board: usesBoard,
          study_mode_chosen: true,
        }),
      )
      onReady(updated)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      open={task != null}
      onClose={onClose}
      titleId="study-board-choice-title"
      title="¿Cómo quieres estudiar?"
      lead={
        task
          ? `${task.title}. Elige si vas a dibujar o solo a conversar con el tutor.`
          : undefined
      }
      icon={BookOpenText}
    >
      <div className="modal-panel-body">
        <div className="study-board-choice" role="group" aria-label="Modo de estudio">
          <button
            type="button"
            className={`study-board-choice-btn${usesBoard ? '' : ' is-active'}`}
            onClick={() => setUsesBoard(false)}
          >
            <WorldsIconBadge icon={BookOpenText} size="md" />
            <strong>Solo charla</strong>
            <span>
              Estudio guiado, como un tema de Mundos. Preguntas y práctica en el
              chat.
            </span>
          </button>
          <button
            type="button"
            className={`study-board-choice-btn${usesBoard ? ' is-active' : ''}`}
            onClick={() => setUsesBoard(true)}
          >
            <WorldsIconBadge icon={PencilLine} size="md" />
            <strong>Con pizarra</strong>
            <span>Dibujas y el tutor también puede marcar en la pizarra.</span>
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            disabled={saving}
            onClick={() => void onConfirm()}
          >
            {saving ? 'Abriendo…' : 'Estudiar'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
