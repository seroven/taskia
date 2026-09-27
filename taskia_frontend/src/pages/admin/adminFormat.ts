import { STATUS_COLUMNS } from '../../types'

export function taskStatusLabel(status: string) {
  return STATUS_COLUMNS.find((column) => column.id === status)?.label ?? status
}

export const STUDY_KIND_LABEL: Record<string, string> = {
  task: 'Tarea',
  mission: 'Tema',
}
