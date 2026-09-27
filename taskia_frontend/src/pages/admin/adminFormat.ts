import { STATUS_COLUMNS } from '../../types'
import { civilDayAsDate, parseInstant } from '../../lib/datetime'

export function formatWhen(value: string | null | undefined) {
  const date = parseInstant(value)
  if (!date) return '—'
  return date.toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDay(value: string | null | undefined) {
  if (!value) return '—'
  const date = civilDayAsDate(value)
  if (!date) return value.slice(0, 10)
  return date.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function taskStatusLabel(status: string) {
  return STATUS_COLUMNS.find((column) => column.id === status)?.label ?? status
}

export const STUDY_KIND_LABEL: Record<string, string> = {
  task: 'Tarea',
  mission: 'Tema',
}
