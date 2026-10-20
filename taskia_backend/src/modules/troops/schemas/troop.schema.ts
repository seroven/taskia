import { z } from 'zod'
import { AppError } from '../../../shared/errors/app-error.js'

function normalizeTroopName(raw: string) {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim()
}

const troopNameSchema = z
  .string()
  .min(3, 'Elige un nombre de 3 a 80 caracteres con al menos una letra o número')
  .max(80, 'Elige un nombre de 3 a 80 caracteres con al menos una letra o número')
  .regex(/[\p{L}\p{N}]/u, 'Elige un nombre de 3 a 80 caracteres con al menos una letra o número')

export function parseTroopName(raw: unknown) {
  const name = normalizeTroopName(String(raw ?? ''))
  const parsed = troopNameSchema.safeParse(name)
  if (!parsed.success) {
    throw new AppError(
      'Elige un nombre de 3 a 80 caracteres con al menos una letra o número',
    )
  }
  return parsed.data
}

export function parseExplorerSearch(raw: unknown) {
  const q = String(raw ?? '').trim()
  const parsed = z
    .string()
    .min(2, 'Escribe al menos 2 letras para buscar')
    .safeParse(q)
  if (!parsed.success) throw new AppError('Escribe al menos 2 letras para buscar')
  return parsed.data
}

export function parseShipPrompt(raw: unknown) {
  const prompt = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim()
  const parsed = z
    .string()
    .min(3, 'Cuéntame la nave en 3 a 200 caracteres')
    .max(200, 'Cuéntame la nave en 3 a 200 caracteres')
    .safeParse(prompt)
  if (!parsed.success) throw new AppError('Cuéntame la nave en 3 a 200 caracteres')
  return parsed.data
}
