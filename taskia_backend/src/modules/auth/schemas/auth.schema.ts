import { z } from 'zod'
import { AppError } from '../../../shared/errors/app-error.js'

function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object') return body as Record<string, unknown>
  return {}
}

const loginSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export function parseLoginBody(body: unknown) {
  const record = asRecord(body)
  const parsed = loginSchema.safeParse({
    username: String(record.username ?? ''),
    password: String(record.password ?? ''),
  })
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
  }
  return parsed.data
}

const profileSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value.includes('@') && value.length >= 5, 'Correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
})

export function parseProfileBody(
  body: unknown,
  current: { username: string; email: string },
) {
  const record = asRecord(body)
  const username =
    record.username === undefined ? current.username : String(record.username)
  const email = record.email === undefined ? current.email : String(record.email)
  const password =
    record.password === undefined || record.password === ''
      ? undefined
      : String(record.password)
  const parsed = profileSchema.safeParse({ username, email, password })
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
  }
  return parsed.data
}

export function readAvatarBody(body: unknown) {
  const record = asRecord(body)
  return {
    kind: String(record.avatar_kind ?? 'preset'),
    imageBase64: String(record.image_base64 ?? ''),
    mimeType: typeof record.mime_type === 'string' ? record.mime_type : undefined,
    presetId: String(record.avatar_preset_id ?? 'rocket'),
    frameId:
      record.frame_id === undefined ? undefined : String(record.frame_id ?? 'none'),
  }
}
