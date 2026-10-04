import { z } from 'zod'
import { AppError } from '../../../shared/errors/app-error.js'

export function parseGuardianChatMessage(body: Record<string, unknown>) {
  const message = String(body.message ?? '').trim()
  const parsed = z
    .string()
    .min(1, 'Escribe un mensaje')
    .max(4000, 'El mensaje es demasiado largo')
    .safeParse(message)
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? 'Escribe un mensaje')
  }
  return parsed.data
}
