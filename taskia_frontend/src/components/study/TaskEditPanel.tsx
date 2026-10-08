import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage } from '../../lib/errors'
import { todayISO, type Course, type Task, type TaskKind } from '../../types'
import { DateField } from '../ui/DateField'
import { TextAreaField, TextField } from '../ui/Field'
import { SelectField } from '../ui/SelectField'

export type TaskEditPayload = {
  task_id: number
  title: string
  description?: string
  course_id: number
  needs_help: boolean
  task_kind: TaskKind
  due_date?: string
}

interface Props {
  task: Task
  courses: Course[]
  onSave: (input: TaskEditPayload) => Promise<Task>
}

export function TaskEditPanel({ task, courses, onSave }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [courseId, setCourseId] = useState(String(task.course_id))
  const [needsHelp, setNeedsHelp] = useState(task.needs_help)
  const [taskKind, setTaskKind] = useState<TaskKind>(task.task_kind)
  const [dueDate, setDueDate] = useState(task.due_date)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const lockedHelp = task.status === 'studying' || task.status === 'done'

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setCourseId(String(task.course_id))
    setNeedsHelp(task.needs_help)
    setTaskKind(task.task_kind)
    setDueDate(task.due_date)
    setError(null)
    setSaved(false)
  }, [task])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!courseId) {
      setError('Completa el curso')
      return
    }
    if (taskKind === 'project' && !dueDate) {
      setError('Elige hasta cuándo tienes para el proyecto')
      return
    }

    setSubmitting(true)
    setError(null)
    setSaved(false)
    try {
      await onSave({
        task_id: task.id,
        title,
        description: description.trim() || undefined,
        course_id: Number(courseId),
        needs_help: lockedHelp ? true : needsHelp,
        task_kind: taskKind,
        due_date: taskKind === 'project' ? dueDate : undefined,
      })
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="study-edit-panel" onSubmit={(e) => void onSubmit(e)}>
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
        rows={4}
      />
      <SelectField
        label="Curso"
        value={courseId}
        options={courses.map((c) => ({ value: String(c.id), label: c.name }))}
        placeholder="Selecciona…"
        required
        onChange={setCourseId}
      />

      <label className="worlds-switch-row camp-help-switch">
        <input
          type="checkbox"
          checked={needsHelp}
          disabled={lockedHelp}
          onChange={(e) => setNeedsHelp(e.target.checked)}
        />
        <span>
          <strong className="worlds-switch-label">¿Quieres que Taskia te ayude con esta?</strong>
          {lockedHelp ? (
            <span className="muted"> Ya está en marcha o lista con Taskia.</span>
          ) : (
            <span className="muted"> Si marcas sí, estudiarás con Taskia hasta que quede lista.</span>
          )}
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
      {saved && !error && <p className="study-saved">Cambios guardados</p>}

      <div className="study-edit-actions">
        <button type="submit" className="primary" disabled={submitting || task.status === 'done'}>
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
