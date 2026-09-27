import type { IncomingHttpHeaders } from 'node:http'
import { AppError } from '../utils/helpers.js'

const TZ_RE = /^[A-Za-z_][A-Za-z0-9_+\-\/]{0,63}$/
const OFFSET_RE = /^[+-]\d{2}:\d{2}$/
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export function offsetMinutesToPg(minutes: number): string {
  const sign = minutes > 0 ? '-' : '+'
  const abs = Math.abs(Math.trunc(minutes))
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = String(abs % 60).padStart(2, '0')
  return `${sign}${h}:${m}`
}

function isIanaTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function parseViewerTz(input: {
  query?: { tz?: unknown; tz_offset?: unknown }
  headers?: IncomingHttpHeaders
}): string {
  const header = String(input.headers?.['x-timezone'] ?? '').trim()
  const query = String(input.query?.tz ?? '').trim()
  const tz = header || query
  if (tz && OFFSET_RE.test(tz)) return tz
  if (tz && TZ_RE.test(tz) && isIanaTimeZone(tz)) return tz

  const offsetRaw = input.headers?.['x-timezone-offset'] ?? input.query?.tz_offset
  const offset = Number(offsetRaw)
  if (Number.isFinite(offset)) return offsetMinutesToPg(offset)

  throw new AppError('Falta la zona horaria del visor')
}

export function todayInTimeZone(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function civilDayFromInstant(value: Date, tz: string): string {
  if (OFFSET_RE.test(tz)) return civilDayFromOffset(value, tz)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

/** Día civil YYYY-MM-DD. Si llega un instante, se convierte con la zona del visor. */
export function civilDayKey(value: unknown, tz: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return civilDayFromInstant(value, tz)
  }
  const text = String(value ?? '').trim()
  if (DATE_ONLY_RE.test(text)) return text
  if (!text) return ''
  const normalized = text.includes('T') ? text : text.replace(' ', 'T')
  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime()) && /[T:\sZ]/.test(text)) {
    return civilDayFromInstant(parsed, tz)
  }
  return DATE_ONLY_RE.test(text.slice(0, 10)) ? text.slice(0, 10) : ''
}

/** Día civil de un timestamptz (o de due_date) en la zona del visor. Texto YYYY-MM-DD. */
export function civilDateSql(sqlCol: string, tz: string): string {
  if (/(?:^|\.)due_date$/i.test(sqlCol.trim())) {
    return `to_char((${sqlCol})::date, 'YYYY-MM-DD')`
  }
  if (OFFSET_RE.test(tz)) {
    return `to_char((${sqlCol}) AT TIME ZONE INTERVAL '${tz}', 'YYYY-MM-DD')`
  }
  return `to_char((${sqlCol}) AT TIME ZONE '${tz}', 'YYYY-MM-DD')`
}

export function andCivilDate(
  sqlCol: string,
  from: string | null,
  to: string | null,
  params: unknown[],
  tz: string,
) {
  const expr = civilDateSql(sqlCol, tz)
  let sql = ''
  if (from) {
    sql += ` AND ${expr} >= ?`
    params.push(from)
  }
  if (to) {
    sql += ` AND ${expr} <= ?`
    params.push(to)
  }
  return sql
}

export function viewerDates(input: {
  query?: { tz?: unknown; tz_offset?: unknown }
  headers?: IncomingHttpHeaders
}) {
  const tz = parseViewerTz(input)
  const day = (col: string) => civilDateSql(col, tz)
  const andDate = (
    sqlCol: string,
    from: string | null,
    to: string | null,
    params: unknown[],
  ) => andCivilDate(sqlCol, from, to, params, tz)
  const today = OFFSET_RE.test(tz) ? todayFromOffset(tz) : todayInTimeZone(tz)
  return { tz, day, andDate, today }
}

function todayFromOffset(pgOffset: string) {
  return civilDayFromOffset(new Date(), pgOffset)
}

function civilDayFromOffset(instant: Date, pgOffset: string) {
  const sign = pgOffset.startsWith('-') ? -1 : 1
  const [h, m] = pgOffset.slice(1).split(':').map(Number)
  const ms = instant.getTime() + sign * ((h || 0) * 60 + (m || 0)) * 60_000
  return new Date(ms).toISOString().slice(0, 10)
}
