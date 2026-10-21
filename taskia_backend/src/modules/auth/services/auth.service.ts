import bcrypt from 'bcryptjs'
import { AppError } from '../../../shared/errors/app-error.js'
import { progressFromXpTotal } from '../../../services/xp.js'
import type { PublicUser, UserRole } from '../../../utils/helpers.js'
import { frameUnlocked, isFrameId, resolveUserAvatar, sanitizeAvatarConfig } from '../lib/avatar-config.js'
import * as users from '../repositories/user.repository.js'

function avatarFields(row: { avatar_config?: unknown; frame_id?: unknown }, userId: number) {
  return {
    avatar_config: resolveUserAvatar(row.avatar_config, userId),
    frame_id: (row.frame_id as string | null) ?? 'none',
  }
}

function toPublicUser(
  id: number,
  row: {
    username: string
    email: string
    xp_total: number
    avatar_config: unknown
    frame_id: string | null
  },
  role: UserRole,
): PublicUser {
  const progress = progressFromXpTotal(Number(row.xp_total ?? 0))
  return {
    id,
    username: row.username as string,
    email: row.email as string,
    role,
    ...progress,
    ...avatarFields(row, id),
  }
}

export async function login(username: string, password: string): Promise<PublicUser> {
  const row = await users.findLoginByUsername(username)
  if (!row) throw new AppError('Usuario o contraseña incorrectos')

  const valid = await bcrypt.compare(password, row.password_hash as string)
  if (!valid) throw new AppError('Usuario o contraseña incorrectos')
  if (Number(row.is_active) === 0) {
    throw new AppError('Tu cuenta está pausada. Pídele ayuda a un adulto.')
  }

  return toPublicUser(Number(row.id), row, row.role as UserRole)
}

export async function currentUser(userId: number): Promise<PublicUser> {
  const row = await users.findSessionById(userId)
  if (!row) throw new AppError('Debes iniciar sesión', 401)
  return toPublicUser(userId, row, row.role as UserRole)
}

/**
 * Guarda el avatar y, si se pide, el marco. El marco debe existir y estar desbloqueado por el nivel del usuario.
 */
export async function updateAvatar(
  current: PublicUser,
  input: { avatarConfig: unknown; frameId?: string },
): Promise<PublicUser> {
  if (input.avatarConfig == null || typeof input.avatarConfig !== 'object') {
    throw new AppError('Arma tu avatar para guardarlo')
  }
  const avatarConfig = sanitizeAvatarConfig(input.avatarConfig, `user-${current.id}`)

  const frameId = input.frameId
  if (frameId !== undefined) {
    if (!isFrameId(frameId)) throw new AppError('Marco no válido')
    if (!frameUnlocked(frameId, current.level)) throw new AppError('Ese marco aún no está desbloqueado')
  }

  await users.updateAvatar({ userId: current.id, avatarConfig, frameId })
  return currentUser(current.id)
}

export async function updateProfile(
  current: PublicUser,
  input: { username: string; email: string; password?: string },
): Promise<PublicUser> {
  const takenUser = await users.findUserIdByUsername(input.username, current.id)
  if (takenUser) throw new AppError('Ese nombre de usuario ya existe')

  const takenEmail = await users.findUserIdByEmail(input.email, current.id)
  if (takenEmail) throw new AppError('Ese correo ya está registrado')

  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined
  await users.updateProfile({
    userId: current.id,
    username: input.username,
    email: input.email,
    passwordHash,
  })

  const row = await users.findAvatarRow(current.id)
  const progress = progressFromXpTotal(Number(row?.xp_total ?? 0))
  return {
    id: current.id,
    username: input.username,
    email: input.email,
    role: current.role,
    ...progress,
    ...avatarFields(row ?? {}, current.id),
  }
}
