import { callGemini, type LlmUsageContext } from '../../infrastructure/gemini/gemini.client.js'
import { extractJson } from '../../utils/helpers.js'
import { stripMathDelimiters } from './text.js'

export const GRAPHIC_DECLINE =
  'Ese ejercicio lleva un dibujo y yo no puedo armarlo. Si me mandas la foto de uno parecido, te ayudo con gusto.'

const GRAPHIC_SYSTEM = `Miras un ejercicio de primaria. Responde SOLO JSON {"graphic":true|false}.
graphic=true solo si hace falta una figura, gráfica, diagrama, tabla o dibujo para entender el ejercicio.
graphic=false si basta con el enunciado escrito o con números.`

const SHORT_REQUEST =
  /^(s[ií]|ok|dale|ya|listo|otro|un ejercicio|dame un ejercicio|hazme un ejercicio|otro ejercicio|uno similar|parecido)[.!?\s]*$/i

export type ExerciseTurn =
  | { mode: 'none' }
  | { mode: 'need_reference' }
  | { mode: 'text' }
  | { mode: 'decline' }

/** Fotos que subió el explorador. Una ficha generada no es la referencia. */
export function userReferencePhotos(
  messages: Array<{ role: string; image_url?: string | null }>,
): Array<string | null | undefined> {
  return messages.filter((item) => item.role === 'user').map((item) => item.image_url)
}

/** Textos que sí son un ejercicio de referencia. Omite pedidos cortos de “otro”. */
export function exerciseReference(parts: string[]): string {
  const kept = parts
    .map((part) => part.trim())
    .filter((part) => part.length >= 12 && !SHORT_REQUEST.test(part))
  return kept.join('\n').slice(-2000)
}

export function parseGraphicFlag(raw: string): boolean {
  try {
    const parsed = JSON.parse(extractJson(raw)) as { graphic?: unknown }
    return parsed.graphic === true
  } catch {
    return false
  }
}

export async function loadReferencePhoto(
  current: string | null,
  imageUrls: Array<string | null | undefined>,
): Promise<string | null> {
  if (current?.trim()) return current
  const url = [...imageUrls].reverse().find((item) => typeof item === 'string' && item.startsWith('https://'))
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 32 || buf.length > 4 * 1024 * 1024) return null
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0]?.trim() || 'image/jpeg'
    if (!mime.startsWith('image/')) return null
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export async function needsGraphic(opts: {
  text: string
  photoBase64: string | null
  usage: LlmUsageContext
}): Promise<boolean> {
  try {
    const raw = await callGemini({
      system: GRAPHIC_SYSTEM,
      user: JSON.stringify({
        ejercicio: opts.text.slice(0, 2000),
        hay_foto: Boolean(opts.photoBase64),
      }),
      photoBase64: opts.photoBase64,
      short: true,
      usage: opts.usage,
    })
    return parseGraphicFlag(raw)
  } catch {
    return false
  }
}

/** Si pidió un ejercicio: texto en el chat, o un no amable cuando hace falta figura. */
export async function planExerciseTurn(opts: {
  draw: boolean
  referenceText: string
  photoBase64: string | null
  usage: LlmUsageContext
}): Promise<ExerciseTurn> {
  if (!opts.draw) return { mode: 'none' }
  const text = opts.referenceText.trim()
  if (!text && !opts.photoBase64) return { mode: 'need_reference' }
  const graphic = await needsGraphic({
    text,
    photoBase64: opts.photoBase64,
    usage: opts.usage,
  })
  return graphic ? { mode: 'decline' } : { mode: 'text' }
}

export function exerciseTurnInstruction(turn: ExerciseTurn): string {
  if (turn.mode === 'need_reference') {
    return ' Pide un ejercicio de ejemplo, escrito o en foto. No inventes uno.'
  }
  if (turn.mode === 'decline') {
    return ` No armes ese ejercicio. En speak_to_child escribe exactamente: ${GRAPHIC_DECLINE}`
  }
  if (turn.mode === 'text') {
    return ' Escribe el ejercicio nuevo en speak_to_child, con otros números si el ejemplo ya los trae, y sin la respuesta. No digas que lo dibujaste.'
  }
  return ''
}

export function speakForTurn(turn: ExerciseTurn, speak: string): string {
  if (turn.mode === 'decline') return GRAPHIC_DECLINE
  return stripMathDelimiters(speak)
}
