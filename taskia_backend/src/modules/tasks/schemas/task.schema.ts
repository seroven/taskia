import { z } from 'zod'
import { AppError } from '../../../shared/errors/app-error.js'

const statusSchema = z.enum(['pending', 'studying', 'done'], {
  message: 'Estado no válido',
})

const kindSchema = z.enum(['daily', 'project'], {
  message: 'Tipo de tarea no válido',
})

const civilDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export function parseStatus(status: string) {
  const parsed = statusSchema.safeParse(status)
  if (!parsed.success) throw new AppError('Estado no válido')
  return parsed.data
}

export function parseKind(kind: string) {
  const parsed = kindSchema.safeParse(kind)
  if (!parsed.success) throw new AppError('Tipo de tarea no válido')
  return parsed.data
}

export function parseInstant(value: string, field: string): Date {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) {
    throw new AppError(`Fecha inválida en ${field}`)
  }
  return date
}

export function parseDueOn(dueOn: string) {
  const parsed = civilDateSchema.safeParse(dueOn)
  if (!parsed.success) throw new AppError('Fecha inválida en due_on. Usa YYYY-MM-DD')
  return parsed.data
}

/** Una tarea diaria vence hoy según el calendario de quien la crea, no del servidor. */
export function resolveDueDate(kind: string, dueDate: unknown, today: string) {
  if (kind === 'daily') return today
  if (!dueDate) throw new AppError('Elige hasta cuándo tienes para el proyecto')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate as string)) {
    throw new AppError('Fecha inválida en due_date. Usa YYYY-MM-DD')
  }
  return dueDate as string
}

export function parseNeedsHelp(body: Record<string, unknown>) {
  return Boolean(body.needs_help ?? body.needsHelp)
}
