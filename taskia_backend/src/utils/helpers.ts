export type UserRole = 'user' | 'admin' | 'parent'

/** Segundos: si el Explorador tarda más, cuenta como pausa, no pensamiento. */
export const REPLY_PAUSE_SECONDS = 30 * 60

export interface PublicUser {
  id: number
  username: string
  email: string
  role: UserRole
  level: number
  xp_total: number
  xp_into_level: number
  xp_to_next: number
}

export interface JwtPayload {
  sub: number
  role: UserRole
}

export class AppError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
    this.name = 'AppError'
  }
}

/**
 * Instante en ISO 8601 UTC ("2026-09-11T02:26:59.000Z").
 * El navegador lo formatea en la zona de quien mira; el servidor nunca
 * decide la zona. Un texto sin zona se asume UTC, como lo guarda la base.
 */
export function toInstantISO(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  const text = String(value).trim()
  if (!text) return null
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)
  const parsed = new Date(hasZone ? text : `${text.replace(' ', 'T')}Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

/**
 * Día civil de una columna `date` (due_date): YYYY-MM-DD, sin zona.
 * No es un instante, así que no se convierte a ninguna zona.
 */
export function formatCivilDate(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

export function truncateChars(value: string, max: number): string {
  const chars = [...value]
  if (chars.length <= max) return value
  return chars.slice(0, Math.max(0, max - 1)).join('') + '…'
}

export function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed
  const match = trimmed.match(/[\{\[][\s\S]*[\}\]]/)
  if (!match) throw new AppError('La IA no devolvió JSON válido')
  return match[0]
}

/** El tutor está ofreciendo más práctica en vez de cerrar dominio. */
export function looksLikeOfferingMorePractice(text: string): boolean {
  const t = text.toLowerCase()
  return /otro tipo|otra clase de|más ejercicio|otro ejercicio|te gustaría practicar|quieres practicar|practicamos otro|quieres otro|otro formato|más práctica|otra forma de/.test(
    t,
  )
}

/** Celebra que el niño ya puede pasar la tarea a Listo (aunque passed quede false). */
export function looksLikeCelebratingTaskReady(text: string): boolean {
  const t = text.toLowerCase()
  return (
    /mover\s+(esta\s+)?(tarea\s+)?a\s+listo/.test(t) ||
    /ya puedes\s+(mover|marcar)/.test(t) ||
    /márcala?\s+(como\s+)?listo|marcala?\s+(como\s+)?listo/.test(t) ||
    /pásala\s+a\s+listo|pasala\s+a\s+listo/.test(t) ||
    /tarea\s+(ya\s+)?(está|esta)\s+lista/.test(t)
  )
}

/** Celebra dominio de misión aunque passed quede false. */
export function looksLikeCelebratingMissionMastered(text: string): boolean {
  const t = text.toLowerCase()
  return (
    /ya\s+dominaste|dominaste\s+(el\s+)?tema/.test(t) ||
    /misión\s+(ya\s+)?dominada|mision\s+(ya\s+)?dominada/.test(t) ||
    /ya\s+sabes\s+(bien\s+)?(este\s+)?tema/.test(t) ||
    /tema\s+dominado|quedó\s+dominad|quedo\s+dominad/.test(t)
  )
}

/**
 * Quita frases que digan al niño que ya puede cerrar (Listo / dominio)
 * cuando el servidor forzó study_eval.passed=false.
 */
export function stripPrematureReadyCelebration(text: string): string {
  let out = text
  out = out.replace(
    /[.!?¡¿]*\s*[^.!?]*(?:ya puedes|puedes ya)\s+(?:mover|marcar)[^.!?]*[.!?¡]*/gi,
    ' ',
  )
  out = out.replace(
    /[.!?¡¿]*\s*[^.!?]*mover\s+(?:esta\s+)?(?:tarea\s+)?a\s+listo[^.!?]*[.!?¡]*/gi,
    ' ',
  )
  out = out.replace(
    /[.!?¡¿]*\s*[^.!?]*pásala\s+a\s+listo[^.!?]*[.!?¡]*/gi,
    ' ',
  )
  out = out.replace(
    /[.!?¡¿]*\s*[^.!?]*pasala\s+a\s+listo[^.!?]*[.!?¡]*/gi,
    ' ',
  )
  out = out.replace(
    /[.!?¡¿]*\s*[^.!?]*(?:ya\s+)?dominaste[^.!?]*[.!?¡]*/gi,
    ' ',
  )
  out = out.replace(
    /[.!?¡¿]*\s*[^.!?]*misi[oó]n\s+(?:ya\s+)?dominada[^.!?]*[.!?¡]*/gi,
    ' ',
  )
  out = out.replace(
    /[.!?¡¿]*\s*[^.!?]*tema\s+dominado[^.!?]*[.!?¡]*/gi,
    ' ',
  )
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+([.!?])/g, '$1').trim()
  return out
}

/** Contador "Solo bien: N/2" del context_summary (pizarra). */
export function soloBienCount(summary: string): number | null {
  const m = summary.match(/solo bien:\s*(\d+)\s*\/\s*2/i)
  return m ? Number(m[1]) : null
}

/** Errores anotados en context_summary ("Errores: N"). */
export function trackedErrorCount(summary: string): number {
  const m = summary.match(/errores:\s*(\d+)/i)
  if (!m) return 0
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function requiredChatTurns(base: number, summary: string): number {
  return base + trackedErrorCount(summary)
}

/** Misión teórica: el tutor pregunta si queda más contenido del tema. */
export function looksLikeAskingMoreTopicContent(text: string): boolean {
  const t = text.toLowerCase()
  const mentionsMore =
    /más contenido|mas contenido|más de este tema|mas de este tema|otra parte del tema|otro contenido|algo más de este|algo mas de este|falta por estudiar|se nos quedó|se nos quedo|necesitamos estudiar|queda algo/.test(
      t,
    )
  const looksQuestion =
    /[¿?]/.test(t) ||
    /te gustaría|quieres (estudiar|ver|repasar)|dime si|cuéntame si|cuentame si/.test(
      t,
    )
  return mentionsMore && looksQuestion
}
