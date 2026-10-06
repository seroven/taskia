import { z } from 'zod'
import { AppError } from '../../../shared/errors/app-error.js'

function optionalText(raw: unknown) {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export function parseWorldBody(body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim()
  const parsed = z.string().min(1, 'El título del mundo es obligatorio').safeParse(title)
  if (!parsed.success) throw new AppError('El título del mundo es obligatorio')
  return { title: parsed.data, description: optionalText(body.description) }
}

export function parseMissionBody(body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim()
  const parsed = z.string().min(1, 'El título de la misión es obligatorio').safeParse(title)
  if (!parsed.success) throw new AppError('El título de la misión es obligatorio')
  return {
    title: parsed.data,
    description: optionalText(body.description),
    usesBoard: Boolean(body.uses_board),
  }
}

const PHOTO_ONLY = 'Mira la foto de mi ejercicio.'

export function parseMissionChat(body: Record<string, unknown>) {
  const message = String(body.user_message ?? '').trim()
  const photoRaw = String(body.photo_base64 ?? body.photoBase64 ?? '').trim()
  if (!message && !photoRaw) throw new AppError('Escribe un mensaje o manda una foto')
  const parsed = z.string().min(1).safeParse(message || PHOTO_ONLY)
  if (!parsed.success) throw new AppError('Escribe un mensaje o manda una foto')
  return {
    message: parsed.data,
    photoRaw,
    allowAiDraw: Boolean(body.allow_ai_draw),
    fromVoice: Boolean(body.from_voice),
    boardDescription: typeof body.board_description === 'string' ? body.board_description : null,
    boardImageRaw: String(body.board_image_base64 ?? body.boardImageBase64 ?? '').trim(),
  }
}

export function parseChallengeStart(body: Record<string, unknown>) {
  const scope = String(body.scope ?? '').trim()
  const difficulty = String(body.difficulty ?? '').trim()
  if (!['mission', 'course', 'world'].includes(scope)) {
    throw new AppError('Alcance no válido')
  }
  if (!['warm', 'quest', 'boss'].includes(difficulty)) {
    throw new AppError('Dificultad no válida')
  }
  const parsed = z
    .object({
      scope: z.enum(['mission', 'course', 'world']),
      difficulty: z.enum(['warm', 'quest', 'boss']),
    })
    .safeParse({ scope, difficulty })
  if (!parsed.success) throw new AppError('Alcance no válido')
  return {
    worldId: Number(body.world_id),
    scope: parsed.data.scope,
    difficulty: parsed.data.difficulty,
    missionId: body.mission_id != null ? Number(body.mission_id) : null,
    courseId: body.course_id != null ? Number(body.course_id) : null,
    discardInProgress: Boolean(body.discard_in_progress ?? body.discardInProgress),
  }
}

export function parseMissionIds(body: Record<string, unknown>) {
  const raw = body.mission_ids
  const ids = z.array(z.unknown()).safeParse(Array.isArray(raw) ? raw : [])
  if (!ids.success) return []
  return ids.data.map(Number).filter(Number.isFinite)
}

export function parseChallengeAnswers(body: Record<string, unknown>) {
  const parsed = z
    .array(z.unknown())
    .min(1, 'Faltan las respuestas del desafío')
    .safeParse(Array.isArray(body.answers) ? body.answers : [])
  if (!parsed.success) throw new AppError('Faltan las respuestas del desafío')
  return parsed.data
}
