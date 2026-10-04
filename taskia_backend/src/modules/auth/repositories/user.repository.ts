import type { RowDataPacket } from '../../../infrastructure/database/pool.js'
import { pool } from '../../../infrastructure/database/pool.js'

export async function findLoginByUsername(username: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.username, u.email, u.password_hash, u.is_active, u.xp_total,
            u.avatar_kind, u.avatar_preset_id, u.avatar_file, u.frame_id,
            r.code AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.username = ? LIMIT 1`,
    [username],
  )
  return rows[0] ?? null
}

export async function findSessionById(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.username, u.email, u.xp_total, r.code AS role,
            u.avatar_kind, u.avatar_preset_id, u.avatar_file, u.frame_id
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? LIMIT 1`,
    [userId],
  )
  return rows[0] ?? null
}

export async function findActiveTroopRole(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT role FROM troop_members
     WHERE user_id = ? AND left_at IS NULL LIMIT 1`,
    [userId],
  )
  return (rows[0]?.role as 'captain' | 'copilot' | 'member' | undefined) ?? null
}

export async function updateAvatar(input: {
  userId: number
  avatarKind: 'preset' | 'upload'
  presetId: string | null
  fileName: string | null
  frameId?: string
}) {
  if (input.frameId !== undefined) {
    await pool.query(
      `UPDATE users
       SET avatar_kind = ?, avatar_preset_id = ?, avatar_file = ?, frame_id = ?
       WHERE id = ?`,
      [input.avatarKind, input.presetId, input.fileName, input.frameId, input.userId],
    )
    return
  }
  await pool.query(
    `UPDATE users
     SET avatar_kind = ?, avatar_preset_id = ?, avatar_file = ?
     WHERE id = ?`,
    [input.avatarKind, input.presetId, input.fileName, input.userId],
  )
}

export async function findUserIdByUsername(username: string, exceptUserId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1',
    [username, exceptUserId],
  )
  return rows[0] ?? null
}

export async function findUserIdByEmail(email: string, exceptUserId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
    [email, exceptUserId],
  )
  return rows[0] ?? null
}

export async function updateProfile(input: {
  userId: number
  username: string
  email: string
  passwordHash?: string
}) {
  if (input.passwordHash) {
    await pool.query(
      `UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?`,
      [input.username, input.email, input.passwordHash, input.userId],
    )
    return
  }
  await pool.query(`UPDATE users SET username = ?, email = ? WHERE id = ?`, [
    input.username,
    input.email,
    input.userId,
  ])
}

export async function findAvatarRow(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT xp_total, avatar_kind, avatar_preset_id, avatar_file, frame_id
     FROM users WHERE id = ? LIMIT 1`,
    [userId],
  )
  return rows[0] ?? null
}
