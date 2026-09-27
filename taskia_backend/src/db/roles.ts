import type { RowDataPacket } from './pool.js'
import { pool } from './pool.js'
import { AppError, type UserRole } from '../utils/helpers.js'

const CACHE = new Map<UserRole, number>()

export async function roleIdByCode(code: UserRole): Promise<number> {
  const hit = CACHE.get(code)
  if (hit != null) return hit
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM roles WHERE code = ? LIMIT 1',
    [code],
  )
  const id = rows[0]?.id != null ? Number(rows[0].id) : NaN
  if (!Number.isFinite(id)) {
    throw new AppError(`Rol no configurado: ${code}`, 500)
  }
  CACHE.set(code, id)
  return id
}

/** Filtro SQL: la fila de users (alias) es un Explorador / Guardián / Admin. */
export function roleCodeEquals(userAlias: string, code: UserRole) {
  return `EXISTS (SELECT 1 FROM roles _r WHERE _r.id = ${userAlias}.role_id AND _r.code = '${code}')`
}
