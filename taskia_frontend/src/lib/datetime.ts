/**
 * El API manda instantes en ISO 8601 UTC y días civiles como YYYY-MM-DD.
 * Aquí se convierten a la zona de quien abre la web; el servidor no la decide.
 *
 * Para pintar en UI: formatWhen (instante) y formatDay / formatDayShort (día civil).
 * No formatear fechas del API con toLocale* ni .slice a mano fuera de este módulo.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const LOCALE = 'es'

/** Instante del API. Un texto sin zona se asume UTC, como lo guarda la base. */
export function parseInstant(value: string | null | undefined): Date | null {
  if (!value) return null
  const text = value.trim()
  if (!text) return null
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)
  const date = new Date(hasZone ? text : `${text.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Día civil local (YYYY-MM-DD). Un YYYY-MM-DD ya es civil y no se toca. */
export function civilDayISO(value: string | null | undefined): string | null {
  if (!value) return null
  const text = value.trim()
  if (DATE_ONLY.test(text)) return text
  const date = parseInstant(text)
  if (!date) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Mediodía local: formatear un día civil no puede correrlo de fecha. */
export function civilDayAsDate(value: string): Date | null {
  const day = civilDayISO(value)
  if (!day) return null
  const date = new Date(`${day}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function viewerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** Instante → texto local (día + hora). Vacío o inválido → "—". */
export function formatWhen(value: string | null | undefined): string {
  const date = parseInstant(value)
  if (!date) return '—'
  return date.toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Día civil o instante → fecha local legible. Vacío → "—". */
export function formatDay(value: string | null | undefined): string {
  if (!value) return '—'
  const date = civilDayAsDate(value)
  if (!date) return value.slice(0, 10)
  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Eje de gráficas / chips: día + mes corto, sin año. */
export function formatDayShort(value: string | null | undefined): string {
  if (!value) return '—'
  const date = civilDayAsDate(value)
  if (!date) return value.slice(5)
  return date.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
  })
}

/** Días enteros desde un instante hasta ahora (zona local del reloj). */
export function daysSince(value: string | null | undefined): number | null {
  const date = parseInstant(value)
  if (!date) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
}
