import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { pool } from '../db/pool.js'
import type { RowDataPacket } from '../db/pool.js'
import { AppError, type JwtPayload, type PublicUser, type UserRole } from '../utils/helpers.js'
import { progressFromXpTotal } from '../services/xp.js'

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser
    }
  }
}

const VALID_ROLES: UserRole[] = ['user', 'admin', 'parent']

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (VALID_ROLES as string[]).includes(value)
}

export function signToken(user: PublicUser): string {
  const payload: JwtPayload = { sub: user.id, role: user.role }
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  })
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(env.cookie.name, token, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  })
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(env.cookie.name, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/',
  })
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[env.cookie.name] as string | undefined
    if (!token) throw new AppError('Debes iniciar sesión', 401)

    let decoded: string | jwt.JwtPayload
    try {
      decoded = jwt.verify(token, env.jwt.secret)
    } catch {
      throw new AppError('Sesión inválida o expirada', 401)
    }
    if (
      typeof decoded === 'string' ||
      typeof decoded.sub !== 'number' ||
      !isUserRole(decoded.role)
    ) {
      throw new AppError('Sesión inválida o expirada', 401)
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.email, u.is_active, u.level, u.xp_total,
              u.avatar_kind, u.avatar_preset_id, u.avatar_file, u.frame_id,
              r.code AS role
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? LIMIT 1`,
      [decoded.sub],
    )

    const user = rows[0]
    if (!user) throw new AppError('Debes iniciar sesión', 401)
    if (Number(user.is_active) === 0) {
      throw new AppError('Tu cuenta está pausada. Pídele ayuda a un adulto.', 403)
    }

    const role = user.role as string
    if (!isUserRole(role)) throw new AppError('Sesión inválida o expirada', 401)

    const progress = progressFromXpTotal(Number(user.xp_total ?? 0))
    req.user = {
      id: Number(user.id),
      username: user.username as string,
      email: user.email as string,
      role,
      ...progress,
      avatar_kind: (user.avatar_kind as 'preset' | 'upload') ?? 'preset',
      avatar_preset_id: (user.avatar_preset_id as string) ?? 'explorer_01',
      avatar_file: (user.avatar_file as string | null) ?? null,
      frame_id: (user.frame_id as string) ?? 'none',
    }
    next()
  } catch (err) {
    next(err)
  }
}

export function requireStudent(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new AppError('Debes iniciar sesión', 401))
    return
  }
  if (req.user.role !== 'user') {
    next(new AppError('Esta zona es solo para exploradores', 403))
    return
  }
  next()
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new AppError('Debes iniciar sesión', 401))
    return
  }
  if (req.user.role !== 'admin') {
    next(new AppError('Solo el administrador puede entrar aquí', 403))
    return
  }
  next()
}

export function requireParent(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new AppError('Debes iniciar sesión', 401))
    return
  }
  if (req.user.role !== 'parent') {
    next(new AppError('Solo el guardián puede entrar aquí', 403))
    return
  }
  next()
}

export async function assertParentLinked(parentId: number, studentId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 AS ok
     FROM parent_student_links
     WHERE parent_id = ? AND student_id = ? AND is_active = 1
     LIMIT 1`,
    [parentId, studentId],
  )
  if (!rows[0]) {
    throw new AppError('Ese explorador no está vinculado a tu cuenta', 403)
  }
}
