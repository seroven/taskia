import { z } from 'zod'
import { AppError } from '../../../shared/errors/app-error.js'

const MAX_VOICE_SECONDS = 90

export function parseTranscribeBody(body: Record<string, unknown>) {
  const audioBase64 = String(body.audio_base64 ?? '').trim()
  const mimeType = String(body.mime_type ?? 'audio/webm').trim()
  const durationRaw = Number(body.duration_seconds)
  const durationSeconds = Number.isFinite(durationRaw) ? durationRaw : undefined
  const parsed = z
    .object({
      audioBase64: z.string().min(1, 'Falta el audio'),
      durationSeconds: z.number().max(MAX_VOICE_SECONDS, 'El audio supera el máximo de 90 segundos').optional(),
    })
    .safeParse({ audioBase64, durationSeconds })
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? 'Falta el audio')
  }
  return {
    audioBase64: parsed.data.audioBase64,
    mimeType,
    durationSeconds: parsed.data.durationSeconds,
  }
}

export function parseSpeakBody(body: Record<string, unknown>) {
  const text = String(body.text ?? '').trim()
  const parsed = z.string().min(1, 'No hay texto para leer').max(1600).safeParse(text)
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? 'No hay texto para leer')
  return { text: parsed.data }
}

const PHOTO_ONLY = 'Mira la foto de mi ejercicio.'

export function parseChatMessage(body: Record<string, unknown>) {
  const message = String(body.user_message ?? body.userMessage ?? '').trim()
  const photoRaw = String(body.photo_base64 ?? body.photoBase64 ?? '').trim()
  if (!message && !photoRaw) throw new AppError('Escribe un mensaje o manda una foto')
  const parsed = z.string().min(1).safeParse(message || PHOTO_ONLY)
  if (!parsed.success) throw new AppError('Escribe un mensaje o manda una foto')
  return { message: parsed.data, photoRaw }
}
