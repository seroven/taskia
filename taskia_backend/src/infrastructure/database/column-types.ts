import type { ValueTransformer } from 'typeorm'

/** BIGINT de Postgres llega como string. La API de Taskia usa número. */
export const bigintTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value ?? null,
  from: (value: string | number | null) => (value == null ? value : Number(value)),
}

/**
 * DATE civil (due_date, summary_date, week_start).
 * Se guarda y se lee como YYYY-MM-DD, sin pasar por Date de JS.
 */
export const civilDateTransformer: ValueTransformer = {
  to: (value: string | null | undefined) => value ?? null,
  from: (value: string | Date | null) => {
    if (value == null) return value
    if (value instanceof Date) {
      const y = value.getUTCFullYear()
      const m = String(value.getUTCMonth() + 1).padStart(2, '0')
      const d = String(value.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    return String(value).slice(0, 10)
  },
}
