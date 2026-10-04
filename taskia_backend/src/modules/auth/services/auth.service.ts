import bcrypt from 'bcryptjs'
import { saveAvatarUpload } from '../../../infrastructure/storage/local-file-storage.js'
import { AppError } from '../../../shared/errors/app-error.js'
import { progressFromXpTotal } from '../../../services/xp.js'
import type { PublicUser, UserRole } from '../../../utils/helpers.js'
import {
  frameAllowedForRole,
  isAvatarPreset,
  isFrameId,
} from '../lib/avatars.js'
import * as users from '../repositories/user.repository.js'

function avatarFields(row: {
  avatar_kind?: unknown
  avatar_preset_id?: unknown
  avatar_file?: unknown
  frame_id?: unknown
}) {
  return {
    avatar_kind: (row.avatar_kind as 'preset' | 'upload' | undefined) ?? 'preset',
    avatar_preset_id: (row.avatar_preset_id as string | null) ?? 'rocket',
    avatar_file: (row.avatar_file as string | null) ?? null,
    frame_id: (row.frame_id as string | null) ?? 'none',
  }
}

function toPublicUser(
  id: number,
  row: {
    username: string
    email: string
    xp_total: number
    avatar_kind: string
    avatar_preset_id: string | null
    avatar_file: string | null
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
    ...avatarFields(row),
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

export async function updateAvatar(
  current: PublicUser,
  input: {
    kind: string
    imageBase64: string
    mimeType?: string
    presetId: string
    frameId?: string
  },
): Promise<PublicUser> {
  let avatarKind: 'preset' | 'upload' = 'preset'
  let presetId: string | null = null
  let fileName: string | null = null

  if (input.kind === 'upload') {
    avatarKind = 'upload'
    fileName = saveAvatarUpload(current.id, input.imageBase64, input.mimeType)
  } else {
    if (!isAvatarPreset(input.presetId)) throw new AppError('Avatar no válido')
    presetId = input.presetId
  }

  let frameId = input.frameId
  if (frameId !== undefined) {
    if (!isFrameId(frameId)) throw new AppError('Marco no válido')
    const troopRole = await users.findActiveTroopRole(current.id)
    if (!frameAllowedForRole(frameId, troopRole)) {
      throw new AppError('Ese marco aún no está desbloqueado')
    }
  }

  await users.updateAvatar({
    userId: current.id,
    avatarKind,
    presetId,
    fileName,
    frameId,
  })

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
    ...avatarFields(row ?? {}),
  }
}
