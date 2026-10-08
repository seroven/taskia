import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Rocket } from '@phosphor-icons/react'
import { TextAreaField, TextField } from '../ui/Field'
import { ModalShell } from '../ui/ModalShell'
import { errorMessage } from '../../lib/errors'

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (input: {
    title: string
    description?: string
  }) => Promise<void>
}

export function CreateMissionModal({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setError(null)
  }, [open])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Ponle un nombre a la misión')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="create-mission-title"
      title="Nueva misión"
      lead="Un tema para estudiar con Taskia. Luego podrás desafiarlo."
      icon={Rocket}
    >
      <form className="modal-panel-body" onSubmit={(e) => void onSubmit(e)}>
              <TextField
                label="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Fracciones equivalentes"
                autoFocus
              />
              <TextAreaField
                label="Descripción (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="primary" disabled={submitting}>
                  <Plus size={18} weight="bold" />
                  {submitting ? 'Creando…' : 'Crear misión'}
                </button>
              </div>
            </form>
    </ModalShell>
  )
}
