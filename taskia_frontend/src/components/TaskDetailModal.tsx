import { useEffect, useState, type FormEvent } from 'react'
import { BookOpenText, NotePencil } from '@phosphor-icons/react'
import { api } from '../api'
import { formatDay } from '../lib/datetime'
import { errorMessage } from '../lib/errors'
import { todayISO, canOpenStudyMode, type Course, type Task, type TaskKind } from '../types'
import { DateField } from './ui/DateField'
import { TextAreaField, TextField } from './ui/Field'
import { ModalShell } from './ui/ModalShell'
import { SelectField } from './ui/SelectField'

interface Props {
  task: Task | null
  courses: Course[]
  onClose: () => void
  onStudy: (task: Task) => void
  onSaved: (task: Task) => void
}

export function TaskDetailModal({ task, courses, onClose, onStudy, onSaved }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [needsHelp, setNeedsHelp] = useState(false)
  const [taskKind, setTaskKind] = useState<TaskKind>('daily')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const lockedHelp = task?.status === 'studying' || task?.status === 'done'

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? '')
    setCourseId(String(task.course_id))
    setNeedsHelp(task.needs_help)
    setTaskKind(task.task_kind)
    setDueDate(task.due_date)
    setError(null)
  }, [task])

  const courseOptions = courses.map((course) => ({
    value: String(course.id),
    label: course.name,
  }))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!task) return
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
      const saved = await api.updateTask({
        task_id: task.id,
        title,
        description: description.trim() || undefined,
        course_id: Number(courseId),
        needs_help: lockedHelp ? true : needsHelp,
        task_kind: taskKind,
        due_date: taskKind === 'project' ? dueDate : undefined,
      })
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      open={task != null}
      onClose={onClose}
      titleId="task-detail-title"
      title="Tu tarea"
      lead={
        task
          ? `Hecha el ${formatDay(task.created_at)}. Puedes cambiarla aquí.`
          : undefined
      }
      icon={NotePencil}
      panelClassName="task-detail-panel"
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
          rows={4}
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
            disabled={lockedHelp}
            onChange={(e) => setNeedsHelp(e.target.checked)}
          />
          <span>
            <strong className="worlds-switch-label">¿Quieres que Taskia te ayude con esta?</strong>
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
            Cerrar
          </button>
          {task && canOpenStudyMode(task) ? (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                onStudy(task)
              }}
            >
              <BookOpenText size={18} weight="fill" />
              Estudiar
            </button>
          ) : null}
          <button
            type="submit"
            className="primary"
            disabled={submitting || task?.status === 'done'}
          >
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
