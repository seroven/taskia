import { useState, type FormEvent } from 'react'
import { NotePencil, Plus } from '@phosphor-icons/react'
import { errorMessage } from '../lib/errors'
import type { Course, TaskKind } from '../types'
import { todayISO } from '../types'
import { DateField } from './ui/DateField'
import { TextAreaField, TextField } from './ui/Field'
import { ModalShell } from './ui/ModalShell'
import { SelectField } from './ui/SelectField'

interface Props {
  open: boolean
  courses: Course[]
  onClose: () => void
  onCreate: (input: {
    title: string
    description?: string
    course_id: number
    needs_help: boolean
    task_kind: TaskKind
    due_date?: string
  }) => Promise<void>
}

export function TaskFormModal({ open, courses, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [needsHelp, setNeedsHelp] = useState(false)
  const [taskKind, setTaskKind] = useState<TaskKind>('daily')
  const [dueDate, setDueDate] = useState(todayISO())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const courseOptions = courses.map((course) => ({
    value: String(course.id),
    label: course.name,
  }))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!courseId) {
      setError('Selecciona un curso')
      return
    }
    if (taskKind === 'project' && !dueDate) {
      setError('Elige hasta cuándo tienes para el proyecto')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        title,
        description: description.trim() || undefined,
        course_id: Number(courseId),
        needs_help: needsHelp,
        task_kind: taskKind,
        due_date: taskKind === 'project' ? dueDate : undefined,
      })
      setTitle('')
      setDescription('')
      setCourseId('')
      setNeedsHelp(false)
      setTaskKind('daily')
      setDueDate(todayISO())
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
      titleId="create-task-title"
      title="Nueva tarea"
      lead="Va a Por hacer."
      icon={NotePencil}
    >
      <form className="modal-panel-body" onSubmit={(e) => void onSubmit(e)}>
        <div className="kind-toggle" role="group" aria-label="Tipo de tarea">
          <button
            type="button"
            className={taskKind === 'daily' ? 'active' : ''}
            onClick={() => {
              setTaskKind('daily')
              setDueDate(todayISO())
            }}
          >
            Tarea del día
          </button>
          <button
            type="button"
            className={taskKind === 'project' ? 'active' : ''}
            onClick={() => setTaskKind('project')}
          >
            Proyecto
          </button>
        </div>

        <TextField
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <TextAreaField
          label="Detalle"
          hint="si quieres"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <SelectField
          label="Curso"
          value={courseId}
          options={courseOptions}
          placeholder="Selecciona…"
          required
          onChange={setCourseId}
        />

        <label className="worlds-switch-row camp-help-switch">
          <input
            type="checkbox"
            checked={needsHelp}
            onChange={(e) => setNeedsHelp(e.target.checked)}
          />
          <span>
            <strong className="worlds-switch-label">¿Quieres que Taskia te ayude con esta?</strong>
            <span className="muted"> Si marcas sí, estudiarás con Taskia hasta que quede lista.</span>
          </span>
        </label>

        {taskKind === 'daily' ? (
          <p className="kind-hint">
            Se entrega: <strong>hoy ({todayISO()})</strong>
          </p>
        ) : (
          <DateField
            label="Hasta cuándo tienes para hacerlo"
            value={dueDate}
            required
            onChange={setDueDate}
          />
        )}

        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            <Plus size={18} weight="bold" />
            {submitting ? 'Guardando…' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
