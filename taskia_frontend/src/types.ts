export type UserRole = 'user' | 'admin' | 'parent'

export type TaskStatus = 'pending' | 'studying' | 'done'

export type TaskKind = 'daily' | 'project'

export interface PublicUser {
  id: number
  username: string
  email: string
  role: UserRole
  level: number
  xp_total: number
  xp_into_level: number
  xp_to_next: number
  avatar_kind?: 'preset' | 'upload'
  avatar_preset_id?: string | null
  avatar_file?: string | null
  frame_id?: string | null
}

export interface Course {
  id: number
  name: string
}

export interface Task {
  id: number
  user_id: number
  course_id: number
  course_name: string
  title: string
  description: string | null
  task_kind: TaskKind
  status: TaskStatus
  needs_help: boolean
  due_date: string
  created_at: string
  updated_at: string
}

export interface TaskFilters {
  created_on?: string | null
  due_on?: string | null
  course_id?: number | null
  status?: TaskStatus | null
}

export const STATUS_SECTIONS: { id: TaskStatus; label: string }[] = [
  { id: 'pending', label: 'Por hacer' },
  { id: 'studying', label: 'Con Taskia' },
  { id: 'done', label: 'Listo' },
]

export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function shiftCivilDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + delta)
  const yy = next.getFullYear()
  const mm = String(next.getMonth() + 1).padStart(2, '0')
  const dd = String(next.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Inicio incl. y fin excl. del día civil local, en ISO UTC. */
export function localDayBoundsISO(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** Estudio activo: con ayuda y aún no lista. */
export function canOpenStudyMode(task: Pick<Task, 'status' | 'needs_help'>): boolean {
  return task.needs_help && (task.status === 'pending' || task.status === 'studying')
}

/** Ver el chat de Taskia: incluye tareas ya listas (solo lectura). */
export function canViewStudySession(task: Pick<Task, 'status' | 'needs_help'>): boolean {
  return (
    task.needs_help &&
    (task.status === 'pending' || task.status === 'studying' || task.status === 'done')
  )
}

export function taskStudyPatch(task: Task) {
  return {
    task_id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    course_id: task.course_id,
    needs_help: task.needs_help,
    task_kind: task.task_kind,
    due_date: task.task_kind === 'project' ? task.due_date : undefined,
  }
}
