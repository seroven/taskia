import { IsNull, Not } from 'typeorm'
import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import { Role, TroopMember, User } from '../../../infrastructure/database/entities/index.js'

function users() {
  return AppDataSource.getRepository(User)
}

async function withRole(user: User | null) {
  if (!user) return null
  const role = await AppDataSource.getRepository(Role).findOne({
    where: { id: user.roleId },
  })
  if (!role) return null
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password_hash: user.passwordHash,
    is_active: user.isActive,
    xp_total: user.xpTotal,
    level: user.level,
    avatar_kind: user.avatarKind,
    avatar_preset_id: user.avatarPresetId,
    avatar_file: user.avatarFile,
    frame_id: user.frameId,
    role: role.code,
  }
}

export async function findLoginByUsername(username: string) {
  const user = await users().findOne({ where: { username } })
  return withRole(user)
}

export async function findSessionById(userId: number) {
  const user = await users().findOne({ where: { id: userId } })
  return withRole(user)
}

export async function findAuthById(userId: number) {
  return findSessionById(userId)
}

export async function findActiveTroopRole(userId: number) {
  const member = await AppDataSource.getRepository(TroopMember).findOne({
    where: { userId, leftAt: IsNull() },
  })
  const role = member?.role
  if (role === 'captain' || role === 'copilot' || role === 'member') return role
  return null
}

export async function updateAvatar(input: {
  userId: number
  avatarKind: 'preset' | 'upload'
  presetId: string | null
  fileName: string | null
  frameId?: string
}) {
  const patch: Partial<User> = {
    avatarKind: input.avatarKind,
    avatarPresetId: input.presetId,
    avatarFile: input.fileName,
  }
  if (input.frameId !== undefined) patch.frameId = input.frameId
  await users().update({ id: input.userId }, patch)
}

export async function findUserIdByUsername(username: string, exceptUserId: number) {
  return users().findOne({
    where: { username, id: Not(exceptUserId) },
    select: { id: true },
  })
}

export async function findUserIdByEmail(email: string, exceptUserId: number) {
  return users().findOne({
    where: { email, id: Not(exceptUserId) },
    select: { id: true },
  })
}

export async function updateProfile(input: {
  userId: number
  username: string
  email: string
  passwordHash?: string
}) {
  const patch: Partial<User> = {
    username: input.username,
    email: input.email,
  }
  if (input.passwordHash) patch.passwordHash = input.passwordHash
  await users().update({ id: input.userId }, patch)
}

export async function findAvatarRow(userId: number) {
  const user = await users().findOne({ where: { id: userId } })
  if (!user) return null
  return {
    xp_total: user.xpTotal,
    avatar_kind: user.avatarKind,
    avatar_preset_id: user.avatarPresetId,
    avatar_file: user.avatarFile,
    frame_id: user.frameId,
  }
}
