/** Etiquetas técnicas del panel admin (no las del tablero del niño). */
const ADMIN_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  studying: 'En estudio',
  done: 'Terminado',
}

export function taskStatusLabel(status: string) {
  return ADMIN_STATUS_LABEL[status] ?? status
}

export const ADMIN_STATUS_OPTIONS = (
  Object.entries(ADMIN_STATUS_LABEL) as [string, string][]
).map(([id, label]) => ({ id, label }))

export const STUDY_KIND_LABEL: Record<string, string> = {
  task: 'Tarea',
  mission: 'Tema',
}
