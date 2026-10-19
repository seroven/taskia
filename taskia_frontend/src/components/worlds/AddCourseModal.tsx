import { useEffect, useState, type FormEvent } from 'react'
import { BookOpen, Plus } from '@phosphor-icons/react'
import { SelectField } from '../ui/SelectField'
import { ModalShell } from '../ui/ModalShell'
import { errorMessage } from '../../lib/errors'

interface Props {
  open: boolean
  onClose: () => void
  /** Cursos del explorador que aún no están en este mundo. */
  options: { id: number; name: string }[]
  onAdd: (courseId: number) => Promise<void>
}

/** Agrega uno de los cursos del explorador a un mundo. Reemplaza al formulario que vivía bajo el diagrama. */
export function AddCourseModal({ open, onClose, options, onAdd }: Props) {
  const [courseId, setCourseId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setCourseId('')
    setError(null)
  }, [open])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!courseId) {
      setError('Elige un planeta')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onAdd(Number(courseId))
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
      titleId="add-course-title"
      title="Agregar un planeta"
      lead="Cada planeta es uno de tus cursos. Elige cuál orbitará este mundo."
      icon={BookOpen}
      size="sm"
    >
      <form className="modal-panel-body" onSubmit={(e) => void onSubmit(e)}>
        <SelectField
          label="Curso"
          value={courseId}
          onChange={setCourseId}
          options={options.map((course) => ({ value: String(course.id), label: course.name }))}
          placeholder="Elige un curso"
        />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={submitting || !courseId}>
            <Plus size={18} weight="bold" />
            {submitting ? 'Agregando…' : 'Agregar'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
