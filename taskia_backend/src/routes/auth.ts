import { Router } from 'express'
import bcrypt from 'bcryptjs'
import type { RowDataPacket } from '../db/pool.js'
import { pool } from '../db/pool.js'
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken,
} from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { AppError, type PublicUser, type UserRole } from '../utils/helpers.js'
import { progressFromXpTotal } from '../services/xp.js'
import {
  frameAllowedForRole,
  isAvatarPreset,
  isFrameId,
} from '../lib/avatars.js'
import { saveAvatarUpload } from '../services/files.js'

const router = Router()

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

function validateCredentials(username: string, password: string, email?: string) {
  const u = username.trim()
  if (u.length < 3) throw new AppError('El usuario debe tener al menos 3 caracteres')
  if (password.length < 6) throw new AppError('La contraseña debe tener al menos 6 caracteres')
  if (email !== undefined) {
    const e = email.trim()
    if (!e.includes('@') || e.length < 5) throw new AppError('Correo inválido')
  }
}

router.post(
  '/register',
  asyncHandler(async () => {
    throw new AppError('Las cuentas las crea un adulto. Pídele que te registre.', 403)
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const username = String(req.body.username ?? '')
    const password = String(req.body.password ?? '')
    validateCredentials(username, password)

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.email, u.password_hash, u.is_active, u.xp_total,
              u.avatar_kind, u.avatar_preset_id, u.avatar_file, u.frame_id,
              r.code AS role
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.username = ? LIMIT 1`,
      [username.trim()],
    )
    const row = rows[0]
    if (!row) throw new AppError('Usuario o contraseña incorrectos')

    const valid = await bcrypt.compare(password, row.password_hash as string)
    if (!valid) throw new AppError('Usuario o contraseña incorrectos')
    if (Number(row.is_active) === 0) {
      throw new AppError('Tu cuenta está pausada. Pídele ayuda a un adulto.')
    }

    const progress = progressFromXpTotal(Number(row.xp_total ?? 0))
    const user: PublicUser = {
      id: Number(row.id),
      username: row.username as string,
      email: row.email as string,
      role: row.role as UserRole,
      ...progress,
      ...avatarFields(row),
    }
    setAuthCookie(res, signToken(user))
    res.json(user)
  }),
)

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearAuthCookie(res)
    res.json({ ok: true })
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = req.user!
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.username, u.email, u.xp_total, r.code AS role,
              u.avatar_kind, u.avatar_preset_id, u.avatar_file, u.frame_id
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? LIMIT 1`,
      [current.id],
    )
    const row = rows[0]
    if (!row) throw new AppError('Debes iniciar sesión', 401)
    const progress = progressFromXpTotal(Number(row.xp_total ?? 0))
    res.json({
      id: current.id,
      username: row.username as string,
      email: row.email as string,
      role: row.role as UserRole,
      ...progress,
      ...avatarFields(row),
    } satisfies PublicUser)
  }),
)

router.patch(
  '/me/avatar',
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = req.user!
    const kind = String(req.body.avatar_kind ?? 'preset')
    let avatarKind: 'preset' | 'upload' = 'preset'
    let presetId: string | null = null
    let fileName: string | null = null

    if (kind === 'upload') {
      avatarKind = 'upload'
      const raw = String(req.body.image_base64 ?? '')
      fileName = saveAvatarUpload(current.id, raw, req.body.mime_type)
    } else {
      const preset = String(req.body.avatar_preset_id ?? 'rocket')
      if (!isAvatarPreset(preset)) throw new AppError('Avatar no válido')
      presetId = preset
    }

    let frameId =
      req.body.frame_id === undefined
        ? undefined
        : String(req.body.frame_id ?? 'none')
    if (frameId !== undefined) {
      if (!isFrameId(frameId)) throw new AppError('Marco no válido')
      const [mem] = await pool.query<RowDataPacket[]>(
        `SELECT role FROM troop_members
         WHERE user_id = ? AND left_at IS NULL LIMIT 1`,
        [current.id],
      )
      const troopRole =
        (mem[0]?.role as 'captain' | 'copilot' | 'member' | undefined) ?? null
      if (!frameAllowedForRole(frameId, troopRole)) {
        throw new AppError('Ese marco aún no está desbloqueado')
      }
    }

    if (frameId !== undefined) {
      await pool.query(
        `UPDATE users
         SET avatar_kind = ?, avatar_preset_id = ?, avatar_file = ?, frame_id = ?
         WHERE id = ?`,
        [avatarKind, presetId, fileName, frameId, current.id],
      )
    } else {
      await pool.query(
        `UPDATE users
         SET avatar_kind = ?, avatar_preset_id = ?, avatar_file = ?
         WHERE id = ?`,
        [avatarKind, presetId, fileName, current.id],
      )
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.username, u.email, u.xp_total, r.code AS role,
              u.avatar_kind, u.avatar_preset_id, u.avatar_file, u.frame_id
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? LIMIT 1`,
      [current.id],
    )
    const row = rows[0]!
    const progress = progressFromXpTotal(Number(row.xp_total ?? 0))
    res.json({
      id: current.id,
      username: row.username as string,
      email: row.email as string,
      role: row.role as UserRole,
      ...progress,
      ...avatarFields(row),
    } satisfies PublicUser)
  }),
)

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = req.user!
    const username =
      req.body.username === undefined
        ? current.username
        : String(req.body.username)
    const email =
      req.body.email === undefined ? current.email : String(req.body.email)
    const password =
      req.body.password === undefined || req.body.password === ''
        ? undefined
        : String(req.body.password)

    const u = username.trim()
    const e = email.trim().toLowerCase()
    if (u.length < 3) {
      throw new AppError('El usuario debe tener al menos 3 caracteres')
    }
    if (!e.includes('@') || e.length < 5) throw new AppError('Correo inválido')
    if (password !== undefined && password.length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres')
    }

    const [existingUser] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1',
      [u, current.id],
    )
    if (existingUser.length > 0) {
      throw new AppError('Ese nombre de usuario ya existe')
    }

    const [existingEmail] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
      [e, current.id],
    )
    if (existingEmail.length > 0) {
      throw new AppError('Ese correo ya está registrado')
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      await pool.query(
        `UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?`,
        [u, e, passwordHash, current.id],
      )
    } else {
      await pool.query(`UPDATE users SET username = ?, email = ? WHERE id = ?`, [
        u,
        e,
        current.id,
      ])
    }

    const [xpRows] = await pool.query<RowDataPacket[]>(
      `SELECT xp_total, avatar_kind, avatar_preset_id, avatar_file, frame_id
       FROM users WHERE id = ? LIMIT 1`,
      [current.id],
    )
    const progress = progressFromXpTotal(Number(xpRows[0]?.xp_total ?? 0))
    const user: PublicUser = {
      id: current.id,
      username: u,
      email: e,
      role: current.role,
      ...progress,
      ...avatarFields(xpRows[0] ?? {}),
    }
    res.json(user)
  }),
)

export default router
