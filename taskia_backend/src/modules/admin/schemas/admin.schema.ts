import { z } from 'zod'
import { AppError } from '../../../shared/errors/app-error.js'

export function parseAccount(username: string, password?: string, email?: string) {
  const name = username.trim()
  const parsedName = z.string().min(3, 'El usuario debe tener al menos 3 caracteres').safeParse(name)
  if (!parsedName.success) throw new AppError('El usuario debe tener al menos 3 caracteres')
  if (password !== undefined) {
    const parsedPassword = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').safeParse(password)
    if (!parsedPassword.success) throw new AppError('La contraseña debe tener al menos 6 caracteres')
  }
  if (email !== undefined) {
    const trimmed = email.trim()
    const parsedEmail = z.string().min(5).includes('@', { message: 'Correo inválido' }).safeParse(trimmed)
    if (!parsedEmail.success || !trimmed.includes('@')) throw new AppError('Correo inválido')
  }
  return name
}

export function parseIds(raw: unknown): number[] {
  const list = z.array(z.unknown()).safeParse(Array.isArray(raw) ? raw : [])
  if (!list.success) return []
  return list.data.map(Number).filter((id) => Number.isFinite(id) && id > 0)
}

export function parseNewAccount(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>
  const username = String(body.username ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  if (!username && !email && !password) return null
  parseAccount(username, password, email)
  return { username, email, password }
}

export function parseCourseName(raw: unknown) {
  const name = String(raw ?? '').trim()
  const parsed = z.string().min(1, 'Ponle un nombre a la materia').max(120, 'El nombre es demasiado largo').safeParse(name)
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? 'Ponle un nombre a la materia')
  }
  return parsed.data
}

export function parseIsoDate(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

export function parseStudentId(value: unknown): number | null {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}
