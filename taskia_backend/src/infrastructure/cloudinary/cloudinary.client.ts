import { createHash } from 'node:crypto'
import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'

const MAX_BYTES = 4 * 1024 * 1024
const FOLDER = 'taskia/study'

const DATA_URL = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/

export interface StudyPhoto {
  base64: string
  mime: string
  buffer: Buffer
}

/** Acepta un data URL o base64 pelado. No guarda el archivo: solo lo deja listo para subir. */
export function decodeStudyPhoto(raw: string): StudyPhoto | null {
  const text = raw.trim()
  if (!text) return null
  const match = DATA_URL.exec(text)
  let mime = 'image/jpeg'
  let base64 = text
  if (match) {
    mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1]
    base64 = match[2]
  }
  base64 = base64.replace(/\s/g, '')
  if (!base64) return null
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length < 32) throw new AppError('No pude leer esa foto. Prueba con otra.')
  if (buffer.length > MAX_BYTES) {
    throw new AppError('La foto es demasiado grande. Prueba con una más chica.')
  }
  return { base64, mime, buffer }
}

/**
 * Subida firmada al Upload API.
 * https://cloudinary.com/documentation/image_upload_api_reference
 * La firma es SHA-1 de los parámetros ordenados (sin file, api_key ni cloud_name) más el API secret.
 */
export async function uploadStudyPhoto(photo: StudyPhoto): Promise<string> {
  const { cloudName, apiKey, apiSecret } = env.cloudinary
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError('Falta configurar Cloudinary para guardar la foto.')
  }
  const timestamp = Math.floor(Date.now() / 1000)
  const toSign = `folder=${FOLDER}&timestamp=${timestamp}${apiSecret}`
  const signature = createHash('sha1').update(toSign).digest('hex')

  const body = new FormData()
  body.append('file', new Blob([new Uint8Array(photo.buffer)], { type: photo.mime }), 'exercise.jpg')
  body.append('api_key', apiKey)
  body.append('timestamp', String(timestamp))
  body.append('signature', signature)
  body.append('folder', FOLDER)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body,
  })
  const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } }
  const url = payload.secure_url?.trim() ?? ''
  if (!response.ok || !url) {
    throw new AppError(payload.error?.message || 'No pude guardar la foto. Intenta de nuevo.')
  }
  return url
}
