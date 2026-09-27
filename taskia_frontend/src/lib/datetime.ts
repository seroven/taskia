/**
 * El API manda instantes en ISO 8601 UTC y días civiles como YYYY-MM-DD.
 * Aquí se convierten a la zona de quien abre la web; el servidor no la decide.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

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
